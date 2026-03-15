import { pgTable, serial, integer, text, varchar, timestamp, date, time, uniqueIndex, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { trainingSystemsTable } from "./training";

export const classStatusEnum = pgEnum("class_status", ["programada", "en_curso", "finalizada", "cancelada"]);

export const classesTable = pgTable("classes", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  sede: varchar("sede", { length: 50 }).notNull(),
  classDate: date("class_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time"),
  profesorId: integer("profesor_id").references(() => usersTable.id),
  maxCapacity: integer("max_capacity"),
  status: classStatusEnum("status").default("programada").notNull(),
  qrToken: varchar("qr_token", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  checkedInAt: timestamp("checked_in_at").defaultNow().notNull(),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("class_attendances_class_user_idx").on(table.classId, table.userId),
]);

export type ClassRecord = typeof classesTable.$inferSelect;
export type ClassAttendance = typeof classAttendancesTable.$inferSelect;
