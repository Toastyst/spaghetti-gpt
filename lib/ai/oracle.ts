import { generateObject, type ModelMessage } from "ai";
import { z } from "zod";
import { chatModels } from "./models";
import { getLanguageModel } from "./providers";

export type OracleRoutingMethod = "llm" | "vision" | "heuristic" | "fallback";

export type OracleResult = {
  id: string;
  friendlyName: string;
  reason: string;
  method: OracleRoutingMethod;
};

export type OracleSignals = {
  coding: number;
  creative: number;
  reasoning: number;
  vision: boolean;
  latestUserText: string;
  heuristicSuggestion: string | null;
};

const ORACLE_FALLBACK_MODEL = "openai/gpt-oss-20b:free";
const ORACLE_ROUTER_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

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
  reason: z.string().max(160),
});

const ORACLE_SYSTEM_PROMPT = `You are SpaghettiOracle, an expert model router for a chat application.

Pick the single best model for the user's LATEST message. Prior conversation is context only.

Models (return exact modelId):

- poolside/laguna-xs.2:free — code, debugging, refactors, APIs, scripts, configs, devops, implementation
- openai/gpt-oss-20b:free — everyday Q&A, explanations, summaries, casual chat, general knowledge
- nex-agi/nex-n2-pro:free — creative writing, brainstorming, storytelling, conversational tone
- google/gemma-4-31b-it:free — vision / image understanding ONLY
- nvidia/nemotron-3-nano-30b-a3b:free — math, logic puzzles, proofs, step-by-step reasoning, comparing options
- openai/gpt-oss-120b:free — exceptionally complex multi-step analysis only; avoid for routine tasks

Rules:
- Match specialty models when the request clearly fits; do not default everything to 20b.
- Coding → Laguna. Creative → Nex. Math/logic → Nemotron. Vision → Gemma. Hard research → 120b.
- Use 20b for ordinary questions with no strong specialty signal.
- Vary choices across a conversation when task types differ.
- In reason, cite the specific signal from the user message (e.g. "code request", "creative poem", "math proof").`;

const CODING_PATTERN =
  /\b(code|coding|debug|refactor|implement|function|class|api|script|typescript|javascript|python|rust|sql|regex|npm|docker|git|compile|syntax|error|stack trace|bug)\b/i;
const CREATIVE_PATTERN =
  /\b(poem|story|song|lyrics|creative|brainstorm|write me a|fiction|character|plot|haiku|novel)\b/i;
const REASONING_PATTERN =
  /\b(prove|proof|calculate|equation|math|logic|puzzle|riddle|step by step|analyze|compare|evaluate|theorem|probability|derivative|integral)\b/i;

function getFriendlyName(modelId: string): string {
  return chatModels.find((m) => m.id === modelId)?.name ?? modelId;
}

function getFallback(reason: string): OracleResult {
  return {
    id: ORACLE_FALLBACK_MODEL,
    friendlyName: getFriendlyName(ORACLE_FALLBACK_MODEL),
    reason,
    method: "fallback",
  };
}

function extractTextFromMessage(message: ModelMessage): string {
  if (typeof message.content === "string") {
    return message.content;
  }
  if (!Array.isArray(message.content)) {
    return "";
  }
  return message.content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }
      if (
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string"
      ) {
        return part.text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

export function extractLatestUserText(messages: ModelMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      return extractTextFromMessage(messages[i]).trim();
    }
  }
  return "";
}

export function analyzeOracleSignals(
  messages: ModelMessage[]
): OracleSignals {
  const latestUserText = extractLatestUserText(messages);
  const coding = CODING_PATTERN.test(latestUserText) ? 1 : 0;
  const creative = CREATIVE_PATTERN.test(latestUserText) ? 1 : 0;
  const reasoning = REASONING_PATTERN.test(latestUserText) ? 1 : 0;
  const vision = messageHasImages(messages);

  let heuristicSuggestion: string | null = null;
  if (vision) {
    heuristicSuggestion = "google/gemma-4-31b-it:free";
  } else if (coding && !creative) {
    heuristicSuggestion = "poolside/laguna-xs.2:free";
  } else if (creative && !coding) {
    heuristicSuggestion = "nex-agi/nex-n2-pro:free";
  } else if (reasoning && !coding) {
    heuristicSuggestion = "nvidia/nemotron-3-nano-30b-a3b:free";
  }

  return {
    coding,
    creative,
    reasoning,
    vision,
    latestUserText,
    heuristicSuggestion,
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

function logOracleDecision(payload: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      tag: "SpaghettiOracle",
      routerModel: ORACLE_ROUTER_MODEL,
      ...payload,
    })
  );
}

export async function resolveSpaghettiOracle(
  messages: ModelMessage[]
): Promise<OracleResult> {
  const startedAt = Date.now();
  const signals = analyzeOracleSignals(messages);

  if (!messages || messages.length === 0) {
    const result = getFallback("No messages to route");
    logOracleDecision({
      method: result.method,
      modelId: result.id,
      reason: result.reason,
      signals,
      durationMs: Date.now() - startedAt,
    });
    return result;
  }

  if (signals.vision) {
    const visionModel = "google/gemma-4-31b-it:free";
    const result: OracleResult = {
      id: visionModel,
      friendlyName: getFriendlyName(visionModel),
      reason: "Image or vision content detected in message",
      method: "vision",
    };
    logOracleDecision({
      method: result.method,
      modelId: result.id,
      reason: result.reason,
      signals,
      durationMs: Date.now() - startedAt,
    });
    return result;
  }

  try {
    const oracleModel = getLanguageModel(ORACLE_ROUTER_MODEL);
    const recent = messages.slice(-8);

    const { object } = await generateObject({
      model: oracleModel,
      schema: oracleDecisionSchema,
      system: ORACLE_SYSTEM_PROMPT,
      messages: recent,
      maxOutputTokens: 160,
      temperature: 0.5,
    });

    const result: OracleResult = {
      id: object.modelId,
      friendlyName: getFriendlyName(object.modelId),
      reason: object.reason,
      method: "llm",
    };

    logOracleDecision({
      method: result.method,
      modelId: result.id,
      reason: result.reason,
      signals,
      heuristicSuggestion: signals.heuristicSuggestion,
      heuristicAgrees: signals.heuristicSuggestion === result.id,
      promptPreview: signals.latestUserText.slice(0, 200),
      durationMs: Date.now() - startedAt,
    });

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const result = getFallback(`Router error: ${message}`);
    logOracleDecision({
      method: result.method,
      modelId: result.id,
      reason: result.reason,
      signals,
      error: message,
      durationMs: Date.now() - startedAt,
    });
    return result;
  }
}
