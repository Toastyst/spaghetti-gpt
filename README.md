<a href="https://chatbot.ai-sdk.dev/demo">
  <img alt="Chatbot" src="app/(chat)/opengraph-image.png">
  <h1 align="center">Spaghetti-GPT</h1>
</a>

<p align="center">
    Spaghetti-GPT is a customized, detemplated version of the Vercel AI Chatbot template. Built with Next.js, AI SDK, shadcn/ui, and integrated for SpaghettiStories / personal AI agent use cases.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Status

**Vercel Deployment**: Connected to this repo. Latest code (detemplated chatbot) is being deployed. Production URL: https://spaghetti-gpt-ethansnapp-9725s-projects.vercel.app (or custom domain).

## Features

- Next.js App Router with React Server Components
- AI SDK for multi-provider LLM support (OpenRouter, OpenAI, xAI/Grok, etc.)
- shadcn/ui + Tailwind
- Auth.js for authentication (guest + more)
- Drizzle + Vercel Postgres for persistence
- Vercel Blob for file uploads
- Custom model configs in lib/ai/models.ts

## Deployment on Vercel

This project is linked to Vercel GitHub integration for automatic deploys on push to `main`.

To manually trigger or check:
- Go to Vercel dashboard > Projects > spaghetti-gpt
- Or use connected tools to redeploy.

## Environment Setup (for full functionality)

Required Vercel integrations (add via dashboard):
1. **Vercel Postgres** - Create database, attach to project, run migrations (`pnpm db:migrate` or equivalent).
2. **Vercel Blob** - Enable storage, set `BLOB_READ_WRITE_TOKEN`.
3. **Vercel KV / Redis** (if used for caching/sessions).
4. **AI Gateway** (recommended for unified access) - Enable in project settings.

Set these in Vercel Project Settings > Environment Variables:
- `AUTH_SECRET` (generate with `openssl rand -base64 32`)
- Provider keys: `OPENROUTER_API_KEY` or `OPENAI_API_KEY`, etc. (or rely on AI Gateway + OIDC)
- `VERCEL_AI_GATEWAY_ENABLED=true` (optional)
- Database and storage URLs from integrations.

## Running locally

Copy `.env.example` to `.env.local`, fill keys, `pnpm install`, `pnpm dev`.

> Customized from Vercel Chatbot template for Spaghetti-GPT use case (June 2026).
