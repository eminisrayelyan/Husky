import "dotenv/config";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pool from "../db/pool.js";

const PgStore = connectPgSimple(session);

const sessionMiddleware = session({
    store: new PgStore({
        pool,
        schemaName: "private",
        createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
    },
});

export default sessionMiddleware;
