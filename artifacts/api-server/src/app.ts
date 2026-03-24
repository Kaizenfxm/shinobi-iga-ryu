import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import router from "./routes";

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
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
    await client.query(`
      INSERT INTO training_systems (key, name, description, is_active) VALUES
        ('ninjutsu',   'Ninjutsu',    'El arte del ninja',                    true),
        ('mma',        'MMA',         'Artes marciales mixtas',               true),
        ('box',        'Box',         'El arte del puño',                     true),
        ('jiujitsu',   'Jiujitsu',    'El arte suave',                        true),
        ('muaythai',   'Muay Thai',   'El arte de los ocho miembros',         true),
        ('kickboxing', 'Kick Boxing', 'El arte del golpe y la patada',        true),
        ('funcional',  'Funcional',   'Entrenamiento funcional',              true)
      ON CONFLICT (key) DO NOTHING;
    `);

    // Categorías de ejercicio base para Ninjutsu
    const ninjutsuCats = [
      { name: "Gimnasia",             description: "Ejercicios para coordinación, acrobacias y condición física", order_index: 0 },
      { name: "Patadas",              description: "Técnicas de pateo, barridos y golpes con piernas",            order_index: 1 },
      { name: "Combates",             description: "Práctica de combate, sparring y aplicación de técnicas",      order_index: 2 },
      { name: "Resistencia al dolor", description: "Entrenamiento de resistencia física y mental extrema",        order_index: 3 },
      { name: "Katas",                description: "Formas tradicionales y secuencias de técnicas codificadas",   order_index: 4 },
    ];
    for (const cat of ninjutsuCats) {
      await client.query(
        `INSERT INTO exercise_categories (training_system_id, name, description, order_index, is_active)
         SELECT ts.id, $1::varchar, $2::text, $3::int, true
         FROM training_systems ts WHERE ts.key = 'ninjutsu'
         AND NOT EXISTS (
           SELECT 1 FROM exercise_categories ec
           WHERE ec.training_system_id = ts.id AND ec.name = $1::varchar
         )`,
        [cat.name, cat.description, cat.order_index]
      );
    }

    // Ejercicio base: Mawate Kiritsu (Ninjutsu / Gimnasia)
    await client.query(
      `INSERT INTO exercises (training_system_id, exercise_category_id, title, description, video_url, level, order_index, is_active)
       SELECT ts.id, ec.id,
         'Mawate Kiritsu',
         'La kick up, o levantada ninja. Consiste en un ejercicio con múltiples elementos que deberán ser ejecutados al tiempo para funcionar: Giro, pateo, empuje, arco, cabeceo.',
         'https://www.youtube.com/watch?v=T9Cq4NcvTQ4',
         'basico', 0, true
       FROM training_systems ts
       JOIN exercise_categories ec ON ec.training_system_id = ts.id AND ec.name = 'Gimnasia'
       WHERE ts.key = 'ninjutsu'
       AND NOT EXISTS (
         SELECT 1 FROM exercises e
         WHERE e.training_system_id = ts.id AND e.title = 'Mawate Kiritsu'
       )`
    );

    await client.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;"
    );

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
