// Focused list of free / high-quality OpenRouter models for testing
// Restricted to the 6 models requested to reduce bugs and only enable image support where supported

export const DEFAULT_CHAT_MODEL = "openai/gpt-oss-120b:free";

export const titleModel = {
  id: "openai/gpt-oss-120b:free",
  name: "gpt-oss-120b (Free)",
  provider: "openai",
  description: "Large open-source model via free tier",
};

export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  isFree?: boolean;
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
};

export function getDefaultCapabilities(model: ChatModel): ModelCapabilities {
  const visionModels = new Set([
    "google/gemma-4-31b-it:free",
    "nex-agi/nex-n2-pro:free",
  ]);

  return {
    tools: true,
    vision: visionModels.has(model.id),
    reasoning: false,
  };
}

// Exactly the 6 models from the provided screenshot (restricted list)
export const chatModels: ChatModel[] = [
  {
    id: "openai/gpt-oss-120b:free",
    name: "gpt-oss-120b",
    provider: "openai",
    description: "Large open-source model (free)",
    isFree: true,
  },
  {
    id: "poolside/laguna-xs.2:free",
    name: "Laguna XS.2",
    provider: "poolside",
    description: "Poolside model (free)",
    isFree: true,
  },
  {
    id: "nex-agi/nex-n2-pro:free",
    name: "Nex-N2-Pro",
    provider: "nex-agi",
    description: "Nex AGI model (free)",
    isFree: true,
  },
  {
    id: "openai/gpt-oss-20b:free",
    name: "gpt-oss-20b",
    provider: "openai",
    description: "Smaller open-source model (free)",
    isFree: true,
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B",
    provider: "google",
    description: "Google Gemma 4 (free) — supports images",
    isFree: true,
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    name: "Nemotron 3 Nano 30B A3B",
    provider: "nvidia",
    description: "NVIDIA Nemotron (free)",
    isFree: true,
  },
  // === Spaghetti Oracle - Smart Router ===
  {
    id: "spaghetti-oracle",
    name: "Spaghetti Oracle",
    provider: "spaghetti",
    description: "Intelligent router that analyzes your prompt and automatically selects the best free model for the task (Laguna for coding/agentic, Nemotron for reasoning, Nex for creative, 20b for everyday Q&A, 120b for hard problems). Uses Owl Alpha as the routing decider. Best for complex or long sessions.",
    isFree: true,
  },
];

export async function getCapabilities(): Promise<
  Record<string, ModelCapabilities>
> {
  return Object.fromEntries(
    chatModels.map((model) => [model.id, getDefaultCapabilities(model)])
  );
}

export const isDemo = process.env.IS_DEMO === "1";

export type GatewayModelWithCapabilities = ChatModel & {
  capabilities: ModelCapabilities;
};

export async function getAllGatewayModels(): Promise<
  GatewayModelWithCapabilities[]
> {
  return chatModels.map((model) => ({
    ...model,
    capabilities: getDefaultCapabilities(model),
  }));
}

export function getActiveModels(): ChatModel[] {
  return chatModels;
}

export const allowedModelIds = new Set(chatModels.map((m) => m.id));

export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);
