import { generateText } from "ai";
import { getLanguageModel } from "./providers";
import { chatModels, type ChatModel } from "./models";
import type { CoreMessage } from "ai";

// The fast decider model (high throughput, cheap, good at classification)
const DECIDER_MODEL_ID = "nvidia/nemotron-3-nano-30b-a3b:free" as const;

// Valid real model IDs that the oracle can route to (exclude itself)
const VALID_TARGET_MODELS = new Set(
  chatModels
    .map((m: ChatModel) => m.id)
    .filter((id: string) => id !== "spaghetti-oracle")
);

const ROUTER_SYSTEM_PROMPT = `You are an expert model router for a free-tier AI chat app.

Your job is to analyze the user's request and choose the SINGLE best model from the list below for the task.

Available models:
- openai/gpt-oss-120b:free → General purpose, good default
- poolside/laguna-xs.2:free → Best for coding, debugging, agentic tasks, building apps
- nex-agi/nex-n2-pro:free → Strong reasoning, multi-step planning, balanced
- openai/gpt-oss-20b:free → Fast general purpose
- google/gemma-4-31b-it:free → Good with images/vision + general
- nvidia/nemotron-3-nano-30b-a3b:free → Very fast, lightweight tasks

Rules:
- For coding, writing code, debugging, refactoring → choose poolside/laguna-xs.2:free
- For deep research, long documents, complex analysis → choose openai/gpt-oss-120b:free
- For planning, step-by-step reasoning, decisions → choose nex-agi/nex-n2-pro:free
- For quick questions, summaries, simple creative → choose nvidia/nemotron-3-nano-30b-a3b:free or openai/gpt-oss-20b:free
- If the user mentions images or vision → prefer google/gemma-4-31b-it:free

Respond with EXACTLY this format (no extra text, no markdown):
Model: <exact model id from the list above>
Reason: <one short sentence explaining why>
`;

export async function resolveSpaghettiOracle(
  messages: CoreMessage[]
): Promise<string> {
  try {
    // Get the last user message content
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    let promptContent = "General question";

    if (lastUserMsg) {
      if (typeof lastUserMsg.content === "string") {
        promptContent = lastUserMsg.content;
      } else if (Array.isArray(lastUserMsg.content)) {
        promptContent = lastUserMsg.content
          .map((part: any) => (typeof part === "string" ? part : part.text || ""))
          .join(" ");
      }
    }

    const deciderModel = getLanguageModel(DECIDER_MODEL_ID);

    const { text } = await generateText({
      model: deciderModel,
      system: ROUTER_SYSTEM_PROMPT,
      prompt: `User request: ${promptContent}

Choose the best model and respond in the exact format specified.`,
      maxTokens: 80,
      temperature: 0.1,
    });

    // Parse "Model: xxx" line (case insensitive, tolerant)
    const modelMatch = text.match(/Model:\s*([\w\/\-:.]+)/i);
    let chosen = modelMatch?.[1]?.trim();

    if (!chosen || !VALID_TARGET_MODELS.has(chosen)) {
      chosen = "openai/gpt-oss-120b:free";
    }

    return chosen;
  } catch (error) {
    console.error("[SpaghettiOracle] Resolution failed, using fallback:", error);
    return "openai/gpt-oss-120b:free";
  }
}
