# TTT Builder

Open-source AI app builder for Kaspa. Describe what you want and TTT Builder generates a complete, production-quality multi-file app with the Kaspa wallet protocol built in. **Bring your own model keys — no integration credits, no hosted backend required.**

## Quick start (local browser)

```bash
git clone https://github.com/<owner>/ttt-builder.git
cd ttt-builder
npm install
npm run dev
```

Open http://localhost:3000 — the builder loads in your browser.

## Add your model (open-source / bring-your-own keys)

The builder runs on YOUR models — open-source or any OpenAI-compatible endpoint. Keys live only in your browser (localStorage) and go straight to the provider. They never touch a server.

1. Open the builder → model selector (top-right of the chat) → **+ Add open model**.
2. Pick a provider:
   - **OpenRouter** (recommended — free + paid models, browser-friendly CORS): key from openrouter.ai/keys, model e.g. `deepseek/deepseek-chat-v3.1:free`
   - **DeepSeek**: key from platform.deepseek.com, model `deepseek-chat`
   - **Ollama** (local, no key): run `ollama serve`, model e.g. `llama3.1`
   - **Custom**: any OpenAI-compatible endpoint (LM Studio, vLLM, llama.cpp server)
3. Start building — describe your app and hit Build.

> The core build loop calls your provider directly from the browser. Hosted models (prefixed `ttt_agent_1`, `claude_*`, `gpt_*`, `gemini_*`) are NOT available in this self-hosted build — use the Open Models tab.

## Run on any platform

This is a standard Vite + React app — deploy it anywhere:

- **Vercel**: `vercel` (auto-detects Vite)
- **Netlify**: build `npm run build`, publish `dist/`
- **Cloudflare Pages**: build `npm run build`, output `dist`
- **Your own server**: `npm run build && npm run preview`, or serve `dist/` with any static host
- **Docker**: `npm run build` then serve `dist/` with nginx/caddy

## Desktop CLI

```bash
git clone https://github.com/<owner>/ttt-builder.git
cd ttt-builder
npm install
npm run dev   # http://localhost:3000
```

Pin it as a desktop app with any SSB wrapper (e.g. `nativefier http://localhost:3000` or PWA install from your browser).

## What's in this repo

- `src/pages/TTTBuilder.jsx` — the builder studio (chat + live preview + dashboard)
- `src/components/tttbuilder/` — orchestrator, local LLM layer, model selector, wallet kit, project files, and all builder UI
- `src/components/ui/` — shadcn/ui primitives used by the builder
- `src/api/base44Client.js` — standalone stub (no Base44 platform needed)
- `public/TTT_BUILDER_WALLET.md`, `public/TTT_BUILDER_ARTHUUN.md`, `public/ARHTUUN.md` — architecture & protocol docs

## Optional platform features (graceful degradation)

A few features in the hosted TTT relied on the Base44 platform. In this self-hosted build they degrade gracefully — the build loop still works:

- **Live preview sandbox** (`E2BLivePanel`): real npm-project sandboxing needs an E2B API key. Without it, static HTML/CSS/JS apps still preview live in-browser; React/npm projects show their code but won't auto-run a cloud sandbox. To enable: wire `E2BLivePanel` to your own E2B call.
- **Image generation** (`imageGen.js`): `TTT_IMAGE[...]` markers are cleared if no image API is configured. To enable: plug your own image endpoint into `src/components/tttbuilder/imageGen.js`.
- **GitHub push** (`publishToGitHub` / `pushAppToUserGitHubOAuth`): use a personal access token, or push generated files manually.
- **URL clone & file analysis** (`uiClonerScrape`, `analyzeUploadedFile`): optional attachment features.
- **Auth / admin gate**: `src/api/base44Client.js` returns a local admin user so the builder opens with no login. Edit it to add real auth if you want.

## Build your own vibe-coding platform

This repo IS a vibe-coding platform. Clone it, brand it, ship it:

1. Fork/clone this repo.
2. `npm install && npm run dev` — confirm it builds.
3. Edit `src/pages/TTTBuilder.jsx` (the studio) and `src/components/tttbuilder/` (the engine) to match your brand and defaults.
4. Point users at the Open Models tab to bring their own keys (open-source models only — never your hosted credits).
5. Deploy (see "Run on any platform").

## License

MIT — see LICENSE.
