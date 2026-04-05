const crypto = require("crypto");
const { promisify } = require("util");
const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./db");

const scrypt = promisify(crypto.scrypt);

const app = express();
const ROOT_DIR = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 3000);
const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 8;
const COMPLETED_ORDER_RETENTION_SECONDS = 30;
const COMPLETED_ORDER_CLEANUP_INTERVAL_MS = 5 * 1000;
const VALID_ORDER_STATUSES = ["Pending", "Preparing", "Ready", "Completed"];
const VALID_USER_ROLES = ["admin", "staff", "chef"];
const VALID_MENU_CATEGORIES = ["food", "drink", "dessert", "main-course", "grill", "noodles", "soup", "snack", "tea", "coffee", "juice"];
const ORDER_ID_PATTERN = /^ORD-\d{6}$/;
const RATE_LIMITS = {
  adminLogin: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 12,
    minIntervalMs: 1000,
    message: "Too many login attempts. Please wait a moment and try again.",
  },
  orderCreate: {
    windowMs: 10 * 60 * 1000,
    maxRequests: 15,
    minIntervalMs: 2000,
    message: "Too many order submissions. Please wait a moment before trying again.",
  },
  orderLookup: {
    windowMs: 5 * 60 * 1000,
    maxRequests: 60,
    minIntervalMs: 250,
    message: "Too many order lookups. Please slow down and try again shortly.",
  },
};
const DEFAULT_MENU_ITEMS = [
  {
    name: "Fried Rice",
    category: "food",
    price: 25000,
    image: "Assets/images/Fried-Rice.jpg",
    isAvailable: true,
  },
  {
    name: "Chicken Satay",
    category: "grill",
    price: 30000,
    image: "Assets/images/Satay.jpg",
    isAvailable: true,
  },
  {
    name: "Seafood Noodles",
    category: "noodles",
    price: 29000,
    image: "Assets/images/Fried-Rice.jpg",
    isAvailable: true,
  },
  {
    name: "Grilled Gourami",
    category: "grill",
    price: 48000,
    image: "Assets/images/Grilled Gourami.png",
    isAvailable: true,
  },
  {
    name: "Chicken Soup",
    category: "soup",
    price: 22000,
    image: "Assets/images/Fried-Rice.jpg",
    isAvailable: true,
  },
  {
    name: "Fried Tofu",
    category: "snack",
    price: 17000,
    image: "Assets/images/Fried Tofu.jpg",
    isAvailable: true,
  },
  {
    name: "Iced Tea",
    category: "tea",
    price: 10000,
    image: "Assets/images/Iced-Tea.jpg",
    isAvailable: true,
  },
  {
    name: "Lemon Tea",
    category: "tea",
    price: 12000,
    image: "Assets/images/Iced-Tea.jpg",
    isAvailable: true,
  },
  {
    name: "Iced Americano",
    category: "coffee",
    price: 18000,
    image: "Assets/images/Iced-Tea.jpg",
    isAvailable: true,
  },
  {
    name: "Avocado Juice",
    category: "juice",
    price: 19000,
    image: "Assets/images/Avocado Juice.jpg",
    isAvailable: true,
  },
  {
    name: "Lychee Cooler",
    category: "juice",
    price: 17000,
    image: "Assets/images/Iced-Tea.jpg",
    isAvailable: true,
  },
  {
    name: "Chocolate Cake",
    category: "dessert",
    price: 20000,
    image: "Assets/images/cake.jpg",
    isAvailable: true,
  },
  {
    name: "Chocolate Pudding",
    category: "dessert",
    price: 18000,
    image: "Assets/images/Chocolate Pudding.jpg",
    isAvailable: true,
  },
  {
    name: "Vanilla Pudding",
    category: "dessert",
    price: 18000,
    image: "Assets/images/Vanilla Pudding.jpg",
    isAvailable: true,
  },
];
const ROLE_PERMISSIONS = {
  admin: {
    manageUsers: true,
    updateOrderStatus: true,
    updateMenuPrice: true,
    manageMenuCatalog: true,
  },
  staff: {
    manageUsers: false,
    updateOrderStatus: true,
    updateMenuPrice: false,
    manageMenuCatalog: false,
  },
  chef: {
    manageUsers: false,
    updateOrderStatus: true,
    updateMenuPrice: true,
    manageMenuCatalog: true,
  },
};
let databaseInitializationPromise = null;
let lastMaintenanceRunAt = 0;
const rateLimitState = new Map();

