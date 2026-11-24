import "dotenv/config";
import pg from "pg";

// Share a small pool between Prisma and the session store.
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
});

pool.on("error", (error) => {
    console.error("Database pool error:", error.message);
});

export default pool;
