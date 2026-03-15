import { sql } from "drizzle-orm";
import { db } from "../index";

async function main() {
  console.log("Running training categories migration...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS exercise_categories (
      id SERIAL PRIMARY KEY,
      training_system_id INTEGER NOT NULL REFERENCES training_systems(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS knowledge_categories (
      id SERIAL PRIMARY KEY,
      training_system_id INTEGER NOT NULL REFERENCES training_systems(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS exercise_category_id INTEGER REFERENCES exercise_categories(id) ON DELETE SET NULL
  `);

  await db.execute(sql`
    ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS knowledge_category_id INTEGER REFERENCES knowledge_categories(id) ON DELETE SET NULL
  `);

  console.log("Training categories migration complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
