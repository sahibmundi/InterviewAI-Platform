import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, profilesTable, usersTable } from "@workspace/db";
import {
  GetProfileResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateCurrentUser } from "../lib/current-user";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();
router.use(requireAuth);

function toProfileResponse(
  user: typeof usersTable.$inferSelect,
  profile: typeof profilesTable.$inferSelect,
) {
  const skills = profile.skills ?? [];
  const completionFields = [
    profile.education,
    profile.degree,
    profile.university,
    profile.experience,
    profile.preferredRole,
    skills.length > 0 ? "skills" : "",
  ];
  const profileCompletion = Math.round(
    (completionFields.filter(Boolean).length / completionFields.length) * 100,
  );

  return {
    id: String(profile.id),
    fullName: user.fullName,
    email: user.email,
    education: profile.education,
    degree: profile.degree,
    university: profile.university,
    graduationYear: profile.graduationYear,
    experience: profile.experience,
    skills,
    preferredRole: profile.preferredRole,
    yearsOfExperience: Number(profile.yearsOfExperience),
    profileCompletion,
    resumeName: profile.resumeName,
    updatedAt: profile.updatedAt,
  };
}

async function getProfileForUser(userId: number) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));
  if (!user || !profile) {
    throw new Error("Profile not provisioned");
  }
  return toProfileResponse(user, profile);
}

router.get("/profile", async (req, res): Promise<void> => {
  const clerkUserId = getAuth(req).userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const user = await getOrCreateCurrentUser(clerkUserId);
  res.json(GetProfileResponse.parse(await getProfileForUser(user.id)));
});

router.patch("/profile", async (req, res): Promise<void> => {
  const clerkUserId = getAuth(req).userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = await getOrCreateCurrentUser(clerkUserId);
  const { fullName, ...profileData } = parsed.data;
  if (fullName !== undefined) {
    await db
      .update(usersTable)
      .set({ fullName })
      .where(eq(usersTable.id, user.id));
  }
  await db
    .update(profilesTable)
    .set({
      ...profileData,
      yearsOfExperience:
        profileData.yearsOfExperience === undefined
          ? undefined
          : String(profileData.yearsOfExperience),
      updatedAt: new Date(),
    })
    .where(eq(profilesTable.userId, user.id));

  res.json(
    UpdateProfileResponse.parse(await getProfileForUser(user.id)),
  );
});

export default router;