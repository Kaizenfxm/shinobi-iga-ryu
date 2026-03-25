import { pgTable, serial, integer, text, varchar, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const trainingSystemsTable = pgTable("training_systems", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const exerciseCategoriesTable = pgTable("exercise_categories", {
  id: serial("id").primaryKey(),
  trainingSystemId: integer("training_system_id")
    .references(() => trainingSystemsTable.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  orderIndex: integer("order_index").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const knowledgeCategoriesTable = pgTable("knowledge_categories", {
  id: serial("id").primaryKey(),
  trainingSystemId: integer("training_system_id")
    .references(() => trainingSystemsTable.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  orderIndex: integer("order_index").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const exercisesTable = pgTable("exercises", {
  id: serial("id").primaryKey(),
  trainingSystemId: integer("training_system_id")
    .references(() => trainingSystemsTable.id, { onDelete: "cascade" })
    .notNull(),
  exerciseCategoryId: integer("exercise_category_id")
    .references(() => exerciseCategoriesTable.id, { onDelete: "set null" }),
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
  reqBeltDiscipline: varchar("req_belt_discipline", { length: 50 }),
  reqBeltMinOrder: integer("req_belt_min_order"),
  reqMinWins: integer("req_min_wins"),
  reqMinAttendances: integer("req_min_attendances"),
});

export const knowledgeItemsTable = pgTable("knowledge_items", {
  id: serial("id").primaryKey(),
  trainingSystemId: integer("training_system_id")
    .references(() => trainingSystemsTable.id, { onDelete: "cascade" })
    .notNull(),
  knowledgeCategoryId: integer("knowledge_category_id")
    .references(() => knowledgeCategoriesTable.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  videoUrl: text("video_url"),
  imageUrl: text("image_url"),
  orderIndex: integer("order_index").notNull().default(0),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  reqBeltDiscipline: varchar("req_belt_discipline", { length: 50 }),
  reqBeltMinOrder: integer("req_belt_min_order"),
  reqMinWins: integer("req_min_wins"),
  reqMinAttendances: integer("req_min_attendances"),
});

export const exercisePrerequisitesTable = pgTable("exercise_prerequisites", {
  id: serial("id").primaryKey(),
  exerciseId: integer("exercise_id")
    .references(() => exercisesTable.id, { onDelete: "cascade" })
    .notNull(),
  prerequisiteExerciseId: integer("prerequisite_exercise_id")
    .references(() => exercisesTable.id, { onDelete: "cascade" })
    .notNull(),
}, (table) => [
  uniqueIndex("exercise_prereqs_idx").on(table.exerciseId, table.prerequisiteExerciseId),
]);

export const userExerciseCompletionsTable = pgTable("user_exercise_completions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => usersTable.id, { onDelete: "cascade" })
    .notNull(),
  exerciseId: integer("exercise_id")
    .references(() => exercisesTable.id, { onDelete: "cascade" })
    .notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("user_exercise_completions_idx").on(table.userId, table.exerciseId),
]);

export const knowledgePrerequisitesTable = pgTable("knowledge_prerequisites", {
  id: serial("id").primaryKey(),
  knowledgeItemId: integer("knowledge_item_id")
    .references(() => knowledgeItemsTable.id, { onDelete: "cascade" })
    .notNull(),
  prerequisiteKnowledgeItemId: integer("prerequisite_knowledge_item_id")
    .references(() => knowledgeItemsTable.id, { onDelete: "cascade" })
    .notNull(),
}, (table) => [
  uniqueIndex("knowledge_prereqs_idx").on(table.knowledgeItemId, table.prerequisiteKnowledgeItemId),
]);

export const userKnowledgeViewsTable = pgTable("user_knowledge_views", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => usersTable.id, { onDelete: "cascade" })
    .notNull(),
  knowledgeItemId: integer("knowledge_item_id")
    .references(() => knowledgeItemsTable.id, { onDelete: "cascade" })
    .notNull(),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("user_knowledge_views_idx").on(table.userId, table.knowledgeItemId),
]);
