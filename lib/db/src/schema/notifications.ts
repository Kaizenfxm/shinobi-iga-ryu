import { pgTable, serial, integer, text, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationReadsTable = pgTable("notification_reads", {
  id: serial("id").primaryKey(),
  notificationId: integer("notification_id").references(() => notificationsTable.id).notNull(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  readAt: timestamp("read_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("notification_reads_notif_user_idx").on(table.notificationId, table.userId),
]);
