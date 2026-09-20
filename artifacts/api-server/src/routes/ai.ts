import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import {
  AnalyzeResumeBody,
  AnalyzeResumeResponse,
  AskCoachBody,
  AskCoachResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import {
  GeminiUnavailableError,
  generateGeminiText,
  parseJsonResponse,
} from "../lib/gemini";

const router: IRouter = Router();
router.use(requireAuth);

function requireUser(req: Request, res: Response) {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

type ResumeAnalysisPayload = {
  overallScore?: number;
  summary?: string;
  strengths?: string[];
  gaps?: string[];
  keywords?: string[];
  rewrittenBullets?: string[];
  nextSteps?: string[];
};

router.post("/ai/resume-analysis", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const parsed = AnalyzeResumeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const jobContext = parsed.data.jobDescription
    ? `\n\nTARGET JOB DESCRIPTION:\n${parsed.data.jobDescription}`
    : "";
  const prompt = `You are a precise, constructive resume reviewer for a software engineering candidate.
Analyze the resume below${parsed.data.jobDescription ? " against the target job description" : ""}.
Return ONLY valid JSON with exactly these keys:
{
  "overallScore": number from 0 to 100,
  "summary": "2-4 sentence assessment",
  "strengths": ["3-5 concrete strengths"],
  "gaps": ["3-5 specific gaps or risks"],
  "keywords": ["8-12 role-relevant keywords that are present or missing"],
  "rewrittenBullets": ["3-5 improved bullet examples based only on evidence in the resume; never invent metrics"],
  "nextSteps": ["4-6 prioritized actions"]
}
Be specific about evidence, scope, outcomes, ownership, and clarity. Do not make hiring predictions.

RESUME:
${parsed.data.resumeText}${jobContext}`;

  try {
    const raw = await generateGeminiText(prompt);
    const result = parseJsonResponse<ResumeAnalysisPayload>(raw);
    const normalized = {
      overallScore: Math.max(0, Math.min(100, Math.round(Number(result.overallScore) || 0))),
      summary: result.summary?.trim() || "The resume needs a closer review.",
      strengths: Array.isArray(result.strengths) ? result.strengths.filter(Boolean).slice(0, 8) : [],
      gaps: Array.isArray(result.gaps) ? result.gaps.filter(Boolean).slice(0, 8) : [],
      keywords: Array.isArray(result.keywords) ? result.keywords.filter(Boolean).slice(0, 16) : [],
      rewrittenBullets: Array.isArray(result.rewrittenBullets)
        ? result.rewrittenBullets.filter(Boolean).slice(0, 8)
        : [],
      nextSteps: Array.isArray(result.nextSteps) ? result.nextSteps.filter(Boolean).slice(0, 8) : [],
    };
    res.json(AnalyzeResumeResponse.parse(normalized));
  } catch (error) {
    if (error instanceof GeminiUnavailableError) {
      const responseStatus =
        error.status && error.status >= 400 && error.status < 500
          ? error.status === 429
            ? 429
            : 502
          : 503;
      res.status(responseStatus).json({ error: error.message });
      return;
    }
    res.status(502).json({ error: "Gemini returned an unreadable analysis. Try again." });
  }
});

type CoachPayload = {
  answer?: string;
  framework?: string;
  followUps?: string[];
  sources?: string[];
};

router.post("/ai/coach", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const parsed = AskCoachBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const prompt = `You are InterviewAI's practical interview coach. Answer the candidate's question with clear, actionable guidance.
Return ONLY valid JSON with exactly these keys:
{
  "answer": "a useful answer in 3-6 short paragraphs or concise markdown bullets",
  "framework": "the named structure or mental model to use",
  "followUps": ["3 realistic follow-up questions an interviewer may ask"],
  "sources": ["1-4 authoritative public URLs or source names relevant to the guidance"]
}
If the question is behavioral, use STAR without writing a fake story. If technical, explain trade-offs, assumptions, edge cases, and a practical example. Do not claim that a score predicts hiring outcomes.

QUESTION:
${parsed.data.question}
${parsed.data.context ? `\nCANDIDATE CONTEXT:\n${parsed.data.context}` : ""}`;

  try {
    const raw = await generateGeminiText(prompt);
    const result = parseJsonResponse<CoachPayload>(raw);
    const normalized = {
      answer: result.answer?.trim() || "Try breaking the question into context, choices, and measurable outcome.",
      framework: result.framework?.trim() || "Context → decision → trade-off → result",
      followUps: Array.isArray(result.followUps) ? result.followUps.filter(Boolean).slice(0, 8) : [],
      sources: Array.isArray(result.sources) ? result.sources.filter(Boolean).slice(0, 6) : [],
    };
    res.json(AskCoachResponse.parse(normalized));
  } catch (error) {
    if (error instanceof GeminiUnavailableError) {
      const responseStatus =
        error.status && error.status >= 400 && error.status < 500
          ? error.status === 429
            ? 429
            : 502
          : 503;
      res.status(responseStatus).json({ error: error.message });
      return;
    }
    res.status(502).json({ error: "Gemini returned an unreadable answer. Try again." });
  }
});

export default router;