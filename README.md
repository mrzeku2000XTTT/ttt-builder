<div align="center">

# ⚡ TTT Builder

### The first Kaspa-native vibe-coding platform.

Describe it. Ship it. Every app comes with a real Kaspa wallet wired in — keys generated locally, transactions signed in the browser, zero custody, zero servers.

**Bring your own model keys. No integration credits. No hosted backend. No lock-in.**

<br />

```bash
git clone https://github.com/mrzeku2000XTTT/ttt-builder.git
cd ttt-builder && npm install && npm run dev
```

<br />

**Kaspa** · **Open-source** · **BYO-keys** · **Local-first** · **MIT**

</div>

---

> **TTT Builder** turns a single prompt into a complete, production-quality multi-file application — and every app it ships has the Kaspa wallet protocol baked in at the framework level. It is the open-source, self-hostable core of the TTT super-app: a vibe-coding studio for the Kaspa ecosystem that anyone can clone, brand, and run on their own machine with their own model keys.

## ✨ Why TTT Builder

| | |
|---|---|
| 🟣 **Kaspa-first, not Kaspa-bolted-on** | The wallet protocol is injected at build time — every generated app gets a real, local-only Kaspa wallet (BIP39 seed → WIF → signed transactions) with a strict, enforced UI pattern. No extensions, no custody, no floating panels. |
| 🧠 **Bring your own brain** | The build loop calls **your** model directly from the browser — OpenRouter, DeepSeek, Ollama, or any OpenAI-compatible endpoint. Keys live in your localStorage and go straight to the provider. They never touch a server. |
| 🪶 **Local-first by design** | Projects, wallet keys, and memory persist in the browser. No account, no cloud sync, no telemetry. Your workspace is yours. |
| 🎬 **Multi-agent orchestration** | A planner breaks your request into scoped file-editing subagents; a repair agent fixes missing imports; a reviewer reverts unrelated changes. Surgical, not wholesale. |
| 🖼️ **Live preview** | Generated apps render live in an isolated sandbox. Static HTML/CSS/JS previews in-browser; wire your own E2B key for full npm-project sandboxing. |
| 🚀 **Ship anywhere** | Standard Vite + React output. Deploy to Vercel, Netlify, Cloudflare Pages, your own server, or Docker — one `npm run build` away. |

## 🚀 Quick start

```bash
git clone https://github.com/mrzeku2000XTTT/ttt-builder.git
cd ttt-builder
npm install
npm run dev
```

Open **http://localhost:3000** — the studio loads in your browser. No login, no config.

### First run: onboarding wizard

On first launch, a **step-by-step onboarding wizard** appears automatically (standalone build only). It walks you through:

1. **Add your model** — defaults to **Gemini 2.0 Flash** (free tier). Just paste your Google AI Studio key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Or change the model string to use any other provider (Groq, OpenRouter, etc.) — provider is auto-detected.
2. **Add E2B key** *(optional)* — for live React/npm sandbox previews. Skip if you only build static HTML apps.
3. **Ready** — start building. Every app ships with a Kaspa wallet built in.

> Everything you enter is stored **locally in your browser only** (localStorage). Keys never touch any server. Re-open the wizard anytime with the **"Setup model & keys"** button on the home screen.

### Add your model

Prefer to skip the wizard? Open the builder → model selector (top-right of the chat) → **+ Add open model**. Pick a provider:

