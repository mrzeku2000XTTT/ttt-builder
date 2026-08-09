import React, { useState } from "react";
import { X, Plus, Trash2, KeyRound, ChevronDown, ChevronRight, ExternalLink, Globe } from "lucide-react";
import { getLocalProviders, saveLocalProvider, removeLocalProvider, PROVIDER_PRESETS } from "./localLlm";

/**
 * OpenModelsTab — manage bring-your-own-key LLM providers.
 * Model-first: paste any model string (e.g. nvidia/nemotron-3-super-120b-a12b:free)
 * and the provider is auto-detected. Keys are stored only in the browser.
 */
export default function OpenModelsTab({ open, onClose, onAdded }) {
  const [list, setList] = useState(() => getLocalProviders());
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [nickname, setNickname] = useState("");
  const [provider, setProvider] = useState("openrouter");
  const [baseUrl, setBaseUrl] = useState(PROVIDER_PRESETS[0].baseUrl);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [err, setErr] = useState("");

  if (!open) return null;

  const refresh = () => setList(getLocalProviders());

  // Auto-detect provider from the model string.
  const autoDetectProvider = (modelStr) => {
    const s = modelStr.toLowerCase();
    if (s.startsWith("gemini") || s.startsWith("gemma")) return "google";
    if (s.startsWith("llama-") || s.startsWith("meta-llama") || s.startsWith("mixtral") || s.includes("groq")) return "groq";
    if (s.startsWith("deepseek")) return "deepseek";
    if (s.startsWith("mistral") || s.startsWith("codestral") || s.startsWith("pixtral")) return "mistral";
    if (s.startsWith("qwen") || s.includes("qwen")) return "qwen_intl";
    if (s.startsWith("kimi") || s.includes("moonshot")) return "moonshot_intl";
    if (s.startsWith("glm") || s.includes("zhipu") || s.includes("chatglm")) return "zhipu_intl";
    if (s.startsWith("minimax") || s.includes("minimax")) return "minimax_intl";
    if (s.startsWith("baichuan")) return "baichuan";
    if (s.startsWith("yi-") || s.startsWith("yi_")) return "yi";
    if (s.startsWith("step")) return "stepfun";
    if (s.startsWith("doubao")) return "doubao";
    if (s.startsWith("hunyuan")) return "hunyuan";
    if (s.startsWith("ernie")) return "ernie";
    if (s.startsWith("spark") || s.startsWith("generalv")) return "spark";
    if (s.startsWith("grok")) return "xai";
    if (s.includes("/")) return "openrouter";
    return provider; // keep current (custom/ollama) otherwise
  };

  const onModelChange = (val) => {
    setModel(val);
    const detected = autoDetectProvider(val);
    if (detected !== provider) {
      setProvider(detected);
      const pr = PROVIDER_PRESETS.find((x) => x.provider === detected);
      if (pr) setBaseUrl(pr.baseUrl);
    }
  };

  const onPresetChange = (p) => {
    setProvider(p);
    const pr = PROVIDER_PRESETS.find((x) => x.provider === p);
    if (pr) setBaseUrl(pr.baseUrl);
  };

  const add = () => {
    setErr("");
    if (!model.trim()) { setErr("Enter a model name."); return; }
    if (!baseUrl.trim()) { setErr("Enter a base URL."); return; }
    const preset = PROVIDER_PRESETS.find((p) => p.provider === provider) || PROVIDER_PRESETS[0];
    const entry = saveLocalProvider({
      provider,
      label: nickname.trim() || model.trim(),
      model: model.trim(),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
    });
    setNickname(""); setModel(""); setApiKey("");
    refresh();
    onAdded?.(entry);
  };

  const preset = PROVIDER_PRESETS.find((p) => p.provider === provider) || PROVIDER_PRESETS[0];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#161b22] border border-white/10 rounded-2xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-5 h-5 text-[#70C7BA]" />
          <h2 className="font-bold text-white text-base">Open Models - Bring Your Own</h2>
          <button onClick={onClose} className="ml-auto text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="text-[11px] text-white/60 mb-4 px-2.5 py-2 rounded-lg bg-[#70C7BA]/10 border border-[#70C7BA]/20 leading-relaxed">
          Keys are stored <b>only in this browser</b> (localStorage) and sent directly to the provider. They never touch Base44 or any other server. Paste any model name — the provider is auto-detected.
        </div>

        {list.length > 0 && (
          <div className="space-y-1.5 mb-4">
            {list.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-[#70C7BA] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">{p.label}</div>
                  <div className="text-[10px] text-white/40 truncate">{p.model} - {p.baseUrl}</div>
                </div>
                <button onClick={() => { removeLocalProvider(p.id); refresh(); }} className="text-white/40 hover:text-red-400 flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 border-t border-white/10 pt-4">
          <div className="text-xs font-bold text-white/70">Add a model</div>
          <input
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            placeholder="Paste any model, e.g. nvidia/nemotron-3-super-120b-a12b:free"
            className="w-full bg-white/5 border border-[#70C7BA]/30 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/60"
            autoFocus
          />
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Nickname (e.g. Free Key, Paid Key, Work)"
            className="w-full bg-white/5 border border-[#70C7BA]/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/60"
          />
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
            placeholder={provider === "ollama" ? "API key (not needed for local Ollama)" : "API key"}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none"
          />

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white/80 transition-colors mt-1"
          >
            {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Advanced (provider & base URL)
          </button>

          {showAdvanced && (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={provider}
                  onChange={(e) => onPresetChange(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none"
                >
                  <optgroup label="CORS-friendly (browser)" className="bg-[#161b22]">
                    {PROVIDER_PRESETS.filter((p) => p.cors && p.region !== "Local").map((p) => (
                      <option key={p.provider} value={p.provider} className="bg-[#161b22]">{p.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Western (may need proxy)" className="bg-[#161b22]">
                    {PROVIDER_PRESETS.filter((p) => !p.cors && p.region !== "China" && p.region !== "Local" && p.region !== "Custom").map((p) => (
                      <option key={p.provider} value={p.provider} className="bg-[#161b22]">{p.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Chinese (international)" className="bg-[#161b22]">
                    {PROVIDER_PRESETS.filter((p) => p.region === "Global" && (p.provider.includes("qwen") || p.provider.includes("moonshot") || p.provider.includes("zhipu") || p.provider.includes("minimax"))).map((p) => (
                      <option key={p.provider} value={p.provider} className="bg-[#161b22]">{p.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Chinese (China endpoints)" className="bg-[#161b22]">
                    {PROVIDER_PRESETS.filter((p) => p.region === "China").map((p) => (
                      <option key={p.provider} value={p.provider} className="bg-[#161b22]">{p.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Local / Self-hosted" className="bg-[#161b22]">
                    {PROVIDER_PRESETS.filter((p) => p.region === "Local" || p.region === "Custom").map((p) => (
                      <option key={p.provider} value={p.provider} className="bg-[#161b22]">{p.label}</option>
                    ))}
                  </optgroup>
                </select>
                <input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="Base URL"
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white placeholder:text-white/30 outline-none"
                />
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed">{preset.note}</p>
              {/* Key link */}
              {preset.keyUrl && (
                <a
                  href={preset.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-[#70C7BA] hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Get API key from {preset.label}
                </a>
              )}
              {/* OpenRouter alternative */}
              {preset.provider !== "openrouter" && preset.provider !== "ollama" && preset.provider !== "custom" && (
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-[#70C7BA] hover:underline flex items-center gap-1"
                >
                  <Globe className="w-3 h-3" /> Or use this model via OpenRouter (CORS-friendly)
                </a>
              )}
            </div>
          )}

          {err && <p className="text-[10px] text-red-400">{err}</p>}
          <button
            onClick={add}
            className="w-full h-9 rounded-lg bg-[#70C7BA] text-black text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#70C7BA]/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add model
          </button>
        </div>
      </div>
    </div>
  );
}