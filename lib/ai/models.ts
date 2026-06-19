import { type ChatModel } from './types'; // adjust if needed

// ... existing code ...

// Added Spaghetti Oracle
chatModels.push({
  id: 'spaghetti-oracle',
  name: 'Spaghetti Oracle',
  provider: 'custom',
  description: 'Intelligent router that uses a fast decider (Nemotron Nano) to pick the best free model for your specific prompt from the big boys: Owl Alpha for long research, Laguna for coding, Nemotron for reasoning, etc. + optional ensemble for critical steps.',
  isFree: true,
});

// Update allowedModelIds
allowedModelIds.add('spaghetti-oracle');

// Update DEFAULT if you want, or keep existing
// DEFAULT_CHAT_MODEL = 'spaghetti-oracle'; // optional

console.log('Spaghetti Oracle model added successfully');