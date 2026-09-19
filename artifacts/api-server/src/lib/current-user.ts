import { eq } from "drizzle-orm";
import { db, profilesTable, usersTable } from "@workspace/db";

export async function getOrCreateCurrentUser(clerkUserId: string) {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const inserted = await db
    .insert(usersTable)
    .values({
      clerkUserId,
      fullName: "Your name",
      email: "",
    })
    .onConflictDoNothing({ target: usersTable.clerkUserId })
    .returning();

  const user =
    inserted[0] ??
    (
      await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.clerkUserId, clerkUserId))
        .limit(1)
    )[0];

  if (!user) {
    throw new Error("Unable to provision the current user");
  }

  const profile = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, user.id))
    .limit(1);

  if (!profile[0]) {
    await db.insert(profilesTable).values({ userId: user.id });
  }

  return user;
}