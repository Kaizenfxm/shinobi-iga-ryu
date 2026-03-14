import { pgTable, serial, integer, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const trainingSystemsTable = pgTable("training_systems", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const exercisesTable = pgTable("exercises", {
  id: serial("id").primaryKey(),
  trainingSystemId: integer("training_system_id")
    .references(() => trainingSystemsTable.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  videoUrl: text("video_url"),
  imageUrl: text("image_url"),
  durationMinutes: integer("duration_minutes"),
  level: varchar("level", { length: 50 }),
  orderIndex: integer("order_index").notNull().default(0),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const knowledgeItemsTable = pgTable("knowledge_items", {
  id: serial("id").primaryKey(),
  trainingSystemId: integer("training_system_id")
    .references(() => trainingSystemsTable.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  videoUrl: text("video_url"),
  imageUrl: text("image_url"),
  orderIndex: integer("order_index").notNull().default(0),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
