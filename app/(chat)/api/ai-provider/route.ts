import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';

export async function GET() {
  const modelId = DEFAULT_CHAT_MODEL;
  const hasOpenrouter = Boolean(process.env.OPENROUTER_API_KEY);
  const usesOpenrouter =
    hasOpenrouter || modelId.includes(':free') || modelId.startsWith('google/gemma');

  const body = {
    provider: usesOpenrouter ? 'openrouter' : 'vercel-gateway',
    hasOpenrouter,
    modelId,
  };

  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
}
