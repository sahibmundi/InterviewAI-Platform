import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, interviewsTable, profilesTable, usersTable } from "@workspace/db";
import { GetDashboardResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateCurrentUser } from "../lib/current-user";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/dashboard", async (req, res): Promise<void> => {
  const clerkUserId = getAuth(req).userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const user = await getOrCreateCurrentUser(clerkUserId);
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, user.id));
  const interviews = await db
    .select()
    .from(interviewsTable)
    .where(eq(interviewsTable.userId, user.id))
    .orderBy(desc(interviewsTable.createdAt))
    .limit(8);

  if (!profile) {
    res.status(500).json({ error: "Profile not provisioned" });
    return;
  }

  const scores = interviews
    .filter((interview) => interview.status === "completed" && interview.score > 0)
    .map((interview) => interview.score);
  const readinessScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;
  const candidate = {
    id: String(profile.id),
    fullName: user.fullName,
    email: user.email,
    education: profile.education,
    degree: profile.degree,
    university: profile.university,
    graduationYear: profile.graduationYear,
    experience: profile.experience,
    skills: profile.skills ?? [],
    preferredRole: profile.preferredRole,
    yearsOfExperience: Number(profile.yearsOfExperience),
    profileCompletion: Math.round(
      ([
        profile.education,
        profile.degree,
        profile.university,
        profile.experience,
        profile.preferredRole,
        (profile.skills ?? []).length > 0 ? "skills" : "",
      ].filter(Boolean).length /
        6) *
        100,
    ),
    resumeName: profile.resumeName,
    updatedAt: profile.updatedAt,
  };

  const recentInterviews = interviews.map((interview) => ({
    id: String(interview.id),
    title: interview.title,
    type: interview.type,
    difficulty: interview.difficulty,
    score: interview.score,
    questions: interview.questionCount,
    status: interview.status,
    completedAt: interview.completedAt ?? interview.createdAt,
    duration: interview.duration,
  }));

  const completedInterviews = interviews.filter(
    (interview) => interview.status === "completed",
  );
  const categoryTotals = new Map<string, number[]>();
  completedInterviews.forEach((interview) => {
    try {
      const categoryScores = JSON.parse(interview.categoryScores) as Record<
        string,
        number
      >;
      Object.entries(categoryScores).forEach(([category, score]) => {
        const values = categoryTotals.get(category) ?? [];
        values.push(score);
        categoryTotals.set(category, values);
      });
    } catch {
      // Older records may not have a category score payload.
    }
  });
  const categoryAverage = (categories: string[]) => {
    const values = categories.flatMap(
      (category) => categoryTotals.get(category) ?? [],
    );
    return values.length
      ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
      : readinessScore;
  };
  const previousScore = completedInterviews[1]?.score ?? readinessScore;
  const scoreChange = readinessScore - previousScore;
  const metrics = [
    {
      label: "Technical knowledge",
      value: categoryAverage(["technical depth", "system design", "algorithms", "data structures", "complexity", "quality"]),
      change: scoreChange,
      color: "blue",
    },
    {
      label: "Problem solving",
      value: categoryAverage(["problem solving", "judgment", "prioritization"]),
      change: scoreChange,
      color: "violet",
    },
    {
      label: "Communication",
      value: categoryAverage(["communication", "collaboration", "culture"]),
      change: scoreChange,
      color: "amber",
    },
    {
      label: "Behavioral",
      value: categoryAverage(["self awareness", "ownership", "impact", "growth", "motivation", "adaptability"]),
      change: scoreChange,
      color: "emerald",
    },
  ];

  const progress = scores
    .slice()
    .reverse()
    .map((score, index) => ({ label: `Interview ${index + 1}`, score }));

  const weakAreas = metrics
    .filter((metric) => metric.value > 0 && metric.value < 70)
    .sort((left, right) => left.value - right.value)
    .slice(0, 3)
    .map((metric) => ({
      name: metric.label,
      score: metric.value,
      severity: metric.value < 55 ? "high" : metric.value < 65 ? "medium" : "low",
    }));
  const focusArea = weakAreas[0]?.name;
  const data = {
    candidate,
    readinessScore,
    readinessLabel:
      readinessScore > 0 ? "Practice momentum" : "Ready when you are",
    readinessDescription:
      readinessScore > 0
        ? "Your internal practice metric improves as you complete focused sessions."
        : "Complete your first practice interview to establish your baseline.",
    metrics,
    progress,
    recommendation: {
      title: focusArea
        ? `Sharpen your ${focusArea.toLowerCase()}`
        : readinessScore > 0
          ? "Keep your momentum going"
          : "Set up your first interview",
      description:
        focusArea
          ? `Run a focused session that gives you more practice with ${focusArea.toLowerCase()}.`
          : readinessScore > 0
            ? "Use a focused technical session to reinforce the topics you have been practicing."
            : "Choose a format, difficulty, and question count that matches your next opportunity.",
      category: focusArea ?? "Next practice",
      duration: "15 min",
      action: "Start interview",
    },
    weakAreas,
    recentInterviews,
  };

  res.json(GetDashboardResponse.parse(data));
});

export default router;