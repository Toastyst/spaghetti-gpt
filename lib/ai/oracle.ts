import { generateText } from "ai";
import { getLanguageModel } from "./providers";
import { chatModels, type ChatModel } from "./models";

// The fast decider model (high throughput)
const DECIDER_MODEL_ID = "nvidia/nemotron-3-nano-30b-a3b:free" as const;

// Mapping from friendly/short names (what the LLM might output) to exact OpenRouter model IDs
const MODEL_ID_MAP: Record<string, string> = {
  // Friendly names that might come from LLM
  "Nex-N2-Pro": "nex-agi/nex-n2-pro:free",
  "Nex N2 Pro": "nex-agi/nex-n2-pro:free",
  "nex-n2-pro": "nex-agi/nex-n2-pro:free",
  "Laguna": "poolside/laguna-xs.2:free",
  "Laguna XS.2": "poolside/laguna-xs.2:free",
  "Laguna M.1": "poolside/laguna-xs.2:free",
  "Owl Alpha": "openai/gpt-oss-120b:free",
  "Owl": "openai/gpt-oss-120b:free",
  "Nemotron 3 Ultra": "openai/gpt-oss-120b:free", // fallback to strong one
  "Nemotron 3 Super": "openai/gpt-oss-120b:free",
  "Nemotron Ultra": "openai/gpt-oss-120b:free",
  "Nemotron Nano": "nvidia/nemotron-3-nano-30b-a3b:free",
  "Nano": "nvidia/nemotron-3-nano-30b-a3b:free",
  "Gemma 4 31B": "google/gemma-4-31b-it:free",
  "Gemma": "google/gemma-4-31b-it:free",
  // Direct full IDs (in case LLM outputs them correctly)
  "nex-agi/nex-n2-pro:free": "nex-agi/nex-n2-pro:free",
  "poolside/laguna-xs.2:free": "poolside/laguna-xs.2:free",
  "openai/gpt-oss-120b:free": "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free": "openai/gpt-oss-20b:free",
  "google/gemma-4-31b-it:free": "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-nano-30b-a3b:free": "nvidia/nemotron-3-nano-30b-a3b:free",
};

// Safe default that almost always has endpoints
const SAFE_DEFAULT = "openai/gpt-oss-120b:free";

const ROUTER_SYSTEM_PROMPT = `You are an expert model router for a free AI chat system called Spaghetti-gpt.

Your job is to pick the SINGLE best model for the user's request from the list below.

You MUST output the EXACT full model ID string exactly as shown below. Do not shorten it, do not use friendly names.

Available models (use these exact strings):
- openai/gpt-oss-120b:free
- poolside/laguna-xs.2:free
- nex-agi/nex-n2-pro:free
- openai/gpt-oss-20b:free
- google/gemma-4-31b-it:free
- nvidia/nemotron-3-nano-30b-a3b:free

Decision rules:
- Coding, writing code, debugging, refactoring, building apps or tools → poolside/laguna-xs.2:free
- Long research, analyzing long documents or books, very large context → openai/gpt-oss-120b:free
- Complex planning, multi-step reasoning, strategic decisions → nex-agi/nex-n2-pro:free
- Quick questions, short summaries, simple creative writing, high volume of fast replies → nvidia/nemotron-3-nano-30b-a3b:free or openai/gpt-oss-20b:free
- Anything involving images or vision → google/gemma-4-31b-it:free

Respond with ONLY this exact line, nothing else before or after:
Model: <one of the exact model IDs listed above>
`;

export async function resolveSpaghettiOracle(messages: any[]): Promise<string> {
  try {
    // Extract last user message
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    let userPrompt = 'General request';
    if (lastUser) {
      if (typeof lastUser.content === 'string') {
        userPrompt = lastUser.content.slice(0, 800);
      } else if (Array.isArray(lastUser.content)) {
        userPrompt = lastUser.content.map(p => p.text || '').join(' ').slice(0, 800);
      }
    }

    const decider = getLanguageModel(DECIDER_MODEL_ID);

    const { text } = await generateText({
      model: decider,
      system: ROUTER_SYSTEM_PROMPT,
      prompt: `Current user request:\n${userPrompt}\n\nChoose the best model and output exactly in the required format.`,
      maxTokens: 50,
      temperature: 0.1,
    });

    // Parse the Model: line
    const match = text.match(/Model:\s*([\w\/\-:.@]+)/i);
    let raw = match ? match[1].trim() : '';

    // Map to full ID if it's a friendly/short name
    let chosen = MODEL_ID_MAP[raw] || raw;

    // Final validation: must be one of the real IDs in chatModels
    const isValid = chatModels.some(m => m.id === chosen);

    if (!isValid) {
      console.warn(`[Oracle] Invalid or unavailable model chosen: ${raw} -> ${chosen}. Falling back.`);
      chosen = SAFE_DEFAULT;
    }

    console.log(`[Spaghetti Oracle] Routed to: ${chosen} (raw LLM output: ${raw})`);
    return chosen;

  } catch (err) {
    console.error('[Spaghetti Oracle] Resolution error, using safe default:', err);
    return SAFE_DEFAULT;
  }
}