| Provider | Where to get a key | Example model | Notes |
|---|---|---|---|
| **Google Gemini** *(default)* | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | `gemini-2.0-flash` | Free tier, browser-friendly CORS, no credit card |
| **Groq** | [console.groq.com/keys](https://console.groq.com/keys) | `llama-3.3-70b-versatile` | Fast + free, browser-friendly CORS |
| **OpenRouter** | [openrouter.ai/keys](https://openrouter.ai/keys) | `deepseek/deepseek-chat-v3.1:free` | Free + paid models, browser-friendly CORS |
| **DeepSeek** | [platform.deepseek.com](https://platform.deepseek.com) | `deepseek-chat` | Best price/perf for code |
| **Ollama** *(local, no key)* | run `ollama serve` | `llama3.1` | 100% local, zero cost, zero network |
| **Custom** | — | — | Any OpenAI-compatible endpoint (LM Studio, vLLM, llama.cpp) |

> The core build loop calls your provider directly from the browser. Hosted models (`claude_*`, `gpt_*`, `gemini_*`) are **not** available in this self-hosted build — that's the point: you bring the keys, you own the cost.

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│  TTT Builder Studio  (src/pages/TTTBuilder)  │
│  chat · live preview · dashboard · memory    │
└───────────────┬──────────────────────────────┘
                │ prompt
        ┌───────▼───────┐
        │  Orchestrator │  planner → subagents → repair → review
        └───────┬───────┘
                │ file ops
        ┌───────▼───────┐  ┌──────────────┐
        │  Project FS   │← │  Wallet Kit   │  injects Kaspa protocol into every app
        └───────┬───────┘  └──────────────┘
                │ render
        ┌───────▼───────┐
        │  Live Preview │  in-browser / E2B sandbox
        └───────────────┘
```

### What's in this repo

| Path | What it is |
|---|---|
| `src/pages/TTTBuilder.jsx` | The studio — chat, live preview, and dashboard in one |
| `src/components/tttbuilder/` | The engine: orchestrator, local LLM layer, model selector, wallet kit, project FS, file/image/GitHub sync, all builder UI |
| `src/components/ui/` | shadcn/ui primitives the studio is built on |
| `src/api/base44Client.js` | Standalone SDK stub — no Base44 platform required |
| `public/TTT_BUILDER_WALLET.md` | The Kaspa wallet UI protocol contract (the enforced pattern) |
| `public/TTT_BUILDER_ARTHUUN.md` · `public/ARHTUUN.md` | Architecture & protocol deep-dives |

## 🔌 Optional features (graceful degradation)

A few features in the hosted TTT relied on the Base44 platform. In this self-hosted build they degrade gracefully — the build loop always works:

- **Live preview sandbox** — static apps preview in-browser; for full npm-project sandboxing, wire `E2BLivePanel` to your own E2B API key.
- **Image generation** — `TTT_IMAGE[...]` markers are cleared unless you plug an image endpoint into `src/components/tttbuilder/imageGen.js`.
- **GitHub push** — use a personal access token, or push generated files manually.
- **URL clone & file analysis** — optional attachment features (`uiClonerScrape`, `analyzeUploadedFile`).
- **Auth** — `base44Client.js` returns a local admin user so the builder opens with no login. Edit it to add real auth if you want.

## 🌍 Deploy anywhere

This is a standard Vite + React app — one build, any host:

```bash
npm run build   # → dist/
```

- **Vercel** — `vercel` (auto-detects Vite)
- **Netlify** — publish `dist/`
- **Cloudflare Pages** — output `dist`
- **Docker** — serve `dist/` with nginx/caddy
- **Desktop** — pin with `nativefier` or install as a PWA

## 🧩 Build your own vibe-coding platform

This repo **is** a vibe-coding platform. Clone it, brand it, ship it:

1. **Fork** this repo.
2. `npm install && npm run dev` — confirm it builds.
3. Edit `src/pages/TTTBuilder.jsx` (the studio) and `src/components/tttbuilder/` (the engine) to match your brand and defaults.
4. Point your users at the Open Models tab — they bring their own keys, you never pay for their inference.
5. Deploy (see above).

> **The Kaspa wallet protocol is the differentiator.** Every app your platform generates ships with a real, local-only Kaspa wallet. That's not a feature — it's the foundation.

## 🛡️ Security model

- **Keys never leave the browser.** Model keys, wallet seeds, and WIFs live in localStorage and go directly to the provider / signer. No server ever sees them.
- **Wallet is local-only.** BIP39 seed → WIF → signed transactions, all in-browser. Explicit export controls. No custody, no relay, no extension dependency.
- **No telemetry.** No analytics, no tracking, no phone-home. What you build stays on your machine.

## 📄 License

**MIT** — see [LICENSE](./LICENSE). Fork it, brand it, ship it, sell it. Just keep the copyright notice.

---

<div align="center">

**Built for the Kaspa ecosystem.**

⭐ Star this repo if it helped you ship.

</div>
