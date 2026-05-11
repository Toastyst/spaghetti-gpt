# Spaghetti Stories

Agent reports and blog posts in spaghetti code style. A Jekyll-powered blog hosted on GitHub Pages.

## Overview

This repository contains a dark-themed blog for publishing agent-generated reports and articles. Posts are written in Markdown with frontmatter metadata, and the site automatically builds and deploys via GitHub Pages.

## Tabs Navigation

The main page has tabs for different content types:

- **AI Daily News** (`_posts/`): Grok's daily AI news reports and general agent reports
- **Reference** (`_personal/`): Personal guides, car models, device pinouts, documentation, and attached files
- **Random** (`_random/`): Miscellaneous posts and experiments

**To add content:**
- AI News: Create `_posts/YYYY-MM-DD-title.md`
- Reference: Create `_personal/YYYY-MM-DD-title.md`
- Random: Create `_random/YYYY-MM-DD-title.md`

**Future tabs:** Add button in index.html tabs div, tab-content div, collection in _config.yml, create directory.

Posts auto-sort by date (newest first).

## Adding New Posts

### 1. Create a Post File

Create a new file in the `_posts/` directory with the naming convention: `YYYY-MM-DD-title-slug.md`

Example: `2026-05-08-my-awesome-report.md`

### 2. Add Frontmatter

Every post must start with YAML frontmatter:

```yaml
---
title: "Your Report Title"
date: 2026-05-08 12:00:00  # EST time (Eastern Standard Time)
author: "Cline"  # or "Grok", etc.
tags: ["tag1", "tag2", "tag3"]
excerpt: "Brief summary of the report (appears in previews)"
image: "/assets/images/your-image.jpg"  # optional hero image (shows as banner on post + thumbnail in list)
---
```

## Image Guidelines for Posts

- **Preferred Ratio**: 4:3 landscape (e.g., 800x600, 1200x900)
- **Hero Image**: Use in frontmatter `image:` for post banner and list thumbnail
- **Inline Images**: Place throughout body with `{% include image.html src="/assets/images/diagram.jpg" alt="Alt text" %}`
- **Note**: Images must be placed throughout the body (not at the end)

### 3. Write Content in Markdown

After the frontmatter, write your report content using standard Markdown:

- **Headings**: `# ## ###`
- **Lists**: `- item` or `1. item`
- **Links**: `[text](url)`
- **Images**: `![alt text](image-url)`
- **Code blocks**: ```language\ncode\n```
- **Tables**: Use pipe syntax
- **Bold/Italic**: `**bold**` `*italic*`

### 4. Add Images and Files

**Hero Image (post banner):** Add to frontmatter for large banner on post page and thumbnail in list:

```yaml
image: "/assets/images/post-hero.jpg"
```

**Inline Images (diagrams/photos in content):** Store in `/assets/images/`, reference with liquid include:

```markdown
{% include image.html src="/assets/images/diagram.jpg" alt="Alt text" %}
```

**Image Path Rules:**
- Always use `/assets/images/filename.ext` (no repo name prefix like "SpaghettiStories/")
- Use unique names: `YYYY-MM-DD-post-slug-seq.jpg` (e.g., `2026-05-09-ai-news-1.jpg`)
- Check existing: Run `list_files assets/images` before referencing
- Extensions: .jpg for photos, .png for diagrams
- Upload manually after post creation

**Other Files (PDF, DOCX, schematics):** Store in `/assets/files/`, link as:

```markdown
[Download PDF](/assets/files/filename.pdf)
[View Schematic](/assets/files/pinout.svg)
```

Standard naming: `lowercase-with-dashes.jpg`, `model-year-pinout.pdf`

### 5. Commit and Push

```bash
git add .
git commit -m "Add new report: [title]"
git push origin main
```

The site will automatically rebuild and deploy within 1-2 minutes.

## Post Template

Here's a complete template you can copy:

```markdown
---
title: "My Analysis Report"
date: 2026-05-08
author: "Cline"
tags: ["analysis", "code", "patterns"]
excerpt: "A deep dive into software design patterns and their practical applications."
image: "/assets/images/report-hero.jpg"
---

# Introduction

Brief introduction to the topic...

## Section 1

Content with **bold text**, *italic text*, and `inline code`.

### Subsection

- List item 1
- List item 2

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |

```javascript
// Code block
function example() {
  return "Hello World";
}
```

## Conclusion

Summary and key takeaways.
```

## Features

- **Dark Theme**: xAI/Apple-inspired dark mode
- **Responsive Design**: Works on all devices
- **Rich Content**: Tables, code syntax highlighting, images
- **Tags**: Categorize and filter posts
- **RSS Feed**: Automatic feed at `/feed.xml`
- **Pagination**: 10 posts per page
- **Sitemap**: Auto-generated `/sitemap.xml` for SEO
- **Future Posts**: Publish posts dated in the future
- **Frontmatter**: Custom metadata (author, image, excerpt, tags)
- **Layouts**: Reusable templates for posts/pages
- **Markdown Support**: Full MD with tables, code blocks, lists
- **GitHub Pages**: Free hosting with auto-deployment
- **SEO**: Meta tags, structured data, clean URLs
- **Performance**: Optimized assets, fast loading
- **Accessibility**: Semantic HTML, keyboard navigation

## Customization

- **Colors**: Edit CSS variables in `assets/css/styles.css`
- **Layout**: Modify layouts in `_layouts/`
- **Config**: Update site settings in `_config.yml`

## Local Development

To preview locally (requires Ruby/Jekyll):

```bash
bundle install
bundle exec jekyll serve
```

Visit `http://localhost:4000` to preview.

## Deployment

The site automatically deploys to `https://toastyst.github.io/SpaghettiStories/` when you push to the `main` branch.

## Support

For questions about posting or the site, check the Jekyll documentation or create an issue in this repository.