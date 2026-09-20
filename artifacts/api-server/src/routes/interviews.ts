import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, interviewsTable } from "@workspace/db";
import {
  CreateInterviewBody,
  CreateInterviewResponse,
  GetInterviewParams,
  GetInterviewResponse,
  GetInterviewSessionParams,
  GetInterviewSessionResponse,
  ListInterviewsQueryParams,
  ListInterviewsResponse,
  SubmitInterviewAnswerBody,
  SubmitInterviewAnswerParams,
  SubmitInterviewAnswerResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateCurrentUser } from "../lib/current-user";
import { generateGeminiText, parseJsonResponse } from "../lib/gemini";

const router: IRouter = Router();
router.use(requireAuth);

type PracticeQuestion = {
  prompt: string;
  category: string;
};

const questionBank: Record<string, PracticeQuestion[]> = {
  behavioral: [
    { prompt: "Tell me about yourself and the kind of role you are preparing for.", category: "communication" },
    { prompt: "Tell me about a time you had to solve a difficult problem with limited information.", category: "problem solving" },
    { prompt: "Describe a time you received difficult feedback. What did you change afterward?", category: "self awareness" },
    { prompt: "Tell me about a time you disagreed with a teammate. How did you move forward?", category: "collaboration" },
    { prompt: "Describe a project you are proud of and the part you personally owned.", category: "ownership" },
    { prompt: "Tell me about a mistake you made and what you learned from it.", category: "self awareness" },
    { prompt: "How do you prioritize when several important tasks compete for your attention?", category: "judgment" },
    { prompt: "What would your teammates say is your strongest working habit?", category: "communication" },
  ],
  technical: [
    { prompt: "Walk me through a technical project you built and the trade-offs you made.", category: "technical depth" },
    { prompt: "How would you design a service that needs to handle a large increase in traffic?", category: "system design" },
    { prompt: "How do you investigate a production issue that is difficult to reproduce locally?", category: "problem solving" },
    { prompt: "Explain a technical concept you know well as if you were teaching it to a new teammate.", category: "communication" },
    { prompt: "How do you decide whether to refactor existing code or build a new implementation?", category: "judgment" },
    { prompt: "Tell me about a time you improved performance or reliability.", category: "technical depth" },
    { prompt: "What would you test before shipping a new API endpoint?", category: "quality" },
    { prompt: "How do you keep your technical knowledge current?", category: "growth" },
  ],
  coding: [
    { prompt: "How would you find the first non-repeating character in a string?", category: "algorithms" },
    { prompt: "How would you explain the difference between a stack and a queue, and when would you use each?", category: "data structures" },
    { prompt: "How would you approach debugging a function that works for small inputs but times out for large ones?", category: "problem solving" },
    { prompt: "Design an approach for merging overlapping intervals.", category: "algorithms" },
    { prompt: "What edge cases would you test for a function that validates parentheses?", category: "quality" },
    { prompt: "How do you reason about time and space complexity while coding?", category: "complexity" },
    { prompt: "Describe how you would review a pull request for correctness and maintainability.", category: "quality" },
    { prompt: "When would you choose breadth-first search over depth-first search?", category: "data structures" },
  ],
  hr: [
    { prompt: "Walk me through your background and what brings you to this opportunity.", category: "communication" },
    { prompt: "What kind of team environment helps you do your best work?", category: "culture" },
    { prompt: "What is a professional achievement that matters to you?", category: "impact" },
    { prompt: "How do you handle a change in priorities?", category: "adaptability" },
    { prompt: "What are you looking for in your next role?", category: "motivation" },
    { prompt: "Tell me about a time you worked with someone very different from you.", category: "collaboration" },
    { prompt: "What is one skill you are actively developing?", category: "growth" },
    { prompt: "What questions would you ask us at the end of an interview?", category: "judgment" },
  ],
  project: [
    { prompt: "Choose a project from your experience and explain the problem it solved.", category: "communication" },
    { prompt: "How did you decide what to build first in that project?", category: "prioritization" },
    { prompt: "What was the hardest technical or product trade-off you made?", category: "judgment" },
    { prompt: "How did you measure whether the project was successful?", category: "impact" },
    { prompt: "Tell me about a project decision you would make differently today.", category: "self awareness" },
    { prompt: "How did you communicate progress and risk to stakeholders?", category: "communication" },
    { prompt: "What would you improve if you had another month to work on it?", category: "growth" },
    { prompt: "What did you personally own versus what the wider team owned?", category: "ownership" },
  ],
  mixed: [
    { prompt: "Tell me about yourself and the kind of role you are preparing for.", category: "communication" },
    { prompt: "Walk me through a technical project you built and the trade-offs you made.", category: "technical depth" },
    { prompt: "Tell me about a time you had to solve a difficult problem with limited information.", category: "problem solving" },
    { prompt: "How would you design a service that needs to handle a large increase in traffic?", category: "system design" },
    { prompt: "Describe a time you received difficult feedback. What did you change afterward?", category: "self awareness" },
    { prompt: "What would you test before shipping a new API endpoint?", category: "quality" },
    { prompt: "How do you prioritize when several important tasks compete for your attention?", category: "judgment" },
    { prompt: "What skill are you actively developing, and how are you practicing it?", category: "growth" },
  ],
};