app.set("trust proxy", true);
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((cookies, part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) {
      return cookies;
    }

    cookies[rawKey] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});
}

function normalizeOrderStatus(status) {
  return VALID_ORDER_STATUSES.includes(status) ? status : "Pending";
}

function normalizeUserRole(role) {
  return VALID_USER_ROLES.includes(role) ? role : "staff";
}

function normalizeMenuCategory(category) {
  const normalized = String(category || "").trim().toLowerCase();
  return VALID_MENU_CATEGORIES.includes(normalized) ? normalized : null;
}

function serializeOrder(row) {
  if (!row) {
    return row;
  }

  let items = row.items;
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch (error) {
      console.error("Failed to parse order items:", error);
    }
  }

  return {
    ...row,
    items: Array.isArray(items) ? items : [],
    status: normalizeOrderStatus(row.status),
    completedAt: row.completed_at || row.completedAt || null,
    requiresStaffFollowup: Boolean(row.requires_staff_followup ?? row.requiresStaffFollowup),
  };
}

function serializeMenuItem(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    image: row.image,
    isAvailable: row.is_available,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializeAdminUser(row) {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role: normalizeUserRole(row.role),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

function hasPermission(role, permission) {
  return Boolean(ROLE_PERMISSIONS[normalizeUserRole(role)]?.[permission]);
}

function getClientIdentifier(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
}

function buildRateLimitKey(scope, req) {
  if (scope === "orderCreate") {
    const tableNumber = String(req.body?.tableNumber || "").trim().toLowerCase() || "no-table";
    return `${scope}:${getClientIdentifier(req)}:${tableNumber}`;
  }

  return `${scope}:${getClientIdentifier(req)}`;
}

function createRateLimiter(scope) {
  const config = RATE_LIMITS[scope];

  return (req, res, next) => {
    const key = buildRateLimitKey(scope, req);
    const now = Date.now();
    const entry = rateLimitState.get(key) || { timestamps: [], lastRequestAt: 0 };
    entry.timestamps = entry.timestamps.filter((timestamp) => now - timestamp <= config.windowMs);

    if (config.minIntervalMs && now - entry.lastRequestAt < config.minIntervalMs) {
      rateLimitState.set(key, entry);
      return res.status(429).json({ message: config.message });
    }

    if (entry.timestamps.length >= config.maxRequests) {
      rateLimitState.set(key, entry);
      return res.status(429).json({ message: config.message });
    }

    entry.timestamps.push(now);
    entry.lastRequestAt = now;
    rateLimitState.set(key, entry);
    next();
  };
}

function isValidMenuImageReference(value) {
  const image = String(value || "").trim();
  return Boolean(image) && /^(https?:\/\/|Assets\/images\/)/i.test(image);
}

function sanitizeOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { items: [], totalQuantity: 0, totalPrice: 0 };
  }

  const sanitizedItems = [];
  let totalQuantity = 0;
  let totalPrice = 0;

  for (const item of items) {
    const name = String(item?.name || "").trim();
    const price = Number(item?.price);
    const quantity = Number(item?.quantity);

    if (!name || !Number.isInteger(price) || price < 0 || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      return { items: [], totalQuantity: 0, totalPrice: 0 };
    }

    const total = price * quantity;
    totalQuantity += quantity;
    totalPrice += total;

    sanitizedItems.push({
      name,
      price,
      quantity,
      total,
    });
  }

  return { items: sanitizedItems, totalQuantity, totalPrice };
}

async function countActiveAdmins(excludingUserId = null) {
  const values = ["admin"];
  let query = `
    SELECT COUNT(*)::int AS count
    FROM admin_users
    WHERE role = $1 AND is_active = TRUE
  `;

  if (excludingUserId) {
    values.push(excludingUserId);
    query += " AND id <> $2";
  }

  const result = await pool.query(query, values);
  return result.rows[0]?.count || 0;
}

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [algorithm, salt, hash] = String(storedHash || "").split(":");
  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const derivedKey = await scrypt(password, salt, 64);
  const storedBuffer = Buffer.from(hash, "hex");

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, derivedKey);
}

