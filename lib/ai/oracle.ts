import { generateText, type ModelMessage } from "ai";
import { DEFAULT_CHAT_MODEL, chatModels } from "./models";
import { getLanguageModel } from "./providers";

export type OracleResult = {
  id: string;
  friendlyName: string;
};

// Friendly aliases -> canonical
const MODEL_ID_MAP: Record<string, { id: string; friendlyName: string }> = {
  // Exact ids
  "openai/gpt-oss-120b:free": { id: "openai/gpt-oss-120b:free", friendlyName: "gpt-oss-120b" },
  "poolside/laguna-xs.2:free": { id: "poolside/laguna-xs.2:free", friendlyName: "Laguna XS.2" },
  "nex-agi/nex-n2-pro:free": { id: "nex-agi/nex-n2-pro:free", friendlyName: "Nex-N2-Pro" },
  "openai/gpt-oss-20b:free": { id: "openai/gpt-oss-20b:free", friendlyName: "gpt-oss-20b" },
  "google/gemma-4-31b-it:free": { id: "google/gemma-4-31b-it:free", friendlyName: "Gemma 4 31B" },
  "nvidia/nemotron-3-nano-30b-a3b:free": { id: "nvidia/nemotron-3-nano-30b-a3b:free", friendlyName: "Nemotron 3 Nano 30B A3B" },

  // Common friendly names / aliases (case-insensitive keys stored lower)
  "laguna": { id: "poolside/laguna-xs.2:free", friendlyName: "Laguna XS.2" },
  "laguna xs.2": { id: "poolside/laguna-xs.2:free", friendlyName: "Laguna XS.2" },
  "laguna-xs.2": { id: "poolside/laguna-xs.2:free", friendlyName: "Laguna XS.2" },
  "nex-n2-pro": { id: "nex-agi/nex-n2-pro:free", friendlyName: "Nex-N2-Pro" },
  "nex n2 pro": { id: "nex-agi/nex-n2-pro:free", friendlyName: "Nex-N2-Pro" },
  "nexn2pro": { id: "nex-agi/nex-n2-pro:free", friendlyName: "Nex-N2-Pro" },
  "gpt-oss-120b": { id: "openai/gpt-oss-120b:free", friendlyName: "gpt-oss-120b" },
  "gpt oss 120b": { id: "openai/gpt-oss-120b:free", friendlyName: "gpt-oss-120b" },
  "gpt-oss-20b": { id: "openai/gpt-oss-20b:free", friendlyName: "gpt-oss-20b" },
  "gemma": { id: "google/gemma-4-31b-it:free", friendlyName: "Gemma 4 31B" },
  "gemma 4": { id: "google/gemma-4-31b-it:free", friendlyName: "Gemma 4 31B" },
  "nemotron": { id: "nvidia/nemotron-3-nano-30b-a3b:free", friendlyName: "Nemotron 3 Nano 30B A3B" },

  // Placeholder aliases mentioned in planning (map to closest available)
  "owl": { id: "poolside/laguna-xs.2:free", friendlyName: "Laguna XS.2" },
  "owl alpha": { id: "nex-agi/nex-n2-pro:free", friendlyName: "Nex-N2-Pro" },
};

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/^["'`]+|["'`]+$/g, "");
}

function resolveFromMap(raw: string): OracleResult | null {
  const key = normalizeKey(raw);
  if (MODEL_ID_MAP[key]) {
    return MODEL_ID_MAP[key];
  }
  // Try direct id match (case sensitive original list)
  const direct = MODEL_ID_MAP[raw];
  if (direct) return direct;
  // Try matching any id that includes the key
  for (const m of chatModels) {
    if (m.id.toLowerCase() === key || m.name.toLowerCase() === key) {
      return { id: m.id, friendlyName: m.name };
    }
  }
  return null;
}

const ORACLE_SYSTEM_PROMPT = `You are SpaghettiOracle, an expert model router for a chat application.

Your ONLY job is to pick the single best model for the user's latest request.

Available models (use the EXACT full slug on the left):

- openai/gpt-oss-120b:free
- poolside/laguna-xs.2:free
- nex-agi/nex-n2-pro:free
- openai/gpt-oss-20b:free
- google/gemma-4-31b-it:free
- nvidia/nemotron-3-nano-30b-a3b:free

Rules:
- Output ONLY the exact full slug of the chosen model.
- No explanations, no quotes, no markdown, no extra words.
- If the query is about coding, implementation, debugging, or structured work → prefer poolside/laguna-xs.2:free
- If the query benefits from strong general reasoning or long context → prefer openai/gpt-oss-120b:free
- If the query is simple or needs speed → prefer openai/gpt-oss-20b:free or nex-agi/nex-n2-pro:free
- If the user asks for image understanding / vision → prefer google/gemma-4-31b-it:free or nex-agi/nex-n2-pro:free
- Always return one of the exact slugs listed above.`;

export async function resolveSpaghettiOracle(
  messages: ModelMessage[]
): Promise<OracleResult> {
  // Fallback in case something goes wrong
  const fallback: OracleResult = {
    id: DEFAULT_CHAT_MODEL,
    friendlyName:
      chatModels.find((m) => m.id === DEFAULT_CHAT_MODEL)?.name ??
      "gpt-oss-120b",
  };

  if (!messages || messages.length === 0) {
    return fallback;
  }

  try {
    // Use a fast, cheap model for routing decisions
    const oracleModel = getLanguageModel("openai/gpt-oss-20b:free");

    // Take a bounded window of recent messages for context
    const recent = messages.slice(-8);

    const { text } = await generateText({
      model: oracleModel,
      system: ORACLE_SYSTEM_PROMPT,
      messages: recent,
      maxOutputTokens: 16,
      temperature: 0.1,
    });

    const raw = (text || "").trim();
    console.log("[SpaghettiOracle] raw decision:", JSON.stringify(raw));

    // Try exact map resolution first
    const mapped = resolveFromMap(raw);
    if (mapped) {
      console.log("[SpaghettiOracle] routed to", mapped.id, `(${mapped.friendlyName})`);
      return mapped;
    }

    // Try to find an id that appears in the raw output
    for (const m of chatModels) {
      if (raw.includes(m.id)) {
        console.log("[SpaghettiOracle] routed (substring) to", m.id);
        return { id: m.id, friendlyName: m.name };
      }
    }

    // Last attempt: see if any friendly name is contained
    for (const m of chatModels) {
      if (raw.toLowerCase().includes(m.name.toLowerCase())) {
        return { id: m.id, friendlyName: m.name };
      }
    }

    console.warn("[SpaghettiOracle] could not parse, falling back");
    return fallback;
  } catch (err) {
    console.error("[SpaghettiOracle] error during routing, using fallback:", err);
    return fallback;
  }
}
