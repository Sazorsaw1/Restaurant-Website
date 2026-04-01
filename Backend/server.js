const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running");
});

// API SUBMIT ORDER
app.post("/orders", async (req, res) => {
  try {
    const { orderId, tableNumber, items, totalPrice, status } = req.body;

    const result = await pool.query(
      `INSERT INTO orders (order_id, table_number, items, total_price, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [orderId, tableNumber, JSON.stringify(items), totalPrice, status]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// API GET ORDER
app.get("/orders/:id", async (req, res) => {
  try {
    const orderId = req.params.id;

    const result = await pool.query(
      `SELECT * FROM orders WHERE order_id = $1`,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Order not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Open PORT
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});