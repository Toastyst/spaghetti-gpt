import { embed, embedMany, tool } from "ai";
import { z } from "zod";
import { getEmbeddingModel } from "@/lib/ai/providers";

const OWNER = "Toastyst";
const REPO = "SpaghettiStories";
const REF = "main";
const BASE_URL = "https://toastyst.github.io/SpaghettiStories";

interface StoryPost {
  title: string;
  date: string;
  author: string;
  excerpt: string;
  url: string;
  category: string;
  tags: string[];
}

function parseFrontmatter(md: string): Partial<StoryPost> {
  const match = md.match(/^---\s*([\s\S]*?)\s*---/);
  if (!match) return {};

  const block = match[1];
  const data: any = {};

  // Parse simple key: value lines + tags array
  const lines = block.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const kvMatch = trimmed.match(/^([a-zA-Z_]+)\s*:\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].toLowerCase();
      let value = kvMatch[2].trim().replace(/^["']|["']$/g, "");

      if (key === "tags") {
        const tagsMatch = block.match(/tags:\s*\[([\s\S]*?)\]/);
        if (tagsMatch) {
          data.tags = tagsMatch[1]
            .split(",")
            .map((t: string) => t.trim().replace(/^["']|["']$/g, ""))
            .filter(Boolean);
        }
      } else {
        data[key] = value;
      }
    }
  }

  return data;
}

function buildPostUrl(filename: string, prefix: string, fm: any): string {
  const nameNoExt = filename.replace(/\.md$/, "");

  if (prefix === "/vibe101") {
    return `${BASE_URL}/vibe101/${nameNoExt}/`;
  }

  // Try to get date from frontmatter first, then filename
  let year: string | undefined, month: string | undefined, day: string | undefined;

  const dateStr = fm.date || fm.Date || "";
  const dateMatch = String(dateStr).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    [, year, month, day] = dateMatch;
  } else {
    const fileMatch = nameNoExt.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (fileMatch) {
      [, year, month, day] = fileMatch;
    }
  }

  const slug = nameNoExt.replace(/^\d{4}-\d{2}-\d{2}-?/, "");

  if (year && month && day) {
    return `${BASE_URL}${prefix}/${year}/${month}/${day}/${slug}/`;
  }

  // Fallback
  return `${BASE_URL}${prefix}/${slug}/`;
}

const collections = [
  { dir: "_posts", prefix: "", category: "AI Daily News" },
  { dir: "_personal", prefix: "/personal", category: "Reference" },
  { dir: "_random", prefix: "/random", category: "Random" },
  { dir: "_vibe101", prefix: "/vibe101", category: "Vibe Code 101" },
];

export const searchSpaghettiStories = tool({
  description:
    "Semantic RAG search over the Spaghetti Stories blog (https://toastyst.github.io/SpaghettiStories/). " +
    "Finds the most relevant agent-written AI news reports, daily dispatches, technical reference guides, and experiments using embeddings. " +
    "Returns post titles, dates, authors, excerpts, categories, tags, and — most importantly — the exact direct public links " +
    "you should share with the user (e.g. https://toastyst.github.io/SpaghettiStories/2026/06/16/ai-daily-spaghetti-report/ or /personal/...). " +
    "Use this whenever the user references the blog, wants links to specific stories, AI agent news, tooling guides, or personal references. " +
    "It performs true semantic retrieval so it understands intent beyond exact keywords.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Search query in natural language (e.g. 'Cursor acquisition', 'Anthropic export controls', 'Meshtastic setup', 'best models for Cline', 'latest agent news'). " +
        "Omit or use 'latest' to get the most recent posts without semantic ranking."
      ),
    maxResults: z
      .number()
      .min(1)
      .max(8)
      .optional()
      .default(5)
      .describe("Maximum number of posts to return (1-8)"),
  }),
  execute: async ({ query, maxResults = 5 }) => {
    try {
      const allFiles: Array<{ name: string; path: string; collection: any }> = [];

      // Fetch file listings for each collection (parallel)
      await Promise.all(
        collections.map(async (col) => {
          const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${col.dir}?ref=${REF}`;
          const res = await fetch(apiUrl, {
            headers: {
              "User-Agent": "spaghetti-gpt-agent/1.0",
              Accept: "application/vnd.github.v3+json",
            },
          });

          if (!res.ok) return;

          const items = (await res.json()) as any[];
          for (const item of items) {
            if (item.type === "file" && item.name.endsWith(".md")) {
              allFiles.push({
                name: item.name,
                path: item.path,
                collection: col,
              });
            }
          }
        })
      );

      if (allFiles.length === 0) {
        return { error: "Could not load stories at this time." };
      }

      // Sort newest first by filename
      allFiles.sort((a, b) => b.name.localeCompare(a.name));

      // If no meaningful query, just return the most recent posts (fast path, no embeddings)
      const effectiveQuery = (query || "").trim().toLowerCase();
      const isLatestRequest = !effectiveQuery || effectiveQuery === "latest" || effectiveQuery === "recent";

      if (isLatestRequest) {
        const recent = allFiles.slice(0, Math.min(25, allFiles.length));
        const posts: StoryPost[] = [];

        // Fetch a limited set for recent view
        await Promise.all(
          recent.slice(0, 12).map(async (file) => {
            try {
              const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${REF}/${file.path}`;
              const mdRes = await fetch(rawUrl, { headers: { "User-Agent": "spaghetti-gpt-agent/1.0" } });
              if (!mdRes.ok) return;
              const md = await mdRes.text();
              const fm = parseFrontmatter(md);
              const url = buildPostUrl(file.name, file.collection.prefix, fm);

              posts.push({
                title: fm.title || file.name.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, ""),
                date: fm.date || "",
                author: fm.author || "Unknown",
                excerpt: fm.excerpt || "",
                url,
                category: file.collection.category,
                tags: fm.tags || [],
              });
            } catch {}
          })
        );

        posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        const results = posts.slice(0, maxResults);

        return {
          query: query || "latest",
          results,
          note: `Showing the ${results.length} most recent posts from Spaghetti Stories. Share the direct 'url' links.`,
        };
      }

      // Semantic RAG path: fetch content for top candidates and embed
      const candidates = allFiles.slice(0, 30); // Limit to keep embedding calls reasonable as the blog grows

      const postData: Array<{ file: any; fm: any; content: string; url: string }> = [];

      await Promise.all(
        candidates.map(async (file) => {
          try {
            const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${REF}/${file.path}`;
            const mdRes = await fetch(rawUrl, { headers: { "User-Agent": "spaghetti-gpt-agent/1.0" } });
            if (!mdRes.ok) return;
            const md = await mdRes.text();
            const fm = parseFrontmatter(md);
            const url = buildPostUrl(file.name, file.collection.prefix, fm);

            // Strip frontmatter for body content
            const body = md.replace(/^---[\s\S]*?---\s*/, "").trim();

            postData.push({
              file,
              fm,
              content: body,
              url,
            });
          } catch {}
        })
      );

      if (postData.length === 0) {
        return { error: "No story content could be loaded." };
      }

      // Prepare texts for embedding (title + excerpt + beginning of body for good semantic signal)
      const textsForEmbedding = postData.map((p) => {
        const fm = p.fm;
        const bodySample = p.content.substring(0, 3500);
        return [fm.title || "", fm.excerpt || "", bodySample].filter(Boolean).join("\n\n");
      });

      const queryText = query!; // we know it's present here

      // Generate embeddings (query + batch for docs)
      const model = getEmbeddingModel();
      const [queryResult, docsResult] = await Promise.all([
        embed({ model, value: queryText }),
        embedMany({ model, values: textsForEmbedding }),
      ]);

      const queryEmbedding = queryResult.embedding;
      const docEmbeddings = docsResult.embeddings;

      // Cosine similarity
      function cosineSimilarity(a: number[], b: number[]): number {
        let dot = 0;
        let normA = 0;
        let normB = 0;
        const len = Math.min(a.length, b.length);
        for (let i = 0; i < len; i++) {
          dot += a[i] * b[i];
          normA += a[i] * a[i];
          normB += b[i] * b[i];
        }
        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom === 0 ? 0 : dot / denom;
      }

      // Score and attach
      const scored = postData.map((p, i) => {
        const sim = cosineSimilarity(queryEmbedding, docEmbeddings[i]);
        const fm = p.fm;
        return {
          title: fm.title || p.file.name.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, ""),
          date: fm.date || "",
          author: fm.author || "Unknown",
          excerpt: fm.excerpt || "",
          url: p.url,
          category: p.file.collection.category,
          tags: fm.tags || [],
          similarity: sim,
        };
      });

      // Sort by similarity desc
      scored.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));

      const results = scored.slice(0, maxResults).map(({ similarity, ...rest }) => rest);

      if (results.length === 0) {
        return {
          query,
          results: [],
          note: "No sufficiently relevant posts found. Try broadening the query or asking for the latest posts.",
        };
      }

      return {
        query,
        results,
        note: `Semantic search found ${results.length} relevant post(s) from Spaghetti Stories. Use the exact 'url' values as direct links in your response.`,
      };
    } catch (error) {
      console.error("searchSpaghettiStories (RAG) error:", error);
      return {
        error:
          "Failed to perform semantic search over Spaghetti Stories. The blog is publicly available at https://toastyst.github.io/SpaghettiStories/.",
      };
    }
  },
});