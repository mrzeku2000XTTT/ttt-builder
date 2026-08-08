import React, { useState } from "react";
import { X, Plus, Trash2, KeyRound } from "lucide-react";
import { getLocalProviders, saveLocalProvider, removeLocalProvider, PROVIDER_PRESETS } from "./localLlm";

/**
 * OpenModelsTab — manage bring-your-own-key LLM providers (OpenRouter, DeepSeek,
 * Ollama, any OpenAI-compatible endpoint). Keys are stored only in the browser.
 */
export default function OpenModelsTab({ open, onClose }) {
  const [list, setList] = useState(() => getLocalProviders());
  const [provider, setProvider] = useState("openrouter");
  const [label, setLabel] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState(PROVIDER_PRESETS[0].baseUrl);
  const [apiKey, setApiKey] = useState("");
  const [err, setErr] = useState("");

  if (!open) return null;
  const preset = PROVIDER_PRESETS.find((p) => p.provider === provider) || PROVIDER_PRESETS[0];

  const refresh = () => setList(getLocalProviders());

  const onPresetChange = (p) => {
    setProvider(p);
    const pr = PROVIDER_PRESETS.find((x) => x.provider === p);
    if (pr) setBaseUrl(pr.baseUrl);
  };

  const add = () => {
    setErr("");
    if (!model.trim()) { setErr("Enter a model name."); return; }
    if (!baseUrl.trim()) { setErr("Enter a base URL."); return; }
    saveLocalProvider({
      provider,
      label: label.trim() || `${preset.label} · ${model.trim()}`,
      model: model.trim(),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
    });
    setLabel(""); setModel(""); setApiKey("");
    refresh();
  };

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
          Keys are stored <b>only in this browser</b> (localStorage) and sent directly to the provider. They never touch Base44 or any other server. Anyone who clones this repo brings their own keys here - the whole build workflow then runs on their own models, no integration credits.
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
          <div className="grid grid-cols-2 gap-2">
            <select
              value={provider}
              onChange={(e) => onPresetChange(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none"
            >
              {PROVIDER_PRESETS.map((p) => (
                <option key={p.provider} value={p.provider} className="bg-[#161b22]">{p.label}</option>
              ))}
            </select>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (optional)"
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white placeholder:text-white/30 outline-none"
            />
          </div>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={`Model name, e.g. ${preset.placeholderModel}`}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white placeholder:text-white/30 outline-none"
          />
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="Base URL"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white placeholder:text-white/30 outline-none"
          />
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
            placeholder={provider === "ollama" ? "API key (not needed for local Ollama)" : "API key"}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white placeholder:text-white/30 outline-none"
          />
          <p className="text-[10px] text-white/40 leading-relaxed">{preset.note}</p>
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