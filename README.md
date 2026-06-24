# econstitucional

AI-powered explorer for Bolivia's Constitution (CPE 2009).

## Features

- Browse 411 articles with full analysis
- AI assistant for constitutional queries
- Clickable article references in responses
- Search and filter by categories
- Light / dark theme

## Stack

- Framework: [Astro](https://astro.build) (static pages + serverless API routes)
- UI: Bootstrap 5, IBM Plex fonts
- Backend: Vercel serverless functions (`src/pages/api/*`)
- AI: Llama 3.3 70B (Groq)

## Project structure

```
src/
  layouts/Layout.astro        # shared <head> / SEO
  components/                  # Navbar, ArticleExplorer, ChatWidget
  pages/index.astro           # article explorer + chat
  pages/acerca.astro          # about page
  pages/api/articles.js       # article list / detail / temáticas
  pages/api/chat.js           # Groq-backed assistant (keyword RAG)
  scripts/                    # client-side TS (theme, chat, articles)
  styles/global.css           # design tokens + components
data/                         # constitution JSON (shipped to functions)
```

## Develop

```bash
npm install
npm run dev          # http://localhost:4321
```

Set `GROQ_API_KEY` in a `.env` file to enable the chat assistant locally.

## Build

```bash
npm run build        # outputs .vercel/output via @astrojs/vercel
```

## Deploy

Pushing to `master` deploys to Vercel via GitHub Actions. Manual:

```bash
vercel
vercel env add GROQ_API_KEY
```

## License

MIT