function buildQuestions(type: string, count: number) {
  const bank = questionBank[type] ?? questionBank.mixed;
  return Array.from({ length: count }, (_, index) => {
    const base = bank[index % bank.length];
    const cycle = Math.floor(index / bank.length);
    return cycle === 0
      ? base
      : { ...base, prompt: `${base.prompt} Give a specific example from your experience.` };
  });
}

type StoredAnswer = {
  questionIndex: number;
  answer: string;
  submittedAt: string;
};

function readAnswers(value: string): StoredAnswer[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (answer): answer is StoredAnswer =>
        typeof answer === "object" &&
        answer !== null &&
        typeof (answer as StoredAnswer).questionIndex === "number" &&
        typeof (answer as StoredAnswer).answer === "string" &&
        typeof (answer as StoredAnswer).submittedAt === "string",
    );
  } catch {
    return [];
  }
}

function scoreAnswer(answer: string) {
  const normalized = answer.trim().toLowerCase();
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  let score = 42;
  if (wordCount >= 25) score += 15;
  if (wordCount >= 60) score += 10;
  if (/(situation|task|action|result|because|therefore|trade-off|tradeoff)/.test(normalized)) score += 15;
  if (/(for example|specifically|measured|impact|learned|tested)/.test(normalized)) score += 10;
  if (wordCount < 8) score -= 20;
  return Math.max(20, Math.min(95, score));
}

function heuristicEvaluation(questions: PracticeQuestion[], answers: StoredAnswer[]) {
  const categoryScores = new Map<string, number[]>();
  answers.forEach((answer) => {
    const category = questions[answer.questionIndex]?.category ?? "communication";
    const scores = categoryScores.get(category) ?? [];
    scores.push(scoreAnswer(answer.answer));
    categoryScores.set(category, scores);
  });
  const scores = answers.map((answer) => scoreAnswer(answer.answer));
  const average = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : 0;
  const categoryValues = Object.fromEntries(
    Array.from(categoryScores.entries()).map(([category, values]) => [
      category,
      Math.round(values.reduce((sum, score) => sum + score, 0) / values.length),
    ]),
  );
  const strongAreas = Object.entries(categoryValues)
    .filter(([, score]) => score >= 75)
    .map(([category]) => category);
  const weakAreas = Object.entries(categoryValues)
    .filter(([, score]) => score < 65)
    .map(([category]) => category);
  return {
    score: average,
    categoryScores: categoryValues,
    strongAreas,
    weakAreas,
    recommendedTopics: weakAreas.length > 0 ? weakAreas.slice(0, 3) : ["Specific examples", "Clear structure"],
  };
}

async function buildEvaluation(
  questions: PracticeQuestion[],
  answers: StoredAnswer[],
) {
  const transcript = answers
    .map((answer) => {
      const question = questions[answer.questionIndex];
      return `QUESTION (${question?.category ?? "communication"}): ${question?.prompt ?? "Unknown"}\nANSWER: ${answer.answer}`;
    })
    .join("\n\n");

  try {
    const raw = await generateGeminiText(`You are a rigorous but constructive interview evaluator.
Score the candidate's actual answers below. Do not score the candidate's identity, accent, gender, or writing style.
Evaluate evidence, correctness, structure, ownership, trade-offs, specificity, and communication.
Return ONLY valid JSON with exactly:
{
  "score": integer 0-100,
  "categoryScores": { "category name": integer 0-100 },
  "strongAreas": ["2-4 specific strengths"],
  "weakAreas": ["2-4 specific improvement areas"],
  "recommendedTopics": ["3-5 concrete topics to practice next"]
}
Use the question category as the category key where possible. A short answer should score lower for missing evidence, but do not reward length by itself.

${transcript}`);
    const result = parseJsonResponse<{
      score?: number;
      categoryScores?: Record<string, number>;
      strongAreas?: string[];
      weakAreas?: string[];
      recommendedTopics?: string[];
    }>(raw);
    const categoryScores = Object.fromEntries(
      Object.entries(result.categoryScores ?? {})
        .map(([category, score]) => [category, Math.max(0, Math.min(100, Math.round(Number(score) || 0)))] as [string, number])
        .filter(([, score]) => score > 0),
    );
    return {
      score: Math.max(0, Math.min(100, Math.round(Number(result.score) || 0))),
      categoryScores,
      strongAreas: Array.isArray(result.strongAreas) ? result.strongAreas.filter(Boolean).slice(0, 6) : [],
      weakAreas: Array.isArray(result.weakAreas) ? result.weakAreas.filter(Boolean).slice(0, 6) : [],
      recommendedTopics: Array.isArray(result.recommendedTopics)
        ? result.recommendedTopics.filter(Boolean).slice(0, 6)
        : [],
    };
  } catch {
    // Keep the interview usable if the provider is temporarily unavailable.
    // The normal path is Gemini; this only protects an in-progress session.
    return heuristicEvaluation(questions, answers);
  }
}

