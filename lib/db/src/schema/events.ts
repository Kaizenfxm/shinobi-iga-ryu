import { pgTable, serial, integer, text, varchar, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  coverImageUrl: text("cover_image_url"),
  eventDate: timestamp("event_date").notNull(),
  location: varchar("location", { length: 300 }).notNull(),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eventAttendeesTable = pgTable("event_attendees", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => eventsTable.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  willAttend: boolean("will_attend").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("event_attendees_event_user_idx").on(table.eventId, table.userId),
]);
