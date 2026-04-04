const crypto = require("crypto");
const { promisify } = require("util");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const pool = require("../db");

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

async function main() {
  const [, , usernameArg, passwordArg, fullNameArg] = process.argv;

  const username = usernameArg || process.env.ADMIN_SEED_USERNAME || process.env.ADMIN_USERNAME;
  const password = passwordArg || process.env.ADMIN_SEED_PASSWORD || process.env.ADMIN_PASSWORD;
  const fullName = fullNameArg || process.env.ADMIN_SEED_FULL_NAME || "Restaurant Admin";

  if (!username || !password) {
    console.error("Usage: node scripts/create-admin-user.js <username> <password> [full name]");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const result = await pool.query(
    `INSERT INTO admin_users (username, password_hash, full_name, role, is_active)
     VALUES ($1, $2, $3, 'admin', TRUE)
     ON CONFLICT (username)
     DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name,
       role = 'admin',
       is_active = TRUE,
       updated_at = NOW()
     RETURNING id, username, full_name, role, is_active`,
    [username, passwordHash, fullName]
  );

  console.log(JSON.stringify(result.rows[0], null, 2));
  await pool.end();
}

main().catch(async (error) => {
  console.error(error.message);
  await pool.end();
  process.exit(1);
});
