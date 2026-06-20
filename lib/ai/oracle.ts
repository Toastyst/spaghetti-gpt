import { generateText } from 'ai';
import { getLanguageModel } from './providers';
import { chatModels, type ChatModel } from './models';

// The fast decider model (high throughput, cheap, good at classification)
const DECIDER_MODEL_ID = 'nvidia/nemotron-3-nano-30b-a3b:free' as const;

const ROUTER_SYSTEM_PROMPT = `You are an expert routing assistant for Spaghetti-gpt.
Your only job is to choose the single best free model from this list for the user's current request:

- Owl Alpha → long research, massive context, huge documents, long sessions
- Laguna M.1 or Laguna XS.2 → coding, debugging, building apps, agentic tasks
- Nemotron 3 Ultra or Nemotron 3 Super → deep reasoning, planning, complex analysis
- Nex-N2-Pro → balanced strong reasoning + speed, multi-step tasks
- Nemotron Nano or Gemma 4 31B → quick answers, summaries, simple creative, high volume

Respond with ONLY this exact format:
Model: [exact model name from the list above]
Reason: [one short sentence why this model is best]`;

export async function resolveSpaghettiOracle(messages: any[]) {
  try {
    const lastUserMessage = messages[messages.length - 1]?.content || messages.toString();

    const { text } = await generateText({
      model: getLanguageModel(DECIDER_MODEL_ID),
      system: ROUTER_SYSTEM_PROMPT,
      prompt: `Current user request: ${lastUserMessage}\n\nChoose the best model.`,
    });

    const modelMatch = text.match(/Model:\s*(\S.+?)(?=\n|$)/i);
    const chosenModel = modelMatch ? modelMatch[1].trim() : 'Nex-N2-Pro';

    // Validate against known good free models
    const validModels = ['Owl Alpha', 'Laguna M.1', 'Laguna XS.2', 'Nemotron 3 Ultra', 'Nemotron 3 Super', 'Nex-N2-Pro', 'Nemotron Nano', 'Gemma 4 31B'];
    const finalModel = validModels.some(m => chosenModel.includes(m)) ? chosenModel : 'Nex-N2-Pro';

    console.log(`[Spaghetti Oracle] Routed to: ${finalModel}`);
    return finalModel;

  } catch (error) {
    console.error('[Spaghetti Oracle] Error:', error);
    return 'Nex-N2-Pro'; // safe default
  }
}
