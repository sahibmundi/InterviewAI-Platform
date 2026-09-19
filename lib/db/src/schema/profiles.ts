import { createInsertSchema } from "drizzle-zod";
import { integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  education: text("education").notNull().default(""),
  degree: text("degree").notNull().default(""),
  university: text("university").notNull().default(""),
  graduationYear: integer("graduation_year").notNull().default(2026),
  experience: text("experience").notNull().default(""),
  skills: text("skills").array().notNull().default([]),
  preferredRole: text("preferred_role").notNull().default("Software Engineer"),
  yearsOfExperience: numeric("years_of_experience", { precision: 4, scale: 1 })
    .notNull()
    .default("0"),
  resumeName: text("resume_name"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;