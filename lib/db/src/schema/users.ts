import { pgTable, text, serial, timestamp, varchar, pgEnum, integer, uniqueIndex, boolean, date, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const SEDES = ["bogota", "chia"] as const;
export type Sede = typeof SEDES[number];

export const roleEnum = pgEnum("user_role", ["admin", "profesor", "alumno"]);
export const subscriptionLevelEnum = pgEnum("subscription_level", ["basico", "medio", "avanzado", "personalizado"]);
export const membershipStatusEnum = pgEnum("membership_status", ["activo", "inactivo", "pausado"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  subscriptionLevel: subscriptionLevelEnum("subscription_level").default("basico").notNull(),
  phone: varchar("phone", { length: 50 }),
  isFighter: boolean("is_fighter").default(false).notNull(),
  hiddenFromCommunity: boolean("hidden_from_community").default(false).notNull(),
  sedes: text("sedes").array().notNull().default([]),
  membershipStatus: membershipStatusEnum("membership_status").default("activo").notNull(),
  membershipExpiresAt: timestamp("membership_expires_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  lastPaymentAt: timestamp("last_payment_at"),
  membershipNotes: text("membership_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const paymentMethodEnum = pgEnum("payment_method", ["nequi", "daviplata", "banco", "link", "tarjeta"]);

export const paymentHistoryTable = pgTable("payment_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  paymentDate: date("payment_date").notNull(),
  expiresDate: date("expires_date").notNull(),
  amount: integer("amount"),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  notes: text("notes"),
  registeredBy: integer("registered_by").references(() => usersTable.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PaymentHistory = typeof paymentHistoryTable.$inferSelect;

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

export const anthropometricEvaluationsTable = pgTable("anthropometric_evaluations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull().unique(),
  initialWeight: real("initial_weight"),
  currentWeight: real("current_weight"),
  targetWeight: real("target_weight"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AnthropometricEvaluation = typeof anthropometricEvaluationsTable.$inferSelect;