function setAdminSessionCookie(res, sessionId) {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieParts = [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(sessionId)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}`,
  ];

  if (isProduction) {
    cookieParts.push("Secure");
  }

  res.setHeader("Set-Cookie", cookieParts.join("; "));
}

function clearAdminSessionCookie(res) {
  res.setHeader("Set-Cookie", `${ADMIN_SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

async function getSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies[ADMIN_SESSION_COOKIE];

  if (!sessionToken) {
    return null;
  }

  const sessionTokenHash = hashSessionToken(sessionToken);
  const result = await pool.query(
    `SELECT
        admin_sessions.id,
        admin_sessions.admin_user_id,
        admin_sessions.expires_at,
        admin_users.username,
        admin_users.full_name,
        admin_users.role,
        admin_users.is_active
      FROM admin_sessions
      JOIN admin_users ON admin_users.id = admin_sessions.admin_user_id
      WHERE admin_sessions.session_token = $1`,
    [sessionTokenHash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const session = result.rows[0];
  const expiresAt = new Date(session.expires_at).getTime();

  if (Number.isNaN(expiresAt) || expiresAt < Date.now() || !session.is_active) {
    await pool.query("DELETE FROM admin_sessions WHERE id = $1", [session.id]);
    return null;
  }

  await pool.query(
    "UPDATE admin_sessions SET last_seen_at = NOW() WHERE id = $1",
    [session.id]
  );

  return session;
}

async function requireAdminAuth(req, res, next) {
  const session = await getSessionFromRequest(req);

  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  req.adminSession = {
    ...session,
    role: normalizeUserRole(session.role),
  };
  next();
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.adminSession || !hasPermission(req.adminSession.role, permission)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}

async function findOrderById(orderId) {
  const result = await pool.query(
    "SELECT * FROM orders WHERE order_id = $1",
    [orderId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return serializeOrder(result.rows[0]);
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT NOT NULL DEFAULT 'staff',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMP WITHOUT TIME ZONE
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id BIGSERIAL PRIMARY KEY,
      admin_user_id BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      session_token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(admin_user_id);
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

    CREATE TABLE IF NOT EXISTS order_status_history (
      id BIGSERIAL PRIMARY KEY,
      order_id TEXT NOT NULL,
      previous_status TEXT,
      next_status TEXT NOT NULL,
      changed_by_admin_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
      changed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      note TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);

    CREATE TABLE IF NOT EXISTS menu_items (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      price INTEGER NOT NULL CHECK (price >= 0),
      image TEXT NOT NULL,
      is_available BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITHOUT TIME ZONE;

    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS requires_staff_followup BOOLEAN NOT NULL DEFAULT FALSE;

    CREATE INDEX IF NOT EXISTS idx_orders_completed_at ON orders(completed_at);
  `);

  const existingMenuItemsResult = await pool.query("SELECT name FROM menu_items");
  const existingMenuNames = new Set(existingMenuItemsResult.rows.map((row) => row.name));

  for (const item of DEFAULT_MENU_ITEMS) {
    if (existingMenuNames.has(item.name)) {
      continue;
    }

    await pool.query(
      `INSERT INTO menu_items (name, category, price, image, is_available)
       VALUES ($1, $2, $3, $4, $5)`,
      [item.name, item.category, item.price, item.image, item.isAvailable]
    );
  }
}

function ensureDatabaseInitialized() {
  if (!databaseInitializationPromise) {
    databaseInitializationPromise = initializeDatabase();
  }

  return databaseInitializationPromise;
}

async function purgeCompletedOrders() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const expiredOrdersResult = await client.query(
      `SELECT order_id
       FROM orders
       WHERE status = 'Completed'
         AND completed_at IS NOT NULL
         AND completed_at <= NOW() - ($1 * INTERVAL '1 second')`,
      [COMPLETED_ORDER_RETENTION_SECONDS]
    );

    const expiredOrderIds = expiredOrdersResult.rows.map((row) => row.order_id);

    if (expiredOrderIds.length > 0) {
      await client.query(
        "DELETE FROM order_status_history WHERE order_id = ANY($1::text[])",
        [expiredOrderIds]
      );
      await client.query(
        "DELETE FROM orders WHERE order_id = ANY($1::text[])",
        [expiredOrderIds]
      );
    }

    await client.query("COMMIT");

    if (expiredOrderIds.length > 0) {
      console.log(`Purged ${expiredOrderIds.length} completed order(s) after ${COMPLETED_ORDER_RETENTION_SECONDS} seconds.`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to purge completed orders:", error);
  } finally {
    client.release();
  }
}

async function runMaintenanceIfNeeded() {
  const now = Date.now();

  if (now - lastMaintenanceRunAt < COMPLETED_ORDER_CLEANUP_INTERVAL_MS) {
    return;
  }

  lastMaintenanceRunAt = now;
  await purgeCompletedOrders();
}

app.use(async (req, res, next) => {
  try {
    await ensureDatabaseInitialized();
    await runMaintenanceIfNeeded();
    next();
  } catch (error) {
    console.error("Failed to initialize request context:", error);
    res.status(500).json({ message: "Server initialization failed." });
  }
});
app.use(express.static(ROOT_DIR));

app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "index.html"));
});

app.get("/admin-login", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "admin-login.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "admin.html"));
});

app.get("/menu", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM menu_items
       WHERE is_available = TRUE
       ORDER BY category ASC, name ASC`
    );

    res.json(result.rows.map(serializeMenuItem));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load menu." });
  }
});

app.post("/admin/login", createRateLimiter("adminLogin"), (req, res) => {
  (async () => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required.",
      });
    }

    const result = await pool.query(
      `SELECT id, username, full_name, role, is_active, password_hash
       FROM admin_users
       WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid username or password.",
      });
    }

    const adminUser = result.rows[0];
    const isValidPassword = await verifyPassword(password, adminUser.password_hash);

    if (!adminUser.is_active || !isValidPassword) {
      return res.status(401).json({
        message: "Invalid username or password.",
      });
    }

    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await pool.query(
      `INSERT INTO admin_sessions (admin_user_id, session_token, expires_at)
       VALUES ($1, $2, $3)`,
      [adminUser.id, hashSessionToken(sessionToken), expiresAt]
    );

    await pool.query(
      `UPDATE admin_users
       SET last_login_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [adminUser.id]
    );

    setAdminSessionCookie(res, sessionToken);
    res.json({
      authenticated: true,
      username: adminUser.username,
      fullName: adminUser.full_name,
      role: normalizeUserRole(adminUser.role),
      user: serializeAdminUser(adminUser),
      permissions: ROLE_PERMISSIONS[normalizeUserRole(adminUser.role)],
    });
  })().catch((error) => {
    console.error(error);
    res.status(500).json({ message: "Failed to log in." });
  });
});