function toSummary(interview: typeof interviewsTable.$inferSelect) {
  return {
    id: String(interview.id),
    title: interview.title,
    type: interview.type,
    difficulty: interview.difficulty,
    score: interview.score,
    questions: interview.questionCount,
    status: interview.status,
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

function toSession(interview: typeof interviewsTable.$inferSelect) {
  const questions = buildQuestions(interview.type, interview.questionCount);
  const answers = readAnswers(interview.answers);
  const currentQuestionIndex = answers.length;
  const completed = interview.status === "completed" || currentQuestionIndex >= questions.length;
  return {
    interview: toInterview(interview),
    currentQuestion: completed
      ? null
      : {
          index: currentQuestionIndex,
          prompt: questions[currentQuestionIndex].prompt,
          category: questions[currentQuestionIndex].category,
        },
    currentQuestionIndex,
    answeredCount: answers.length,
    totalQuestions: questions.length,
    answers,
    completed,
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
  const questions = buildQuestions(parsed.data.type, parsed.data.questionCount);
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
      status: "in_progress",
      score: 0,
      duration: `${parsed.data.questionCount} questions`,
       completedAt: null,
      categoryScores: "{}",
      questionsAsked: questions.map((question) => question.prompt),
      answers: "[]",
      strongAreas: [],
      weakAreas: [],
      recommendedTopics: [],
    })
    .returning();
  res.status(201).json(CreateInterviewResponse.parse(toInterview(created)));
});

router.get("/interviews/:interviewId/session", async (req, res): Promise<void> => {
  const clerkUserId = getAuth(req).userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const params = GetInterviewSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = await getOrCreateCurrentUser(clerkUserId);
  const [interview] = await db
    .select()
    .from(interviewsTable)
    .where(and(eq(interviewsTable.id, Number(params.data.interviewId)), eq(interviewsTable.userId, user.id)));
  if (!interview) {
    res.status(404).json({ error: "Interview not found" });
    return;
  }
  res.json(GetInterviewSessionResponse.parse(toSession(interview)));
});

router.post("/interviews/:interviewId/answers", async (req, res): Promise<void> => {
  const clerkUserId = getAuth(req).userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const params = SubmitInterviewAnswerParams.safeParse(req.params);
  const body = SubmitInterviewAnswerBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const user = await getOrCreateCurrentUser(clerkUserId);
  const [interview] = await db
    .select()
    .from(interviewsTable)
    .where(and(eq(interviewsTable.id, Number(params.data.interviewId)), eq(interviewsTable.userId, user.id)));
  if (!interview) {
    res.status(404).json({ error: "Interview not found" });
    return;
  }
  const questions = buildQuestions(interview.type, interview.questionCount);
  const answers = readAnswers(interview.answers);
  if (interview.status === "completed" || body.data.questionIndex !== answers.length || !questions[body.data.questionIndex]) {
    res.status(400).json({ error: "This question is no longer active." });
    return;
  }
  const nextAnswers = [
    ...answers,
    {
      questionIndex: body.data.questionIndex,
      answer: body.data.answer.trim(),
      submittedAt: new Date().toISOString(),
    },
  ];
  const isComplete = nextAnswers.length === questions.length;
   const evaluation = isComplete
     ? await buildEvaluation(questions, nextAnswers)
     : heuristicEvaluation(questions, nextAnswers);
  const [updated] = await db
    .update(interviewsTable)
    .set({
      answers: JSON.stringify(nextAnswers),
      status: isComplete ? "completed" : "in_progress",
      score: isComplete ? evaluation.score : 0,
      duration: isComplete ? `${Math.max(1, Math.round(nextAnswers.length * 1.5))} min` : `${nextAnswers.length}/${questions.length} answered`,
      completedAt: isComplete ? new Date() : interview.completedAt,
      categoryScores: isComplete ? JSON.stringify(evaluation.categoryScores) : "{}",
      strongAreas: isComplete ? evaluation.strongAreas : [],
      weakAreas: isComplete ? evaluation.weakAreas : [],
      recommendedTopics: isComplete ? evaluation.recommendedTopics : [],
    })
    .where(eq(interviewsTable.id, interview.id))
    .returning();
  res.json(SubmitInterviewAnswerResponse.parse(toSession(updated)));
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