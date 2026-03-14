import { pgTable, text, serial, timestamp, varchar, pgEnum, integer, uniqueIndex, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const SEDES = ["bogota", "chia"] as const;
export type Sede = typeof SEDES[number];

export const roleEnum = pgEnum("user_role", ["admin", "profesor", "alumno"]);
export const subscriptionLevelEnum = pgEnum("subscription_level", ["basico", "medio", "avanzado", "personalizado"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  subscriptionLevel: subscriptionLevelEnum("subscription_level").default("basico").notNull(),
  phone: varchar("phone", { length: 50 }),
  isFighter: boolean("is_fighter").default(false).notNull(),
  sedes: text("sedes").array().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const fightResultEnum = pgEnum("fight_result", ["victoria", "derrota", "empate"]);
export const fightMethodEnum = pgEnum("fight_method", ["ko", "tko", "sumision", "decision", "decision_unanime", "decision_dividida", "descalificacion", "no_contest"]);
export const fightDisciplineEnum = pgEnum("fight_discipline", ["mma", "box", "jiujitsu", "muay_thai", "ninjutsu", "otro"]);

export const fightsTable = pgTable("fights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  opponentName: varchar("opponent_name", { length: 255 }).notNull(),
  eventName: varchar("event_name", { length: 255 }),
  fightDate: date("fight_date").notNull(),
  result: fightResultEnum("result").notNull(),
  method: fightMethodEnum("method"),
  discipline: fightDisciplineEnum("discipline").notNull(),
  rounds: integer("rounds"),
  notes: text("notes"),
  registeredBy: integer("registered_by").references(() => usersTable.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userRolesTable = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  role: roleEnum("role").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("user_roles_user_id_role_idx").on(table.userId, table.role),
]);

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type Fight = typeof fightsTable.$inferSelect;

export const profesorStudentsTable = pgTable("profesor_students", {
  id: serial("id").primaryKey(),
  profesorId: integer("profesor_id").references(() => usersTable.id).notNull(),
  alumnoId: integer("alumno_id").references(() => usersTable.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("profesor_students_profesor_alumno_idx").on(table.profesorId, table.alumnoId),
]);

export const insertUserRoleSchema = createInsertSchema(userRolesTable).omit({ id: true, assignedAt: true });
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRolesTable.$inferSelect;

export const insertProfesorStudentSchema = createInsertSchema(profesorStudentsTable).omit({ id: true, assignedAt: true });
export type InsertProfesorStudent = z.infer<typeof insertProfesorStudentSchema>;
export type ProfesorStudent = typeof profesorStudentsTable.$inferSelect;
