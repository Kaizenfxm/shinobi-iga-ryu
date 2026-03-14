import { pgTable, text, serial, timestamp, varchar, pgEnum, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleEnum = pgEnum("user_role", ["admin", "profesor", "alumno"]);
export const subscriptionLevelEnum = pgEnum("subscription_level", ["basico", "medio", "avanzado", "personalizado"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  subscriptionLevel: subscriptionLevelEnum("subscription_level").default("basico").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
