import { customProvider } from "ai";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { createOpenAI } from '@ai-sdk/openai';
import { isTestEnvironment } from "../constants";
import { titleModel } from "./models";

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

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
  // Always use OpenRouter in this deployment. Fail fast if the key is missing.
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
