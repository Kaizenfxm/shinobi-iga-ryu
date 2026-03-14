import { pgTable, serial, integer, varchar, text, timestamp, boolean, uniqueIndex, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const disciplineEnum = pgEnum("discipline", ["ninjutsu", "jiujitsu"]);

export const beltDefinitionsTable = pgTable("belt_definitions", {
  id: serial("id").primaryKey(),
  discipline: disciplineEnum("discipline").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 50 }).notNull(),
  orderIndex: integer("order_index").notNull(),
  description: text("description"),
}, (table) => [
  uniqueIndex("belt_definitions_discipline_order_idx").on(table.discipline, table.orderIndex),
]);

export const studentBeltsTable = pgTable("student_belts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  discipline: disciplineEnum("discipline").notNull(),
  currentBeltId: integer("current_belt_id").references(() => beltDefinitionsTable.id).notNull(),
  nextUnlocked: boolean("next_unlocked").default(false).notNull(),
  unlockedAt: timestamp("unlocked_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("student_belts_user_discipline_idx").on(table.userId, table.discipline),
]);

export const beltHistoryTable = pgTable("belt_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  discipline: disciplineEnum("discipline").notNull(),
  beltId: integer("belt_id").references(() => beltDefinitionsTable.id).notNull(),
  promotedBy: integer("promoted_by").references(() => usersTable.id),
  achievedAt: timestamp("achieved_at").defaultNow().notNull(),
  notes: text("notes"),
});

export const beltRequirementsTable = pgTable("belt_requirements", {
  id: serial("id").primaryKey(),
  beltId: integer("belt_id").references(() => beltDefinitionsTable.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull(),
});

export type BeltDefinition = typeof beltDefinitionsTable.$inferSelect;
export type StudentBelt = typeof studentBeltsTable.$inferSelect;
export type BeltHistory = typeof beltHistoryTable.$inferSelect;
export type BeltRequirement = typeof beltRequirementsTable.$inferSelect;
