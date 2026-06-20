import { generateObject, type ModelMessage } from "ai";
import { z } from "zod";
import { chatModels } from "./models";
import { getLanguageModel } from "./providers";

export type OracleResult = {
  id: string;
  friendlyName: string;
};

const ORACLE_FALLBACK_MODEL = "openai/gpt-oss-20b:free";

const ORACLE_MODEL_IDS = [
  "poolside/laguna-xs.2:free",
  "openai/gpt-oss-20b:free",
  "nex-agi/nex-n2-pro:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "openai/gpt-oss-120b:free",
] as const;

const oracleDecisionSchema = z.object({
  modelId: z.enum(ORACLE_MODEL_IDS),
  reason: z.string().max(120),
});

const ORACLE_SYSTEM_PROMPT = `You are SpaghettiOracle, an expert model router for a chat application.

Your job: pick the single best model for the user's LATEST message. Use prior messages only for context.

Available models (return the exact modelId):

1. poolside/laguna-xs.2:free
   Best for: writing code, debugging, refactors, APIs, scripts, configs, devops, technical implementation, agentic/tool-heavy tasks.

2. openai/gpt-oss-20b:free  ← DEFAULT when unsure
   Best for: everyday Q&A, explanations, summaries, how-tos, casual chat, quick factual answers, general knowledge.

3. nex-agi/nex-n2-pro:free
   Best for: creative writing, brainstorming, storytelling, friendly conversational tone, light banter.

4. google/gemma-4-31b-it:free
   Best for: image understanding and vision tasks ONLY (user attached images or asks about visual content).

5. nvidia/nemotron-3-nano-30b-a3b:free
   Best for: logic puzzles, math, step-by-step reasoning, structured analysis, comparing options.

6. openai/gpt-oss-120b:free  ← use sparingly
   Best for: exceptionally complex multi-step reasoning, deep research synthesis, or very long detailed analysis.
   Do NOT pick for: simple questions, casual chat, coding (use Laguna), or anything a smaller model can handle.

Routing rules:
- Default to openai/gpt-oss-20b:free unless there is a clear specialty match.
- Coding or implementation → poolside/laguna-xs.2:free (never 120b).
- Images/vision in the request → google/gemma-4-31b-it:free.
- Creative writing → nex-agi/nex-n2-pro:free.
- Logic/math/puzzles → nvidia/nemotron-3-nano-30b-a3b:free.
- Reserve openai/gpt-oss-120b:free for genuinely hard problems only.
- Vary your choices across a conversation; do not route every message to the same model.`;

function getFriendlyName(modelId: string): string {
  return chatModels.find((m) => m.id === modelId)?.name ?? modelId;
}

function getFallback(): OracleResult {
  return {
    id: ORACLE_FALLBACK_MODEL,
    friendlyName: getFriendlyName(ORACLE_FALLBACK_MODEL),
  };
}

function messageHasImages(messages: ModelMessage[]): boolean {
  for (const message of messages) {
    if (!Array.isArray(message.content)) {
      continue;
    }
    for (const part of message.content) {
      if (
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        (part.type === "image" ||
          (part.type === "file" &&
            "mediaType" in part &&
            typeof part.mediaType === "string" &&
            part.mediaType.startsWith("image/")))
      ) {
        return true;
      }
    }
  }
  return false;
}

export async function resolveSpaghettiOracle(
  messages: ModelMessage[]
): Promise<OracleResult> {
  const fallback = getFallback();

  if (!messages || messages.length === 0) {
    return fallback;
  }

  if (messageHasImages(messages)) {
    const visionModel = "google/gemma-4-31b-it:free";
    console.log("[SpaghettiOracle] vision content detected →", visionModel);
    return { id: visionModel, friendlyName: getFriendlyName(visionModel) };
  }

  try {
    const oracleModel = getLanguageModel("openai/gpt-oss-20b:free");
    const recent = messages.slice(-8);

    const { object } = await generateObject({
      model: oracleModel,
      schema: oracleDecisionSchema,
      system: ORACLE_SYSTEM_PROMPT,
      messages: recent,
      maxOutputTokens: 128,
      temperature: 0.4,
    });

    const modelId = object.modelId;
    console.log(
      "[SpaghettiOracle] routed to",
      modelId,
      `(${getFriendlyName(modelId)})`,
      "—",
      object.reason
    );

    return { id: modelId, friendlyName: getFriendlyName(modelId) };
  } catch (err) {
    console.error(
      "[SpaghettiOracle] error during routing, using fallback:",
      err
    );
    return fallback;
  }
}
