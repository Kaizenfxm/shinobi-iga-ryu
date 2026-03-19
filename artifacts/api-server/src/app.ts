import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import router from "./routes";

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_paused_at TIMESTAMPTZ;"
    );
    await client.query(`
      CREATE TABLE IF NOT EXISTS suggestions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        content TEXT NOT NULL,
        is_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("[migrations] startup migrations complete");
  } catch (err) {
    console.error("[migrations] error running startup migrations:", err);
  } finally {
    client.release();
  }
}

runMigrations().catch((err) => console.error("[migrations] fatal:", err));

const PgStore = connectPgSimple(session);

const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required in production");
}

const app: Express = express();

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new PgStore({
      pool: pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "shinobi-iga-ryu-dev-only-secret",
    name: "sid",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
    },
  })
);

app.use("/api", router);

export default app;
