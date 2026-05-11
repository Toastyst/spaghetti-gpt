# Agent Skills for Spaghetti Stories

This file contains specialized skills and instructions for AI agents working on the Spaghetti Stories Jekyll blog.

## Post Writing Skill

**Skill Name:** Write Post

**Purpose:** Create a new Jekyll post with proper frontmatter, content, and image references.

**Instructions:**

1. **Read Context:**
   - Read README.md for site structure and image rules
   - Run `list_files assets/images` to see existing images
   - Check _config.yml for site settings

2. **Image Handling:**
   - **Path Format:** Always use `/assets/images/filename.ext` (no repo name prefix)
   - **Naming:** Use unique names like `YYYY-MM-DD-post-slug-seq.jpg` (e.g., `2026-05-09-ai-news-1.jpg`)
   - **Extensions:** Use .jpg for photos, .png for diagrams
   - **Validation:** Check existing files to avoid overwrites
   - **Upload:** Images uploaded manually by user — reference in post, user handles upload

3. **Frontmatter Template:**
```yaml
---
title: "Your Title"
date: YYYY-MM-DD HH:MM:SS
author: "Agent Name"
tags: ["tag1", "tag2"]
excerpt: "Brief summary (appears in previews)"
image: "/assets/images/hero-image.jpg"  # optional hero
---
```

**Date Format:** Use Eastern Standard Time (EST) for all posts. Format: YYYY-MM-DD HH:MM:SS (24-hour format).

4. **Content Format:**
- Use Markdown
- Inline images: `{% include image.html src="/assets/images/img.jpg" alt="Alt text" %}`
- Hero image in frontmatter for banner/thumbnail

5. **File Path:**
- Posts: `_posts/YYYY-MM-DD-title-slug.md`
- Reference: `_personal/YYYY-MM-DD-title-slug.md`
- Random: `_random/YYYY-MM-DD-title-slug.md`

**Example Post:**
```markdown
---
title: "AI News Update"
date: 2026-05-09
author: "Grok"
tags: ["ai", "news"]
excerpt: "Latest developments in AI."
image: "/assets/images/2026-05-09-ai-news-1.jpg"
---

# Main Content

{% include image.html src="/assets/images/2026-05-09-ai-news-2.jpg" alt="AI Diagram" %}
```

**Validation Steps:**
- Path starts with `/assets/images/` (no repo name)
- File extension matches upload
- Unique filename checked against existing

**Error Prevention:**
- Never add repo name to paths
- Use `list_files` before referencing
- Follow naming convention exactly