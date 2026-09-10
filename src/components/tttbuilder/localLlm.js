// Bring-your-own LLM providers for TTT Builder — open-source / local model support.
// Keys live ONLY in this browser's localStorage and are sent directly to the
// provider's API. They never touch Base44 or any other server.
// This is what makes the builder open-sourceable: a cloner brings their own keys
// here and the whole build workflow runs without Base44 integration credits.

const STORAGE_KEY = "ttt_builder_local_llm";

export const LOCAL_MODEL_PREFIX = "local:";

// Presets a cloner can pick from, or they can add a custom OpenAI-compatible endpoint.
// Each preset includes keyUrl (where to get an API key) and region info.
// Researched 2026-08 — covers all major Western + Chinese LLM providers.
export const PROVIDER_PRESETS = [
  // ─── Western providers (CORS-friendly for browser use) ───
  { provider: "groq", label: "Groq", baseUrl: "https://api.groq.com/openai/v1", keyUrl: "https://console.groq.com/keys", note: "Very fast, free tier, browser CORS-friendly.", placeholderModel: "llama-3.3-70b-versatile", region: "US", cors: true },
  { provider: "google", label: "Google Gemini (AI Studio)", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", keyUrl: "https://aistudio.google.com/apikey", note: "Free tier, browser CORS-friendly.", placeholderModel: "gemini-2.0-flash", region: "Global", cors: true },
  { provider: "openrouter", label: "OpenRouter (300+ models)", baseUrl: "https://openrouter.ai/api/v1", keyUrl: "https://openrouter.ai/keys", note: "Free + paid models from 60+ providers. Browser-friendly CORS. Use any model from any provider.", placeholderModel: "deepseek/deepseek-chat-v3.1:free", region: "Global", cors: true },
  { provider: "together", label: "Together AI", baseUrl: "https://api.together.xyz/v1", keyUrl: "https://api.together.xyz/settings/api-keys", note: "Free credits, browser CORS-friendly. 200+ open-source models.", placeholderModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free", region: "US", cors: true },
  { provider: "mistral", label: "Mistral AI", baseUrl: "https://api.mistral.ai/v1", keyUrl: "https://console.mistral.ai/api-keys", note: "Browser CORS-friendly. European provider.", placeholderModel: "mistral-small-latest", region: "EU", cors: true },

  // ─── Western providers (may need CORS proxy for browser use) ───
  { provider: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", keyUrl: "https://platform.openai.com/api-keys", note: "Official OpenAI. Routed through server proxy (CORS). Also on OpenRouter.", placeholderModel: "gpt-4o", region: "US", cors: false },
  { provider: "anthropic", label: "Anthropic (Claude)", baseUrl: "https://api.anthropic.com/v1", keyUrl: "https://console.anthropic.com", note: "Official Anthropic. Routed through server proxy (CORS). Use OpenRouter for browser-direct.", placeholderModel: "claude-sonnet-4-20250514", region: "US", cors: false },
  { provider: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com", keyUrl: "https://platform.deepseek.com/api_keys", note: "V4 models. OpenAI-compatible. Routed through server proxy (CORS). Also on OpenRouter.", placeholderModel: "deepseek-v4-flash", region: "China/Global", cors: false },
  { provider: "xai", label: "xAI (Grok)", baseUrl: "https://api.x.ai/v1", keyUrl: "https://console.x.ai", note: "Grok models. Routed through server proxy (CORS). Also on OpenRouter.", placeholderModel: "grok-3", region: "US", cors: false },
  { provider: "perplexity", label: "Perplexity", baseUrl: "https://api.perplexity.ai", keyUrl: "https://docs.perplexity.ai", note: "Online models. Routed through server proxy (CORS).", placeholderModel: "sonar", region: "US", cors: false },
  { provider: "fireworks", label: "Fireworks AI", baseUrl: "https://api.fireworks.ai/inference/v1", keyUrl: "https://fireworks.ai/api-keys", note: "200+ open-source models. Routed through server proxy (CORS).", placeholderModel: "accounts/fireworks/models/llama-v3p3-70b-instruct", region: "US", cors: false },
  { provider: "cerebras", label: "Cerebras", baseUrl: "https://api.cerebras.ai/v1", keyUrl: "https://cloud.cerebras.ai", note: "Ultra-fast inference. Routed through server proxy (CORS).", placeholderModel: "llama-3.3-70b", region: "US", cors: false },
  { provider: "hyperbolic", label: "Hyperbolic", baseUrl: "https://api.hyperbolic.xyz/v1", keyUrl: "https://hyperbolic.xyz", note: "Open-source GPU inference. Routed through server proxy (CORS).", placeholderModel: "meta-llama/Llama-3.3-70B-Instruct", region: "US", cors: false },

  // ─── Chinese providers (international endpoints) ───
  { provider: "qwen_intl", label: "Qwen / Alibaba (International)", baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", keyUrl: "https://bailian.console.aliyun.com", note: "Alibaba Qwen models. International endpoint. Routed through server proxy. Also on OpenRouter.", placeholderModel: "qwen-plus", region: "Global", cors: false },
  { provider: "moonshot_intl", label: "Moonshot / Kimi (International)", baseUrl: "https://api.moonshot.ai/v1", keyUrl: "https://platform.moonshot.ai", note: "Kimi K2/K3 models. International endpoint. Routed through server proxy. Also on OpenRouter.", placeholderModel: "kimi-k2", region: "Global", cors: false },
  { provider: "zhipu_intl", label: "Zhipu / GLM (International)", baseUrl: "https://api.z.ai/api/paas/v4", keyUrl: "https://z.ai/model-api", note: "GLM-4/5 models. International endpoint via z.ai. Routed through server proxy. Also on OpenRouter.", placeholderModel: "glm-4.6", region: "Global", cors: false },
  { provider: "minimax_intl", label: "MiniMax (International)", baseUrl: "https://api.minimax.io/v1", keyUrl: "https://platform.minimax.io", note: "MiniMax M3 models. International endpoint. Routed through server proxy. Also on OpenRouter.", placeholderModel: "MiniMax-M3", region: "Global", cors: false },

  // ─── Chinese providers (China endpoints) ───
  { provider: "qwen_cn", label: "Qwen / Alibaba (China)", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", keyUrl: "https://bailian.console.aliyun.com", note: "Alibaba Qwen models. China endpoint. Routed through server proxy.", placeholderModel: "qwen-plus", region: "China", cors: false },
  { provider: "moonshot_cn", label: "Moonshot / Kimi (China)", baseUrl: "https://api.moonshot.cn/v1", keyUrl: "https://platform.moonshot.cn", note: "Kimi models. China endpoint. Routed through server proxy.", placeholderModel: "kimi-k2", region: "China", cors: false },
  { provider: "zhipu_cn", label: "Zhipu / GLM (China)", baseUrl: "https://open.bigmodel.cn/api/paas/v4", keyUrl: "https://open.bigmodel.cn", note: "GLM models. China endpoint via bigmodel.cn. Routed through server proxy.", placeholderModel: "glm-4.6", region: "China", cors: false },
  { provider: "minimax_cn", label: "MiniMax (China)", baseUrl: "https://api.minimaxi.com/v1", keyUrl: "https://platform.minimaxi.com", note: "MiniMax models. China endpoint. Routed through server proxy.", placeholderModel: "MiniMax-M3", region: "China", cors: false },
  { provider: "baichuan", label: "Baichuan AI", baseUrl: "https://api.baichuan-ai.com/v1", keyUrl: "https://platform.baichuan-ai.com", note: "Baichuan models. China endpoint. Routed through server proxy.", placeholderModel: "Baichuan4-Turbo", region: "China", cors: false },
  { provider: "yi", label: "Yi / 01.AI", baseUrl: "https://api.lingyiwanwu.com/v1", keyUrl: "https://platform.lingyiwanwu.com", note: "Yi series models. China endpoint. Routed through server proxy.", placeholderModel: "yi-large", region: "China", cors: false },
  { provider: "stepfun", label: "StepFun", baseUrl: "https://api.stepfun.com/v1", keyUrl: "https://platform.stepfun.com", note: "Step models. China endpoint. Routed through server proxy.", placeholderModel: "step-2-16k", region: "China", cors: false },
  { provider: "doubao", label: "ByteDance / Doubao", baseUrl: "https://ark.cn-beijing.volces.com/api/v3", keyUrl: "https://console.volcengine.com/ark", note: "Doubao models via Volcano Engine Ark. China endpoint. Routed through server proxy.", placeholderModel: "doubao-pro-32k", region: "China", cors: false },
  { provider: "hunyuan", label: "Tencent Hunyuan", baseUrl: "https://api.hunyuan.cloud.tencent.com/v1", keyUrl: "https://cloud.tencent.com/product/hunyuan", note: "Tencent Hunyuan models. China endpoint. Routed through server proxy.", placeholderModel: "hunyuan-pro", region: "China", cors: false },
  { provider: "ernie", label: "Baidu ERNIE", baseUrl: "https://qianfan.baidubce.com/v2", keyUrl: "https://qianfan.cloud.baidu.com", note: "Baidu ERNIE models via Qianfan. China endpoint. Routed through server proxy.", placeholderModel: "ernie-4.0-8k", region: "China", cors: false },
  { provider: "spark", label: "iFlyTek Spark", baseUrl: "https://spark-api-open.xf-yun.com/v1", keyUrl: "https://xinghuo.xfyun.cn", note: "iFlyTek Spark models. China endpoint. Routed through server proxy.", placeholderModel: "generalv3.5", region: "China", cors: false },

  // ─── Local / Self-hosted ───
  { provider: "ollama", label: "Ollama (local)", baseUrl: "http://localhost:11434/v1", keyUrl: "https://ollama.com", note: "Run models locally with Ollama. No key needed. Run `ollama serve`.", placeholderModel: "llama3.1", region: "Local", cors: true },
  { provider: "custom", label: "Custom (OpenAI-compatible)", baseUrl: "", keyUrl: "", note: "Any OpenAI-compatible endpoint (LM Studio, vLLM, llama.cpp server, etc.)", placeholderModel: "my-model", region: "Custom", cors: true },
];

export function getLocalProviders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

// ENV-BASED PROVIDERS (safer than localStorage).
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
  const dsKey = (env.VITE_DEEPSEEK_API_KEY || "").trim();
  if (dsKey) {
    out.push({
      id: "env_deepseek",
      provider: "deepseek",
      label: "DeepSeek V4 (.env)",
      model: "deepseek-v4-flash",
      baseUrl: "https://api.deepseek.com",
      apiKey: dsKey,
      _env: true,
    });
  }
  const xaiKey = (env.VITE_XAI_API_KEY || "").trim();
  if (xaiKey) {
    out.push({
      id: "env_xai",
      provider: "xai",
      label: "xAI Grok (.env)",
      model: (env.VITE_XAI_MODEL || "grok-4.6").trim(),
      baseUrl: "https://api.x.ai/v1",
      apiKey: xaiKey,
      _env: true,
    });
  }
  const groqKey = (env.VITE_GROQ_API_KEY || "").trim();
  if (groqKey) {
    out.push({
      id: "env_groq",
      provider: "groq",
      label: "Groq (.env)",
      model: "llama-3.3-70b-versatile",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: groqKey,
      _env: true,
    });
  }
  const orKey = (env.VITE_OPENROUTER_API_KEY || "").trim();
  if (orKey) {
    out.push({
      id: "env_openrouter",
      provider: "openrouter",
      label: "OpenRouter (.env)",
      model: (env.VITE_OPENROUTER_MODEL || "deepseek/deepseek-chat-v3.1:free").trim(),
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: orKey,
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

// Build an OpenAI-compatible chat-completions request and call the provider.
// CORS-friendly providers (Groq, Google, OpenRouter, Ollama) call directly from
// the browser. Non-CORS providers (DeepSeek, OpenAI direct, Anthropic direct,
// most Chinese providers) are routed through the backend proxyLlmCall function
// so they actually work without CORS errors.
export async function callLocalLlm(args) {
  const mid = String(args.model || "");
  const provider = args._resolvedProvider
    || resolveLocalModel(args.model)
    || ((mid === GROK_BUILTIN || mid.startsWith("grok") || mid === "ttt_agent_1") ? pickGrokProvider() : null);
  if (!provider) throw new Error("Open model not found. Add Grok in Settings (console.x.ai) or set VITE_XAI_API_KEY.");
  const baseUrl = (provider.baseUrl || "").replace(/\/$/, "");
  if (!baseUrl) throw new Error(`"${provider.label}" has no base URL. Edit it in Open Models.`);

  // Check if this provider supports CORS (browser-direct) or needs a server proxy.
  // DeepSeek, OpenAI (direct), Anthropic (direct) all block browser CORS — route
  // them through the backend proxyLlmCall function so they actually work.
  const preset = PROVIDER_PRESETS.find(p => p.provider === provider.provider);
  const needsProxy = preset ? !preset.cors : true; // unknown providers default to proxy

  // Split system prompt (TTT Agent skills / base rules) from the task prompt.
  const systemContent = args.system || "";
  let userContent = args.prompt || "";
  const jsonSchema = args.response_json_schema || null;
  if (jsonSchema) {
    userContent += `\n\nRespond with ONLY valid JSON (no markdown fences, no commentary) matching this schema:\n${JSON.stringify(jsonSchema)}`;
  }

  const parts = [{ type: "text", text: userContent }];
  if (Array.isArray(args.file_urls)) {
    args.file_urls.forEach((u) => {
      if (typeof u === "string") parts.push({ type: "image_url", image_url: { url: u } });
    });
  }

  const messages = [];
  if (systemContent) messages.push({ role: "system", content: systemContent });
  messages.push({ role: "user", content: parts });

  // CORS-blocked providers go through same-origin /api/llm (Vercel + Vite).
  // Standalone has no Base44 proxyLlmCall — that path is dead here.
  let text;
  const TIMEOUT_MS = 120000;
  if (needsProxy && !(baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1"))) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          apiKey: provider.apiKey,
          model: provider.model,
          messages,
          temperature: 0.3,
          max_tokens: 16384,
          jsonMode: !!jsonSchema,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new Error(`${provider.label} timed out after ${TIMEOUT_MS / 1000}s.`);
      }
      throw new Error(`Could not reach ${provider.label} via /api/llm. ${err.message || "network error"}. Deploy this site (Vercel) or run npm run dev so the CORS proxy is available.`);
    } finally {
      clearTimeout(timer);
    }
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (res.status === 404 || ct.includes("text/html")) {
      throw new Error(`${provider.label} needs the /api/llm CORS proxy. Run npm run dev locally or deploy to Vercel.`);
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`${provider.label} error ${res.status}: ${txt.slice(0, 300)}`);
    }
    const data = await res.json();
    if (data?.error) throw new Error(`${provider.label} (proxy): ${data.error}`);
    const out = data?.choices?.[0]?.message?.content ?? data?.content;
    text = Array.isArray(out) ? out.map((p) => p.text || "").join("") : out;
    if (text == null) throw new Error(`${provider.label} (proxy) returned no content`);
  } else {
    const headers = { "Content-Type": "application/json" };
    if (provider.apiKey) headers["Authorization"] = `Bearer ${provider.apiKey}`;
    if (provider.provider === "openrouter") {
      headers["HTTP-Referer"] = typeof window !== "undefined" ? window.location.origin : "https://ttt-builder.vercel.app";
      headers["X-Title"] = "TTT Builder";
    }

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
          messages,
          temperature: 0.3,
          max_tokens: 16384,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new Error(`${provider.label} timed out after ${TIMEOUT_MS / 1000}s. Free models can queue — try again, pick a faster/paid model, or use Google AI Studio / Ollama.`);
      }
      throw new Error(`Could not reach ${provider.label} (${baseUrl}). ${err.message || "network error"}. This provider likely blocks browser requests (CORS). Use a browser-friendly provider instead: Groq (console.groq.com — free, fast), Google Gemini (aistudio.google.com — free), or OpenRouter (openrouter.ai).`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`${provider.label} error ${res.status}: ${txt.slice(0, 300)}`);
    }

    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content;
    text = Array.isArray(out) ? out.map((p) => p.text || "").join("") : out;
    if (text == null) throw new Error(`${provider.label} returned no content`);
  }

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
  "deepseek_v4_pro":   { label: "DeepSeek V4 Pro",  provider: "deepseek",  baseUrl: "https://api.deepseek.com",                                model: "deepseek-v4-pro" },
  "deepseek_v4_flash": { label: "DeepSeek V4 Flash", provider: "deepseek",  baseUrl: "https://api.deepseek.com",                                model: "deepseek-v4-flash" },
  "grok_4":            { label: "Grok 4.6",         provider: "xai",      baseUrl: "https://api.x.ai/v1",                                      model: "grok-4.6" },
  "grok_3":            { label: "Grok 3",           provider: "xai",      baseUrl: "https://api.x.ai/v1",                                      model: "grok-3" },
};

export const PROVIDER_BASE_URLS = {
  anthropic: [
    { label: "OpenRouter",     baseUrl: "https://openrouter.ai/api/v1",                          modelPrefix: "anthropic/", note: "CORS-friendly proxy. Works from the browser. Get a key at openrouter.ai/keys." },
    { label: "Anthropic Direct", baseUrl: "https://api.anthropic.com/v1",                        modelPrefix: "",            note: "Official Anthropic endpoint. Routed through server proxy. Get a key at console.anthropic.com." },
  ],
  openai: [
    { label: "OpenAI Direct",   baseUrl: "https://api.openai.com/v1",                            modelPrefix: "",            note: "Official OpenAI endpoint. Routed through server proxy. Get a key at platform.openai.com." },
    { label: "OpenRouter",      baseUrl: "https://openrouter.ai/api/v1",                         modelPrefix: "openai/",     note: "CORS-friendly proxy. Works from the browser. Get a key at openrouter.ai/keys." },
  ],
  google: [
    { label: "Google AI Studio", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", modelPrefix: "",       note: "CORS-friendly. Free tier. Get a key at aistudio.google.com/apikey." },
    { label: "OpenRouter",       baseUrl: "https://openrouter.ai/api/v1",                              modelPrefix: "google/",  note: "CORS-friendly proxy. Get a key at openrouter.ai/keys." },
  ],
  deepseek: [
    { label: "DeepSeek Direct",  baseUrl: "https://api.deepseek.com",                                  modelPrefix: "",          note: "Official DeepSeek endpoint. Routed through server proxy (CORS-safe). Get a key at platform.deepseek.com/api_keys." },
    { label: "OpenRouter",       baseUrl: "https://openrouter.ai/api/v1",                             modelPrefix: "deepseek/", note: "CORS-friendly proxy. Works from the browser directly. Get a key at openrouter.ai/keys." },
  ],
  xai: [
    { label: "xAI Direct",  baseUrl: "https://api.x.ai/v1",                 modelPrefix: "",     note: "Official xAI endpoint. Uses /api/llm CORS proxy in this build. Get a key at console.x.ai." },
    { label: "OpenRouter",  baseUrl: "https://openrouter.ai/api/v1",        modelPrefix: "x-ai/", note: "CORS-friendly proxy. Works from the browser. Get a key at openrouter.ai/keys." },
  ],
};

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

export const GROK_BUILTIN = "grok_builtin";
export const GROK_MODEL = "grok-4.6";

export function pickGrokProvider() {
  const all = getAllProviders();
  const grok = all.find((p) => p.provider === "xai" || String(p.model || "").toLowerCase().startsWith("grok"));
  if (grok) return grok;
  const hosted = resolveHostedModel("grok_4") || resolveHostedModel("grok_3");
  if (hosted) return hosted;
  return {
    id: GROK_BUILTIN,
    provider: "xai",
    label: "Grok 4.6",
    model: GROK_MODEL,
    baseUrl: "https://api.x.ai/v1",
    apiKey: "",
  };
}

function rankProvider(p) {
  const m = String(p.model || "").toLowerCase();
  const u = String(p.baseUrl || "").toLowerCase();
  if (p.provider === "xai" || m.startsWith("grok")) return 0;
  if (p.provider === "openrouter") return 1;
  if (p.provider === "google" || p.provider === "groq") return 2;
  if (p.provider === "deepseek") return 3;
  if (u.includes("localhost") || u.includes("127.0.0.1") || p.provider === "ollama") return 9;
  return 5;
}

/** Pick a model the standalone build can actually call. TTT Agent 1 prefers Grok. */
export function resolveBuildModel(modelId) {
  const id = String(modelId || "");
  if (isLocalModelId(id) && resolveLocalModel(id)) return id;
  if (resolveHostedModel(id)) return id;
  if (id === "ttt_agent_1" || id === "automatic" || id === GROK_BUILTIN || id.startsWith("grok")) {
    const g = pickGrokProvider();
    if (g.id && g.id !== GROK_BUILTIN) return LOCAL_MODEL_PREFIX + g.id;
    return GROK_BUILTIN;
  }
  const providers = [...getAllProviders()].sort((a, b) => rankProvider(a) - rankProvider(b));
  if (providers.length && rankProvider(providers[0]) < 9) return LOCAL_MODEL_PREFIX + providers[0].id;
  for (const hid of Object.keys(HOSTED_MODEL_REGISTRY)) {
    if ((getHostedModelKey(hid) || "").trim()) return hid;
  }
  return GROK_BUILTIN;
}