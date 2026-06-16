import { tool } from "ai";
import { z } from "zod";

/**
 * Web search tool.
 *
 * Primary (free/private): self-hosted SearXNG (set SEARXNG_URL).
 * Fallback (when AI Gateway enabled): use the separate webSearchGateway tool (Perplexity).
 *
 * After getting results, use the `browsePage` tool on promising URLs for full page "extract".
 *
 * Recommended self-host: Run SearXNG on Railway, Fly.io, or a cheap VPS.
 */
export const webSearch = tool({
  description:
    "Search the web for up-to-date information. Use this for current events, recent facts, research, prices, or anything that may have changed. Returns a list of results with title, url, and content snippet. " +
    "After search, follow up with browsePage on the best URLs to get full content (extract).",
  inputSchema: z.object({
    query: z.string().min(1).describe("The search query"),
    num_results: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .default(5)
      .describe("Number of results to return (1-10)"),
  }),
  execute: async ({ query, num_results = 5 }) => {
    const baseUrl = process.env.SEARXNG_URL;

    if (!baseUrl) {
      return {
        error:
          "Web search via SearXNG is not configured (no SEARXNG_URL env). " +
          "If Vercel AI Gateway is enabled for this project, call the webSearchGateway tool instead for Perplexity results. " +
          "Otherwise tell the user to set SEARXNG_URL for free private search (or use their knowledge).",
      };
    }

    try {
      const url = new URL("/search", baseUrl);
      url.searchParams.set("format", "json");
      url.searchParams.set("q", query);
      url.searchParams.set("language", "en");
      url.searchParams.set("safesearch", "1");

      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "spaghetti-gpt-agent/1.0",
        },
      });

      if (!response.ok) {
        return {
          error: `Search failed with status ${response.status}`,
        };
      }

      const data = await response.json();

      const results = (data.results || [])
        .slice(0, num_results)
        .map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.content || r.snippet || "",
          engine: r.engine,
        }));

      return {
        query,
        results,
        note: results.length === 0 ? "No results found." : undefined,
      };
    } catch (error) {
      console.error("webSearch error:", error);
      return {
        error: "Failed to perform web search. The search service may be unavailable.",
      };
    }
  },
});