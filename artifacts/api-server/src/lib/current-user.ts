import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { db, profilesTable, usersTable } from "@workspace/db";

export async function getOrCreateCurrentUser(clerkUserId: string) {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);

  if (existing[0]?.email) {
    return existing[0];
  }

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new Error("Authenticated Clerk user does not have an email address");
  }

  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    existing[0]?.fullName ||
    "Candidate";

  if (existing[0]) {
    const [updated] = await db
      .update(usersTable)
      .set({ email, fullName })
      .where(eq(usersTable.id, existing[0].id))
      .returning();

    if (updated) {
      return updated;
    }
  }

  const inserted = await db
    .insert(usersTable)
    .values({
      clerkUserId,
      fullName,
      email,
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