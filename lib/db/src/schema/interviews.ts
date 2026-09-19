import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const interviewsTable = pgTable("interviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull(),
  difficulty: text("difficulty").notNull(),
  questionCount: integer("question_count").notNull(),
  answerMode: text("answer_mode").notNull(),
  source: text("source").notNull(),
  score: integer("score").notNull().default(0),
  status: text("status").notNull().default("ready"),
  duration: text("duration").notNull().default("—"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  categoryScores: text("category_scores").notNull().default("{}"),
  questionsAsked: text("questions_asked").array().notNull().default([]),
  answers: text("answers").notNull().default("[]"),
  strongAreas: text("strong_areas").array().notNull().default([]),
  weakAreas: text("weak_areas").array().notNull().default([]),
  recommendedTopics: text("recommended_topics").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInterviewSchema = createInsertSchema(interviewsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertInterview = z.infer<typeof insertInterviewSchema>;
export type Interview = typeof interviewsTable.$inferSelect;