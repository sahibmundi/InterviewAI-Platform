import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, interviewsTable } from "@workspace/db";
import {
  CreateInterviewBody,
  CreateInterviewResponse,
  GetInterviewParams,
  GetInterviewResponse,
  ListInterviewsQueryParams,
  ListInterviewsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateCurrentUser } from "../lib/current-user";

const router: IRouter = Router();
router.use(requireAuth);

function toSummary(interview: typeof interviewsTable.$inferSelect) {
  return {
    id: String(interview.id),
    title: interview.title,
    type: interview.type,
    difficulty: interview.difficulty,
    score: interview.score,
    questions: interview.questionCount,
    completedAt: interview.completedAt ?? interview.createdAt,
    duration: interview.duration,
  };
}

function toInterview(interview: typeof interviewsTable.$inferSelect) {
  return {
    ...toSummary(interview),
    answerMode: interview.answerMode,
    source: interview.source,
    status: interview.status,
    categoryScores: JSON.parse(interview.categoryScores) as Record<string, number>,
    questionsAsked: interview.questionsAsked,
    strongAreas: interview.strongAreas,
    weakAreas: interview.weakAreas,
    recommendedTopics: interview.recommendedTopics,
  };
}

router.get("/interviews", async (req, res): Promise<void> => {
  const clerkUserId = getAuth(req).userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const query = ListInterviewsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const user = await getOrCreateCurrentUser(clerkUserId);
  const filters =
    query.data.type === "all"
      ? eq(interviewsTable.userId, user.id)
      : and(
          eq(interviewsTable.userId, user.id),
          eq(interviewsTable.type, query.data.type),
        );
  const interviews = await db
    .select()
    .from(interviewsTable)
    .where(filters)
    .orderBy(desc(interviewsTable.createdAt));
  res.json(ListInterviewsResponse.parse(interviews.map(toSummary)));
});

router.post("/interviews", async (req, res): Promise<void> => {
  const clerkUserId = getAuth(req).userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const parsed = CreateInterviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = await getOrCreateCurrentUser(clerkUserId);
  const title = `${parsed.data.type[0].toUpperCase()}${parsed.data.type.slice(1)} Interview`;
  const [created] = await db
    .insert(interviewsTable)
    .values({
      userId: user.id,
      title,
      type: parsed.data.type,
      difficulty: parsed.data.difficulty,
      questionCount: parsed.data.questionCount,
      answerMode: parsed.data.answerMode,
      source: parsed.data.source,
      status: "ready",
      score: 0,
      duration: "Not started",
      completedAt: new Date(),
      categoryScores: "{}",
      questionsAsked: [],
      strongAreas: [],
      weakAreas: [],
      recommendedTopics: [],
    })
    .returning();
  res.status(201).json(CreateInterviewResponse.parse(toInterview(created)));
});

router.get("/interviews/:interviewId", async (req, res): Promise<void> => {
  const clerkUserId = getAuth(req).userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const params = GetInterviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = await getOrCreateCurrentUser(clerkUserId);
  const [interview] = await db
    .select()
    .from(interviewsTable)
    .where(
      and(
        eq(interviewsTable.id, Number(params.data.interviewId)),
        eq(interviewsTable.userId, user.id),
      ),
    );
  if (!interview) {
    res.status(404).json({ error: "Interview not found" });
    return;
  }
  res.json(GetInterviewResponse.parse(toInterview(interview)));
});

export default router;