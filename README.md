# TTT Builder

Open-source AI app builder for Kaspa. Describe what you want and TTT Builder generates a complete, production-quality multi-file app with the Kaspa wallet protocol built in.

## Bring your own keys (no integration credits)

TTT Builder runs on YOUR models. Open the model selector -> "+ Add open model" and add any OpenAI-compatible provider:

- **OpenRouter** (recommended - free + paid models, browser-friendly CORS): key from openrouter.ai/keys, model e.g. `deepseek/deepseek-chat-v3.1:free`
- **DeepSeek**: key from platform.deepseek.com, model `deepseek-chat`
- **Ollama** (local, no key): run `ollama serve`, model e.g. `llama3.1`
- **Custom**: any OpenAI-compatible endpoint (LM Studio, vLLM, llama.cpp server)

Keys are stored **only in your browser** (localStorage) and sent directly to the provider. They never touch any server.

## What's in this repo

This is the TTT Builder core:

- `src/pages/TTTBuilder.jsx` - the builder studio (chat + preview + dashboard)
- `src/components/tttbuilder/` - orchestrator, local LLM layer, model selector, wallet kit, project files, and all builder components
- `public/TTT_BUILDER_WALLET.md`, `public/TTT_BUILDER_ARTHUUN.md`, `public/ARHTUUN.md` - architecture & protocol docs

## Remaining platform dependencies

The builder core is open-source. A few features still depend on the Base44 platform (the original host). To run fully standalone, replace:

- **Live preview sandbox** (`E2BLivePanel` -> `e2bSandbox`): bring your own E2B API key, or use the in-browser static preview only.
- **Image generation** (`imageGen.js` -> `GenerateImage`): plug your own image API, or disable image markers.
- **GitHub push** (`publishToGitHub` / `pushAppToUserGitHubOAuth`): use a personal access token directly.
- **URL clone & file analysis** (`uiClonerScrape`, `analyzeUploadedFile`): optional features.
- **Auth / admin gate**: strip the `user.role === 'admin'` check in `TTTBuilder.jsx` for a local build.

## License

MIT - see LICENSE.
