import { customProvider, gateway } from "ai";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { createOpenAI } from '@ai-sdk/openai';
import { isTestEnvironment } from "../constants";
import { titleModel } from "./models";

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

// Detect AI Gateway usage (via OIDC token from `vercel env pull`, explicit key, or flag)
export const useAiGateway =
  !!process.env.VERCEL_OIDC_TOKEN ||
  !!process.env.AI_GATEWAY_API_KEY ||
  process.env.VERCEL_AI_GATEWAY_ENABLED === "true";

export const myProvider = isTestEnvironment
  ? (() => {
      const { chatModel, titleModel } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": titleModel,
        },
      });
    })()
  : null;

export function getLanguageModel(modelId: string): LanguageModelV3 {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  // Always use direct OpenRouter for the current free-tier model list
  // (the free models like "openai/gpt-oss-120b:free" are not available via standard AI Gateway).
  // AI Gateway is used selectively for tools (e.g. web search) below.
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Configure it in your Vercel project environment variables."
    );
  }

  return openrouter(modelId);
}

export function getTitleModel(): LanguageModelV3 {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Configure it in your Vercel project environment variables."
    );
  }

  return openrouter(titleModel.id);
}

/**
 * Returns AI Gateway tools (e.g. web search) when Gateway is available.
 * This lets you keep using your free OpenRouter models for the main LLM
 * while getting premium tools like Perplexity web search via Gateway's $5/month free tier.
 */
export function getAiGatewayTools() {
  if (!useAiGateway) return {};

  return {
    // Web search tool powered by Perplexity via AI Gateway.
    // Very useful for agentic behavior. Uses AI Gateway credits ($5 free per team per month).
    // Named differently from the free SearXNG webSearch so both can be available.
    webSearchGateway: gateway.tools.perplexitySearch(),
  };
}
