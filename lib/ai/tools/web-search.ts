import { tool } from "ai";
import { z } from "zod";

/**
 * Web search tool using SearXNG (or compatible).
 *
 * - Preferred: Set SEARXNG_URL to your own instance (self-host on Railway/Fly.io/VPS recommended for speed, privacy, and reliability).
 * - Fallback: The tool will try public instances listed on https://searx.space if SEARXNG_URL is not set.
 * - Alternative high-quality path (no self-host needed): Enable Vercel AI Gateway and use the `webSearchGateway` tool (Perplexity-powered, uses platform credits).
 *
 * After search results, use the `browsePage` tool on the most relevant URLs to get full page content ("extract").
 */
export const webSearch = tool({
  description:
    "Search the web for up-to-date information (news, facts, research, prices, etc.). " +
    "Returns title, url, and content snippet for each result. " +
    "Use together with browsePage for full page extraction when you need the actual article text. " +
    "Falls back to public SearXNG instances (see https://searx.space) if SEARXNG_URL is not configured.",
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
    const configured = process.env.SEARXNG_URL;
    // Public fallbacks from https://searx.space (pick a few reasonably reliable ones)
    const publicInstances = [
      'https://searx.be',
      'https://searxng.site',
      'https://searx.tiekoetter.com',
      'https://search.bus-hit.me',
    ];
    const instancesToTry = configured ? [configured, ...publicInstances] : publicInstances;

    for (const baseUrl of instancesToTry) {
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
          // short timeout per instance
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
          // try next instance
          continue;
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

        if (results.length === 0) {
          continue; // try next if this instance gave nothing useful
        }

        return {
          query,
          results,
          note: configured
            ? undefined
            : `Used public SearXNG instance (${baseUrl}) from searx.space — for best results self-host or set SEARXNG_URL.`,
        };
      } catch (err) {
        // instance failed, try the next one
        continue;
      }
    }

    // all instances failed
    return {
      error:
        "All SearXNG instances failed (including public ones from searx.space). " +
        "Try setting SEARXNG_URL to a reliable instance, or use the webSearchGateway tool if AI Gateway is enabled.",
    };
  },
});