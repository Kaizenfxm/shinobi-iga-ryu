import { pgTable, serial, integer, text, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { trainingSystemsTable } from "./training";

export const classesTable = pgTable("classes", {
  id: serial("id").primaryKey(),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id).notNull(),
  notes: text("notes"),
  qrToken: varchar("qr_token", { length: 100 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const classTrainingSystemsTable = pgTable("class_training_systems", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classesTable.id, { onDelete: "cascade" }).notNull(),
  trainingSystemId: integer("training_system_id").references(() => trainingSystemsTable.id, { onDelete: "cascade" }).notNull(),
}, (table) => [
  uniqueIndex("class_training_systems_class_system_idx").on(table.classId, table.trainingSystemId),
]);

export const classAttendancesTable = pgTable("class_attendances", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classesTable.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  attendedAt: timestamp("attended_at").defaultNow().notNull(),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("class_attendances_class_user_idx").on(table.classId, table.userId),
]);

export type ClassRecord = typeof classesTable.$inferSelect;
export type ClassAttendance = typeof classAttendancesTable.$inferSelect;
