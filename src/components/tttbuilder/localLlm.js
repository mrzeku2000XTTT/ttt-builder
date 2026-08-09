// Bring-your-own LLM providers for TTT Builder — open-source / local model support.
// Keys live ONLY in this browser's localStorage and are sent directly to the
// provider's API. They never touch Base44 or any other server.
// This is what makes the builder open-sourceable: a cloner brings their own keys
// here and the whole build workflow runs without Base44 integration credits.

const STORAGE_KEY = "ttt_builder_local_llm";

export const LOCAL_MODEL_PREFIX = "local:";

// Presets a cloner can pick from, or they can add a custom OpenAI-compatible endpoint.
export const PROVIDER_PRESETS = [
  { provider: "groq", label: "Groq (fast + free)", baseUrl: "https://api.groq.com/openai/v1", note: "Very fast, free tier, browser CORS-friendly. Get a key at console.groq.com/keys.", placeholderModel: "llama-3.3-70b-versatile" },
  { provider: "google", label: "Google Gemini (AI Studio)", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", note: "Free tier, browser CORS-friendly. Get a key at aistudio.google.com/apikey.", placeholderModel: "gemini-2.0-flash" },
  { provider: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", note: "Free + paid models. Get a key at openrouter.ai/keys. Browser-friendly CORS.", placeholderModel: "deepseek/deepseek-chat-v3.1:free" },
  { provider: "together", label: "Together AI", baseUrl: "https://api.together.xyz/v1", note: "Free credits, browser CORS-friendly. Get a key at api.together.xyz/settings/api-keys.", placeholderModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free" },
  { provider: "mistral", label: "Mistral", baseUrl: "https://api.mistral.ai/v1", note: "Browser CORS-friendly. Get a key at console.mistral.ai/api-keys.", placeholderModel: "mistral-small-latest" },
  { provider: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", note: "Get a key at platform.deepseek.com. (May need a CORS proxy when called from the browser.)", placeholderModel: "deepseek-chat" },
  { provider: "ollama", label: "Ollama (local)", baseUrl: "http://localhost:11434/v1", note: "Run models locally with Ollama (ollama.com). No key needed. Runs `ollama serve`.", placeholderModel: "llama3.1" },
  { provider: "custom", label: "Custom (OpenAI-compatible)", baseUrl: "", note: "Any OpenAI-compatible endpoint (LM Studio, vLLM, llama.cpp server, etc.)", placeholderModel: "my-model" },
];

export function getLocalProviders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

// ENV-BASED PROVIDERS (safer than localStorage).
// Cloners can put keys in a .env file at the repo root (gitignored) and they are
// baked into the build via Vite's import.meta.env. These are read-only from the
// UI — you edit .env and restart `npm run dev` to change them.
//
// Supported .env keys:
//   VITE_GEMINI_API_KEY            → auto-creates a Google Gemini 2.0 Flash entry
//   VITE_LLM_API_KEY               → creates a generic entry (pair with below)
//   VITE_LLM_MODEL, VITE_LLM_BASE_URL, VITE_LLM_PROVIDER, VITE_LLM_LABEL
//
// Env entries get stable ids prefixed `env_` so they never collide with
// localStorage entries (ids like `m_<ts>_<rand>`).
export function getEnvProviders() {
  const env = (typeof import.meta !== "undefined" && import.meta.env) || {};
  const out = [];
  const gKey = (env.VITE_GEMINI_API_KEY || "").trim();
  if (gKey) {
    out.push({
      id: "env_gemini",
      provider: "google",
      label: "Gemini (.env)",
      model: "gemini-2.0-flash",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      apiKey: gKey,
      _env: true,
    });
  }
  const llmKey = (env.VITE_LLM_API_KEY || "").trim();
  if (llmKey) {
    out.push({
      id: "env_custom",
      provider: (env.VITE_LLM_PROVIDER || "custom").trim(),
      label: (env.VITE_LLM_LABEL || env.VITE_LLM_MODEL || "Custom (.env)").trim(),
      model: (env.VITE_LLM_MODEL || "").trim(),
      baseUrl: (env.VITE_LLM_BASE_URL || "").trim(),
      apiKey: llmKey,
      _env: true,
    });
  }
  return out;
}

// All usable providers: localStorage (editable) + env (read-only).
export function getAllProviders() {
  return [...getLocalProviders(), ...getEnvProviders()];
}

function persist(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

export function saveLocalProvider(p) {
  const list = getLocalProviders();
  const entry = {
    id: p.id || `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    provider: p.provider || "custom",
    label: p.label || "",
    model: p.model || "",
    baseUrl: p.baseUrl || "",
    apiKey: p.apiKey || "",
  };
  list.push(entry);
  persist(list);
  return entry;
}

export function removeLocalProvider(id) {
  persist(getLocalProviders().filter(p => p.id !== id));
}

export function isLocalModelId(model) {
  return typeof model === "string" && model.startsWith(LOCAL_MODEL_PREFIX);
}

export function resolveLocalModel(modelId) {
  if (!isLocalModelId(modelId)) return null;
  const id = modelId.slice(LOCAL_MODEL_PREFIX.length);
  return getAllProviders().find(p => p.id === id) || null;
}

// Build an OpenAI-compatible chat-completions request and call the provider directly
// from the browser. Returns a string, or a parsed object when response_json_schema is set.
export async function callLocalLlm(args) {
  const provider = args._resolvedProvider || resolveLocalModel(args.model);
  if (!provider) throw new Error("Open model not found. Add one in Settings → Models & API keys (or set VITE_LLM_API_KEY / VITE_GEMINI_API_KEY in your .env).");
  const baseUrl = (provider.baseUrl || "").replace(/\/$/, "");
  if (!baseUrl) throw new Error(`"${provider.label}" has no base URL. Edit it in Open Models.`);

  let content = args.prompt || "";
  const jsonSchema = args.response_json_schema || null;
  if (jsonSchema) {
    content += `\n\nRespond with ONLY valid JSON (no markdown fences, no commentary) matching this schema:\n${JSON.stringify(jsonSchema)}`;
  }

  // OpenAI vision-style content parts. OpenRouter + OpenAI-compatible vision models
  // accept image_url; non-vision models will reject — the error surfaces to the user.
  const parts = [{ type: "text", text: content }];
  if (Array.isArray(args.file_urls)) {
    args.file_urls.forEach((u) => {
      if (typeof u === "string") parts.push({ type: "image_url", image_url: { url: u } });
    });
  }

  const headers = { "Content-Type": "application/json" };
  if (provider.apiKey) headers["Authorization"] = `Bearer ${provider.apiKey}`;
  if (provider.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://ttt.builder";
    headers["X-Title"] = "TTT Builder";
  }

  // Free / queued models (e.g. OpenRouter free tier) can take a long time or hang
  // silently. Cap the wait so the build fails fast with a clear message instead of
  // spinning "Building your site..." forever.
  const TIMEOUT_MS = 120000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: "user", content: parts }],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(`${provider.label} timed out after ${TIMEOUT_MS / 1000}s. Free models can queue — try again, pick a faster/paid model, or use Google AI Studio / Ollama.`);
    }
    throw new Error(`Could not reach ${provider.label} (${baseUrl}). ${err.message || "network error"}. This provider likely blocks browser requests (CORS). Use a browser-friendly provider instead: Groq (console.groq.com — free, fast), Google Gemini (aistudio.google.com — free), or OpenRouter (openrouter.ai). TokenRouter, DeepSeek, and most direct APIs do NOT work from the browser.`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${provider.label} error ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  const out = data?.choices?.[0]?.message?.content;
  const text = Array.isArray(out) ? out.map((p) => p.text || "").join("") : out;
  if (text == null) throw new Error(`${provider.label} returned no content`);

  if (jsonSchema) {
    const cleaned = String(text).replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const start = cleaned.indexOf("{");
    let end = -1, depth = 0, inStr = false, esc = false;
    if (start >= 0) {
      for (let i = start; i < cleaned.length; i++) {
        const c = cleaned[i];
        if (esc) { esc = false; continue; }
        if (c === "\\") { esc = true; continue; }
        if (c === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (c === "{") depth++;
        else if (c === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
      }
    }
    const jsonStr = end > start ? cleaned.slice(start, end) : cleaned;
    try { return JSON.parse(jsonStr); }
    catch { throw new Error(`${provider.label} did not return valid JSON. Try a stronger model.`); }
  }
  return text;
}

// ─── Hosted model key storage ──────────────────────────────────────────
// Lets users bring their own API keys for hosted models (Claude, GPT, Gemini)
// instead of using Base44 credits. Only TTT Agent 1 and "automatic" use the
// built-in Base44 InvokeLLM. Keys are stored locally in the browser and sent
// directly to the provider — never to Base44.

const HOSTED_KEY_STORAGE = "ttt_builder_hosted_keys";

export const HOSTED_MODEL_REGISTRY = {
  "claude_opus_4_8":   { label: "Claude Opus 4.8",   provider: "anthropic", baseUrl: "https://openrouter.ai/api/v1",                          model: "anthropic/claude-opus-4.8" },
  "claude-sonnet-5":   { label: "Claude Sonnet 5",   provider: "anthropic", baseUrl: "https://openrouter.ai/api/v1",                          model: "anthropic/claude-sonnet-5" },
  "claude_sonnet_4_6": { label: "Claude Sonnet 4.6", provider: "anthropic", baseUrl: "https://openrouter.ai/api/v1",                          model: "anthropic/claude-sonnet-4.6" },
  "gpt_5_6_sol":       { label: "GPT-5.6 Sol",       provider: "openai",    baseUrl: "https://api.openai.com/v1",                              model: "gpt-5.6-sol" },
  "gpt_5_4":           { label: "GPT-5.4",           provider: "openai",    baseUrl: "https://api.openai.com/v1",                              model: "gpt-5.4" },
  "gpt_5_mini":        { label: "GPT-5 Mini",        provider: "openai",    baseUrl: "https://api.openai.com/v1",                              model: "gpt-5-mini" },
  "gemini_3_1_pro":    { label: "Gemini 3.1 Pro",   provider: "google",    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-3.1-pro" },
  "gemini_3_flash":    { label: "Gemini 3 Flash",   provider: "google",    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-3-flash" },
};

// ─── Provider base URL options ─────────────────────────────────────────
// Each provider can be reached through multiple endpoints. The user picks
// the one that works best for their setup (CORS-friendly proxy vs direct).
// When switching endpoints, the model name is auto-prefixed to match the
// endpoint's naming convention (e.g. "claude-opus-4.8" → "anthropic/claude-opus-4.8"
// for OpenRouter).
export const PROVIDER_BASE_URLS = {
  anthropic: [
    { label: "OpenRouter",     baseUrl: "https://openrouter.ai/api/v1",                          modelPrefix: "anthropic/", note: "CORS-friendly proxy. Works from the browser. Get a key at openrouter.ai/keys." },
    { label: "Anthropic Direct", baseUrl: "https://api.anthropic.com/v1",                        modelPrefix: "",            note: "Official Anthropic endpoint. Needs a CORS proxy for browser use. Get a key at console.anthropic.com." },
  ],
  openai: [
    { label: "OpenAI Direct",   baseUrl: "https://api.openai.com/v1",                            modelPrefix: "",            note: "Official OpenAI endpoint. May need a CORS proxy for browser use. Get a key at platform.openai.com." },
    { label: "OpenRouter",      baseUrl: "https://openrouter.ai/api/v1",                         modelPrefix: "openai/",     note: "CORS-friendly proxy. Works from the browser. Get a key at openrouter.ai/keys." },
  ],
  google: [
    { label: "Google AI Studio", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", modelPrefix: "",       note: "CORS-friendly. Free tier. Get a key at aistudio.google.com/apikey." },
    { label: "OpenRouter",       baseUrl: "https://openrouter.ai/api/v1",                              modelPrefix: "google/",  note: "CORS-friendly proxy. Get a key at openrouter.ai/keys." },
  ],
};

// ─── Hidden models (user preference) ───────────────────────────────────
// Users can hide models they don't use so the input picker stays clean.
// Hidden models are stored locally and filtered out of the ModelSelector.
const HIDDEN_MODELS_STORAGE = "ttt_builder_hidden_models";

export function getHiddenModels() {
  try { return JSON.parse(localStorage.getItem(HIDDEN_MODELS_STORAGE) || "[]"); } catch { return []; }
}
export function isModelHidden(id) {
  return getHiddenModels().includes(id);
}
export function setHiddenModel(id, hide) {
  const list = getHiddenModels();
  const idx = list.indexOf(id);
  if (hide && idx === -1) list.push(id);
  if (!hide && idx >= 0) list.splice(idx, 1);
  try { localStorage.setItem(HIDDEN_MODELS_STORAGE, JSON.stringify(list)); } catch {}
}

function _getHostedKeys() {
  try { return JSON.parse(localStorage.getItem(HOSTED_KEY_STORAGE) || "{}"); } catch { return {}; }
}
function _saveHostedKeys(obj) {
  try { localStorage.setItem(HOSTED_KEY_STORAGE, JSON.stringify(obj)); } catch {}
}

export function getHostedModelKey(id)      { return (_getHostedKeys()[id] || {}).key || ""; }
export function getHostedModelBaseUrl(id)  { const r = HOSTED_MODEL_REGISTRY[id]; return (_getHostedKeys()[id] || {}).baseUrl || r?.baseUrl || ""; }
export function getHostedModelName(id)     { const r = HOSTED_MODEL_REGISTRY[id]; return (_getHostedKeys()[id] || {}).model || r?.model || ""; }

export function setHostedModelKey(id, key) {
  const all = _getHostedKeys(); all[id] = { ...(all[id] || {}), key }; _saveHostedKeys(all);
}
export function setHostedModelBaseUrl(id, url) {
  const all = _getHostedKeys(); all[id] = { ...(all[id] || {}), baseUrl: url }; _saveHostedKeys(all);
}
export function setHostedModelName(id, name) {
  const all = _getHostedKeys(); all[id] = { ...(all[id] || {}), model: name }; _saveHostedKeys(all);
}

// Resolve a hosted model ID to a provider object for callLocalLlm.
// Returns null when no key is set (caller falls back to Base44 InvokeLLM).
export function resolveHostedModel(modelId) {
  const reg = HOSTED_MODEL_REGISTRY[modelId];
  if (!reg) return null;
  const key = getHostedModelKey(modelId);
  if (!key.trim()) return null;
  return {
    id: `hosted_${modelId}`,
    provider: reg.provider,
    label: reg.label,
    model: getHostedModelName(modelId) || reg.model,
    baseUrl: getHostedModelBaseUrl(modelId) || reg.baseUrl,
    apiKey: key,
  };
}