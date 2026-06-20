import { generateText } from "ai";
import { getLanguageModel } from "./providers";
import { chatModels } from "./models";

// The fast decider model (high throughput)
const DECIDER_MODEL_ID = "nvidia/nemotron-3-nano-30b-a3b:free" as const;

// Mapping from friendly/short names → { id, friendlyName }
const MODEL_MAP: Record<string, { id: string; friendlyName: string }> = {
  "Nex-N2-Pro": { id: "nex-agi/nex-n2-pro:free", friendlyName: "Nex-N2-Pro" },
  "Nex N2 Pro": { id: "nex-agi/nex-n2-pro:free", friendlyName: "Nex-N2-Pro" },
  "nex-n2-pro": { id: "nex-agi/nex-n2-pro:free", friendlyName: "Nex-N2-Pro" },
  "Laguna": { id: "poolside/laguna-xs.2:free", friendlyName: "Laguna XS.2" },
  "Laguna XS.2": { id: "poolside/laguna-xs.2:free", friendlyName: "Laguna XS.2" },
  "Laguna M.1": { id: "poolside/laguna-xs.2:free", friendlyName: "Laguna XS.2" },
  "Owl Alpha": { id: "openai/gpt-oss-120b:free", friendlyName: "Owl Alpha" },
  "Owl": { id: "openai/gpt-oss-120b:free", friendlyName: "Owl Alpha" },
  "Nemotron 3 Ultra": { id: "openai/gpt-oss-120b:free", friendlyName: "Owl Alpha" },
  "Nemotron 3 Super": { id: "openai/gpt-oss-120b:free", friendlyName: "Owl Alpha" },
  "Nemotron Ultra": { id: "openai/gpt-oss-120b:free", friendlyName: "Owl Alpha" },
  "Nemotron Nano": { id: "nvidia/nemotron-3-nano-30b-a3b:free", friendlyName: "Nemotron Nano" },
  "Nano": { id: "nvidia/nemotron-3-nano-30b-a3b:free", friendlyName: "Nemotron Nano" },
  "Gemma 4 31B": { id: "google/gemma-4-31b-it:free", friendlyName: "Gemma 4 31B" },
  "Gemma": { id: "google/gemma-4-31b-it:free", friendlyName: "Gemma 4 31B" },
  // Direct full IDs
  "nex-agi/nex-n2-pro:free": { id: "nex-agi/nex-n2-pro:free", friendlyName: "Nex-N2-Pro" },
  "poolside/laguna-xs.2:free": { id: "poolside/laguna-xs.2:free", friendlyName: "Laguna XS.2" },
  "openai/gpt-oss-120b:free": { id: "openai/gpt-oss-120b:free", friendlyName: "Owl Alpha" },
  "openai/gpt-oss-20b:free": { id: "openai/gpt-oss-20b:free", friendlyName: "gpt-oss-20b" },
  "google/gemma-4-31b-it:free": { id: "google/gemma-4-31b-it:free", friendlyName: "Gemma 4 31B" },
  "nvidia/nemotron-3-nano-30b-a3b:free": { id: "nvidia/nemotron-3-nano-30b-a3b:free", friendlyName: "Nemotron Nano" },
};

const SAFE_DEFAULT = { id: "openai/gpt-oss-120b:free", friendlyName: "Owl Alpha" };

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

export async function resolveSpaghettiOracle(messages: any[]): Promise<{ id: string; friendlyName: string }> {
  try {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    let userPrompt = 'General request';

    if (lastUser) {
      if (typeof lastUser.content === 'string') {
        userPrompt = lastUser.content.slice(0, 800);
      } else if (Array.isArray(lastUser.content)) {
        userPrompt = lastUser.content
          .map((p: any) => p.text || '')
          .join(' ')
          .slice(0, 800);
      }
    }

    const decider = getLanguageModel(DECIDER_MODEL_ID);

    const { text } = await generateText({
      model: decider,
      system: ROUTER_SYSTEM_PROMPT,
      prompt: `Current user request:\n${userPrompt}\n\nChoose the best model and output exactly in the required format.`,
      maxOutputTokens: 50,
      temperature: 0.1,
    });

    const match = text.match(/Model:\s*([\w\/\-:.@]+)/i);
    let raw = match ? match[1].trim() : '';

    const mapped = MODEL_MAP[raw] || MODEL_MAP[Object.keys(MODEL_MAP).find(k => raw.includes(k)) || ''];
    let result = mapped || SAFE_DEFAULT;

    // Final validation
    const isValid = chatModels.some(m => m.id === result.id);
    if (!isValid) {
      console.warn(`[Oracle] Invalid model chosen: ${raw}. Falling back.`);
      result = SAFE_DEFAULT;
    }

    console.log(`[Spaghetti Oracle] Routed to: ${result.friendlyName} (${result.id})`);
    return result;

  } catch (err) {
    console.error('[Spaghetti Oracle] Resolution error, using safe default:', err);
    return SAFE_DEFAULT;
  }
}
