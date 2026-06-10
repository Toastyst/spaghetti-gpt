// Focused list of free / high-quality OpenRouter models for testing
export const DEFAULT_CHAT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

export const titleModel = {
  id: "meta-llama/llama-3.3-70b-instruct:free",
  name: "Llama 3.3 70B (Free)",
  provider: "meta-llama",
  description: "Fast and capable free model for titles",
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
  return {
    tools: true,
    vision: false,
    reasoning: false,
  };
}

// Curated list of free models on OpenRouter (easy to extend)
export const chatModels: ChatModel[] = [
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B",
    provider: "meta-llama",
    description: "Excellent general-purpose free model",
    isFree: true,
  },
  {
    id: "google/gemma-3-27b-it:free",
    name: "Gemma 3 27B",
    provider: "google",
    description: "Strong free Google model",
    isFree: true,
  },
  {
    id: "qwen/qwen2.5-72b-instruct:free",
    name: "Qwen2.5 72B",
    provider: "qwen",
    description: "Very capable free Chinese model",
    isFree: true,
  },
  {
    id: "mistralai/mistral-nemo:free",
    name: "Mistral Nemo",
    provider: "mistralai",
    description: "Lightweight but strong free model",
    isFree: true,
  },
  {
    id: "openai/gpt-oss-120b:free",
    name: "GPT OSS 120B (Free)",
    provider: "openai",
    description: "Large open-source model via free tier",
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
