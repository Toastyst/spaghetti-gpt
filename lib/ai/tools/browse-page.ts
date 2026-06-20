import { tool } from "ai";
import { z } from "zod";

/**
 * Browse a specific web page and extract its main textual content.
 * Useful after webSearch to get full details from a promising URL (e.g. for research, reading articles, extracting info).
 *
 * No extra configuration required (uses plain fetch).
 * Returns cleaned title + main content (scripts/styles removed, whitespace normalized).
 */
export const browsePage = tool({
  description:
    "Fetch the full content of a specific webpage URL and return its title and main readable text. " +
    "Use this after a webSearch to read the actual page content from interesting links (for in-depth info, quotes, or analysis). " +
    "Input the exact URL from search results. Limit results to relevant pages only.",
  inputSchema: z.object({
    url: z.string().url().describe("The full URL of the page to browse (from a previous web search result)"),
    maxLength: z
      .number()
      .min(1000)
      .max(20000)
      .optional()
      .default(8000)
      .describe("Maximum characters of content to return (default 8000, to keep responses manageable)"),
  }),
  execute: async ({ url, maxLength = 8000 }) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const res = await fetch(url, {
        headers: {
          "User-Agent": "spaghetti-gpt-agent/1.0 (compatible; +https://github.com/Toastyst/spaghetti-gpt)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeout);

      if (!res.ok) {
        return {
          error: `Failed to fetch page: HTTP ${res.status} ${res.statusText}`,
          url,
        };
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        return {
          error: `URL did not return HTML content (got ${contentType})`,
          url,
        };
      }

      let html = await res.text();

      // Basic extraction: remove non-content tags
      html = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<(nav|footer|aside|form|button|svg|img|video|audio)[^>]*>[\s\S]*?<\/\1>/gi, " ")
        .replace(/<[^>]+>/g, " ") // strip remaining tags
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();

      // Try to get title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i) || html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const title = titleMatch ? titleMatch[1].trim().slice(0, 200) : "";

      // Truncate
      let content = html;
      if (content.length > maxLength) {
        content = content.slice(0, maxLength) + " [content truncated for length]";
      }

      if (!content || content.length < 100) {
        return {
          error: "Page content was too short or could not be extracted meaningfully.",
          url,
          title: title || undefined,
        };
      }

      return {
        url,
        title: title || undefined,
        content,
        note: `Extracted ~${content.length} characters of main text from the page.`,
      };
    } catch (error: any) {
      console.error("browsePage error:", error);
      return {
        error: `Failed to browse URL: ${error.message || "unknown error"}`,
        url,
      };
    }
  },
});