app.post("/admin/logout", (req, res) => {
  (async () => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies[ADMIN_SESSION_COOKIE];

    if (sessionToken) {
      await pool.query(
        "DELETE FROM admin_sessions WHERE session_token = $1",
        [hashSessionToken(sessionToken)]
      );
    }

    clearAdminSessionCookie(res);
    res.json({ success: true });
  })().catch((error) => {
    console.error(error);
    clearAdminSessionCookie(res);
    res.status(500).json({ message: "Failed to log out." });
  });
});

app.get("/admin/session", (req, res) => {
  (async () => {
    const session = await getSessionFromRequest(req);

    if (!session) {
      return res.status(401).json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      username: session.username,
      fullName: session.full_name,
      role: normalizeUserRole(session.role),
      user: {
        id: session.admin_user_id,
        username: session.username,
        fullName: session.full_name,
        role: normalizeUserRole(session.role),
      },
      permissions: ROLE_PERMISSIONS[normalizeUserRole(session.role)],
    });
  })().catch((error) => {
    console.error(error);
    res.status(500).json({ authenticated: false, message: "Failed to read session." });
  });
});

app.get("/admin/setup-status", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT COUNT(*)::int AS count FROM admin_users WHERE is_active = TRUE"
    );

    const count = result.rows[0]?.count || 0;
    res.json({
      hasAdminUsers: count > 0,
      activeAdminCount: count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to read admin setup status." });
  }
});

app.get("/admin/users", requireAdminAuth, requirePermission("manageUsers"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, full_name, role, is_active, created_at, updated_at, last_login_at
       FROM admin_users
       ORDER BY created_at DESC, username ASC`
    );

    res.json(result.rows.map(serializeAdminUser));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch users." });
  }
});

app.post("/admin/users", requireAdminAuth, requirePermission("manageUsers"), async (req, res) => {
  try {
    const { username, password, fullName, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO admin_users (username, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, username, full_name, role, is_active, created_at, updated_at, last_login_at`,
      [username.trim(), passwordHash, fullName || null, normalizeUserRole(role)]
    );

    res.status(201).json(serializeAdminUser(result.rows[0]));
  } catch (error) {
    console.error(error);
    if (String(error.message).includes("duplicate key")) {
      return res.status(409).json({ message: "That username is already in use." });
    }

    res.status(500).json({ message: "Failed to create user." });
  }
});

