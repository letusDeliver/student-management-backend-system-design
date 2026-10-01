import "dotenv/config";
import app from "./app.js";
import { pool } from "./db/client.js";

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Check database connection first
    await pool.query("SELECT 1");

    console.log("Database connected successfully");

    // Start server only after database connection succeeds
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    // A refused connection is an AggregateError with an empty message, so fall back to its code.
    console.error("Database connection failed:", error.message || error.code);

    process.exit(1);
  }
}

startServer();
