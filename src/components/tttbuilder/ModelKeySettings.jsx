import React, { useState } from "react";
import { KeyRound, Eye, EyeOff, ChevronDown, ChevronUp, Cpu, ShieldCheck } from "lucide-react";
import { BUILDER_MODELS } from "./ModelSelector";
import {
  HOSTED_MODEL_REGISTRY,
  getHostedModelKey,
  setHostedModelKey,
  getHostedModelBaseUrl,
  setHostedModelBaseUrl,
  getHostedModelName,
  setHostedModelName,
} from "./localLlm";

export default function ModelKeySettings({ model, onChangeModel, loading }) {
  const [expanded, setExpanded] = useState(null);
  const [showKey, setShowKey] = useState({});
  const [, forceTick] = useState(0);
  const refresh = () => forceTick((t) => t + 1);

  return (
    <div className="space-y-1.5">
      {/* Built-in note */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#70C7BA]/8 border border-[#70C7BA]/20 mb-1">
        <ShieldCheck className="w-3.5 h-3.5 text-[#70C7BA] flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-white/60 leading-relaxed">
          <b className="text-white/80">TTT Agent 1</b> uses the built-in Base44 engine — no key needed. All other models call the provider <b>directly from your browser</b> using the key you enter here. Keys are stored locally, never sent to Base44.
        </p>
      </div>

      {BUILDER_MODELS.map((m) => {
        const isBuiltin = m.id === "ttt_agent_1" || m.id === "automatic";
        const reg = HOSTED_MODEL_REGISTRY[m.id];
        const active = model === m.id;
        const isExpanded = expanded === m.id;
        const hasKey = !isBuiltin && !!getHostedModelKey(m.id);

        return (
          <div
            key={m.id}
            className={`rounded-lg border transition-colors ${
              active ? "border-[#70C7BA]/40 bg-[#70C7BA]/8" : "border-white/[0.06] bg-white/[0.02]"
            }`}
          >
            {/* Row header — click to select */}
            <div className="flex items-center gap-1.5 px-2.5 py-2">
              <button
                onClick={() => !loading && onChangeModel(m.id)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? "bg-[#70C7BA]" : "bg-white/20"}`} />
                <span className={`text-xs font-bold truncate ${active ? "text-white" : "text-white/60"}`}>
                  {m.label}
                </span>
                {isBuiltin ? (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#70C7BA]/20 text-[#70C7BA] flex-shrink-0">
                    BUILT-IN
                  </span>
                ) : hasKey ? (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                    KEY SET
                  </span>
                ) : (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400/80 flex-shrink-0">
                    NO KEY
                  </span>
                )}
              </button>

              {/* Expand toggle for external models */}
              {!isBuiltin && reg && (
                <button
                  onClick={() => setExpanded(isExpanded ? null : m.id)}
                  className="text-white/30 hover:text-white/60 p-1 flex-shrink-0"
                  title="Configure API key"
                >
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Expanded key config */}
            {!isBuiltin && isExpanded && reg && (
              <div className="px-2.5 pb-2.5 space-y-2 border-t border-white/[0.04] pt-2">
                {/* API key */}
                <div className="relative">
                  <KeyRound className="w-3 h-3 text-white/30 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showKey[m.id] ? "text" : "password"}
                    defaultValue={getHostedModelKey(m.id)}
                    onChange={(e) => { setHostedModelKey(m.id, e.target.value); refresh(); }}
                    placeholder={`${reg.provider} API key…`}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-8 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/40 font-mono"
                  />
                  <button
                    onClick={() => setShowKey((s) => ({ ...s, [m.id]: !s[m.id] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    type="button"
                  >
                    {showKey[m.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>

                {/* Base URL + model name */}
                <div className="flex gap-1.5">
                  <input
                    defaultValue={getHostedModelBaseUrl(m.id)}
                    onChange={(e) => setHostedModelBaseUrl(m.id, e.target.value)}
                    placeholder={reg.baseUrl}
                    className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white/70 placeholder:text-white/30 outline-none focus:border-[#70C7BA]/40 font-mono"
                  />
                  <input
                    defaultValue={getHostedModelName(m.id)}
                    onChange={(e) => setHostedModelName(m.id, e.target.value)}
                    placeholder={reg.model}
                    className="w-28 flex-shrink-0 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white/70 placeholder:text-white/30 outline-none focus:border-[#70C7BA]/40 font-mono"
                  />
                </div>

                <p className="text-[9px] text-white/30 leading-relaxed">
                  Defaults use {reg.provider === "google" ? "Google AI Studio (CORS-friendly)" : reg.provider === "anthropic" ? "OpenRouter (CORS-friendly proxy for Anthropic)" : "OpenAI direct (may need a CORS proxy)"}. Edit the URL to use a custom proxy.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}