app.patch("/admin/users/:id", requireAdminAuth, requirePermission("manageUsers"), async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const nextRole = normalizeUserRole(req.body.role);

    if (!Number.isInteger(targetUserId) || targetUserId < 1) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    if (!req.body.role) {
      return res.status(400).json({ message: "Role is required." });
    }

    const existingUserResult = await pool.query(
      `SELECT id, username, role, is_active
       FROM admin_users
       WHERE id = $1`,
      [targetUserId]
    );

    if (existingUserResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const existingUser = existingUserResult.rows[0];

    if (existingUser.id === req.adminSession.admin_user_id) {
      return res.status(403).json({ message: "You cannot change your own role." });
    }

    if (normalizeUserRole(existingUser.role) === "admin" && nextRole !== "admin") {
      const otherActiveAdmins = await countActiveAdmins(existingUser.id);
      if (otherActiveAdmins === 0) {
        return res.status(400).json({ message: "You cannot change the last active admin to a different role." });
      }
    }

    const result = await pool.query(
      `UPDATE admin_users
       SET role = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, username, full_name, role, is_active, created_at, updated_at, last_login_at`,
      [nextRole, targetUserId]
    );

    res.json(serializeAdminUser(result.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update user role." });
  }
});

app.delete("/admin/users/:id", requireAdminAuth, requirePermission("manageUsers"), async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);

    if (!Number.isInteger(targetUserId) || targetUserId < 1) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    if (targetUserId === req.adminSession.admin_user_id) {
      return res.status(403).json({ message: "You cannot remove your own account." });
    }

    const existingUserResult = await pool.query(
      `SELECT id, role, is_active
       FROM admin_users
       WHERE id = $1`,
      [targetUserId]
    );

    if (existingUserResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const existingUser = existingUserResult.rows[0];

    if (normalizeUserRole(existingUser.role) === "admin" && existingUser.is_active) {
      const otherActiveAdmins = await countActiveAdmins(existingUser.id);
      if (otherActiveAdmins === 0) {
        return res.status(400).json({ message: "You cannot remove the last active admin." });
      }
    }

    await pool.query("DELETE FROM admin_users WHERE id = $1", [targetUserId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to remove user." });
  }
});

app.get("/admin/menu", requireAdminAuth, requirePermission("manageMenuCatalog"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM menu_items
       ORDER BY is_available DESC, category ASC, name ASC`
    );

    res.json(result.rows.map(serializeMenuItem));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch menu." });
  }
});

app.post("/admin/menu", requireAdminAuth, requirePermission("manageMenuCatalog"), async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const category = normalizeMenuCategory(req.body.category);
    const image = String(req.body.image || "").trim();
    const price = Number(req.body.price);

    if (!name || !category || !isValidMenuImageReference(image) || !Number.isInteger(price) || price < 0) {
      return res.status(400).json({
        message: "Name, valid category, image path or URL, and a non-negative integer price are required.",
      });
    }

    const result = await pool.query(
      `INSERT INTO menu_items (name, category, price, image, is_available, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW())
       RETURNING *`,
      [name, category, price, image]
    );

    res.status(201).json(serializeMenuItem(result.rows[0]));
  } catch (error) {
    console.error(error);
    if (String(error.message).includes("duplicate key")) {
      return res.status(409).json({ message: "A menu item with that name already exists." });
    }

    res.status(500).json({ message: "Failed to create menu item." });
  }
});

app.patch("/admin/menu/:id/price", requireAdminAuth, requirePermission("manageMenuCatalog"), async (req, res) => {
  try {
    const price = Number(req.body.price);

    if (!Number.isInteger(price) || price < 0) {
      return res.status(400).json({ message: "Price must be a non-negative integer." });
    }

    const result = await pool.query(
      `UPDATE menu_items
       SET price = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [price, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Menu item not found." });
    }

    res.json(serializeMenuItem(result.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update price." });
  }
});

app.patch("/admin/menu/:id/availability", requireAdminAuth, requirePermission("manageMenuCatalog"), async (req, res) => {
  try {
    const isAvailable = Boolean(req.body.isAvailable);
    const result = await pool.query(
      `UPDATE menu_items
       SET is_available = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [isAvailable, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Menu item not found." });
    }

    res.json(serializeMenuItem(result.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update menu availability." });
  }
});

app.get("/admin/orders", requireAdminAuth, requirePermission("updateOrderStatus"), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM orders ORDER BY created_at DESC NULLS LAST, order_id DESC"
    );

    res.json(result.rows.map(serializeOrder));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
});

app.patch("/admin/orders/:id/status", requireAdminAuth, requirePermission("updateOrderStatus"), async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  if (!VALID_ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid order status." });
  }

  try {
    const existingOrder = await findOrderById(orderId);

    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    const result = await pool.query(
      `UPDATE orders
       SET status = $1,
           completed_at = CASE
             WHEN $1 = 'Completed' THEN NOW()
             ELSE NULL
           END
       WHERE order_id = $2
       RETURNING *`,
      [status, orderId]
    );

    await pool.query(
      `INSERT INTO order_status_history (order_id, previous_status, next_status, changed_by_admin_id)
       VALUES ($1, $2, $3, $4)`,
      [orderId, existingOrder.status, status, req.adminSession.admin_user_id]
    );

    res.json(serializeOrder(result.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update order status." });
  }
});

app.get("/admin/orders/:id/history", requireAdminAuth, requirePermission("updateOrderStatus"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          order_status_history.id,
          order_status_history.order_id,
          order_status_history.previous_status,
          order_status_history.next_status,
          order_status_history.changed_at,
          order_status_history.note,
          admin_users.username,
          admin_users.full_name
       FROM order_status_history
       LEFT JOIN admin_users ON admin_users.id = order_status_history.changed_by_admin_id
       WHERE order_status_history.order_id = $1
       ORDER BY order_status_history.changed_at DESC, order_status_history.id DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch order history." });
  }
});

app.post("/orders", createRateLimiter("orderCreate"), async (req, res) => {
  try {
    const { orderId, tableNumber, items, createdAt } = req.body;
    const normalizedTableNumber = String(tableNumber || "").trim();
    const sanitizedOrder = sanitizeOrderItems(items);

    if (!ORDER_ID_PATTERN.test(String(orderId || ""))) {
      return res.status(400).json({ message: "Invalid order id." });
    }

    if (!normalizedTableNumber || normalizedTableNumber.length > 50) {
      return res.status(400).json({ message: "A valid table number is required." });
    }

    if (sanitizedOrder.items.length === 0) {
      return res.status(400).json({ message: "Please submit at least one valid menu item." });
    }

    if (sanitizedOrder.totalQuantity > 100) {
      return res.status(400).json({ message: "Order quantity is too large. Please split it with staff assistance." });
    }

    const requiresStaffFollowup = sanitizedOrder.items.some((item) => item.quantity > 20) || sanitizedOrder.totalQuantity > 30;

    const result = await pool.query(
      `INSERT INTO orders (order_id, table_number, items, total_price, status, created_at, requires_staff_followup)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()), $7)
       RETURNING *`,
      [orderId, normalizedTableNumber, JSON.stringify(sanitizedOrder.items), sanitizedOrder.totalPrice, "Pending", createdAt, requiresStaffFollowup]
    );

    res.status(201).json(serializeOrder(result.rows[0]));
  } catch (error) {
    console.error(error);
    if (String(error.message).includes("duplicate key")) {
      return res.status(409).json({ message: "That order id already exists. Please try again." });
    }

    res.status(500).json({ message: "Failed to create order." });
  }
});

app.get("/orders/:id", createRateLimiter("orderLookup"), async (req, res) => {
  try {
    const requestedOrderId = String(req.params.id || "").trim();

    if (!ORDER_ID_PATTERN.test(requestedOrderId)) {
      return res.status(400).json({ message: "Invalid order id." });
    }

    const order = await findOrderById(requestedOrderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch order." });
  }
});

if (require.main === module) {
  ensureDatabaseInitialized()
    .then(() => {
      purgeCompletedOrders().catch((error) => {
        console.error("Initial completed-order purge failed:", error);
      });
      setInterval(() => {
        purgeCompletedOrders().catch((error) => {
          console.error("Scheduled completed-order purge failed:", error);
        });
      }, COMPLETED_ORDER_CLEANUP_INTERVAL_MS);

      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error("Failed to initialize database:", error);
      process.exit(1);
    });
}

module.exports = app;
