import { pgTable, serial, integer, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";

export const roulettePunishmentsTable = pgTable("roulette_punishments", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 100 }).notNull(),
  iconUrl: text("icon_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type RoulettePunishment = typeof roulettePunishmentsTable.$inferSelect;
