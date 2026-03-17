import { pgTable, serial, integer, text, varchar, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { trainingSystemsTable } from "./training";

export const challengeStatusEnum = pgEnum("challenge_status", [
  "pending",
  "accepted",
  "declined",
  "completed",
  "cancelled",
]);

export const challengesTable = pgTable("challenges", {
  id: serial("id").primaryKey(),
  challengerId: integer("challenger_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  challengedId: integer("challenged_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  trainingSystemId: integer("training_system_id").references(() => trainingSystemsTable.id).notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  notes: text("notes"),
  status: challengeStatusEnum("status").notNull().default("pending"),
  winnerId: integer("winner_id").references(() => usersTable.id),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pushTokensTable = pgTable("push_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  token: varchar("token", { length: 500 }).notNull(),
  platform: varchar("platform", { length: 20 }).notNull().default("unknown"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("push_tokens_user_token_idx").on(table.userId, table.token),
]);

export type Challenge = typeof challengesTable.$inferSelect;
export type PushToken = typeof pushTokensTable.$inferSelect;
