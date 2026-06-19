import { getLanguageModel } from "./providers";
import { chatModels } from "./models";

// The fast decider model (high throughput, cheap, good at classification)
const DECIDER_MODEL_ID = "nvidia/nemotron-3-nano-30b-a3b:free";

// Valid real model IDs that the oracle can route to (exclude itself)
const VALID_TARGET_MODELS = chatModels
  .map(m => m.id)
  .filter(id => id !== "spaghetti-oracle");

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

Respond with EXACTLY this format (no extra text):
Model: <exact model id from the list above>
Reason: <one short sentence explaining why>
`;

export async function resolveSpaghettiOracle(
  messages: any[]
): Promise<string> {
  try {
    // Extract the latest user message for decision making
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    const promptContent =
      typeof lastUserMessage?.content === "string"
        ? lastUserMessage.content
        : lastUserMessage?.parts?.map((p: any) => p.text || "").join(" ") || "General question";

    const deciderModel = getLanguageModel(DECIDER_MODEL_ID);

    const { text } = await import("ai").then(({ generateText }) =>
      generateText({
        model: deciderModel,
        system: ROUTER_SYSTEM_PROMPT,
        prompt: `User request: ${promptContent}

Choose the best model and respond in the exact format specified.`,
        maxTokens: 100,
        temperature: 0.1,
      })
    );

    // Parse the Model: line
    const modelMatch = text.match(/Model:\s*(.+)/i);
    let chosen = modelMatch?.[1]?.trim();

    // Validate
    if (!chosen || !VALID_TARGET_MODELS.includes(chosen)) {
      // Fallback to a strong default
      chosen = "openai/gpt-oss-120b:free";
    }

    return chosen;
  } catch (error) {
    console.error("[SpaghettiOracle] Resolution failed:", error);
    return "openai/gpt-oss-120b:free"; // safe fallback
  }
}
