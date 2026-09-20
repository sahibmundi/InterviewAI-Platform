import { logger } from "./logger";

// Keep this configurable. Gemini currently recommends 3.6 Flash for new users;
// older 2.5 models may appear in the model list but reject generation requests.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

type GeminiResponse = {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export class GeminiUnavailableError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "GeminiUnavailableError";
  }
}

export async function generateGeminiText(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiUnavailableError("GEMINI_API_KEY is not configured.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    logger.warn(
      {
        model: GEMINI_MODEL,
        status: response.status,
        detail: detail.slice(0, 300),
      },
      "Gemini provider request failed",
    );
    throw new GeminiUnavailableError(
      `Gemini request failed with status ${response.status}: ${detail.slice(0, 300)}`,
      response.status,
    );
  }

  const payload = (await response.json()) as GeminiResponse;
  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  if (!text) {
    logger.warn(
      { model: GEMINI_MODEL, finishReason: payload.candidates?.[0]?.finishReason },
      "Gemini provider returned no text",
    );
    throw new GeminiUnavailableError("Gemini returned an empty response.");
  }

  return text;
}

export function parseJsonResponse<T>(text: string): T {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}