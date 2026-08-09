import React, { useState } from "react";
import { Cpu } from "lucide-react";
import { getLocalProviders, getAllProviders, LOCAL_MODEL_PREFIX, isModelHidden } from "./localLlm";
import { isStandalone } from "./OnboardingModal";
import OpenModelsTab from "./OpenModelsTab";
import GeminiKeyModal from "./GeminiKeyModal";

export const BUILDER_MODELS = [
  { id: "ttt_agent_1", label: "TTT Agent 1 ⚡" },
  { id: "automatic", label: "Auto (best available)" },
  { id: "claude_opus_4_8", label: "Claude Opus 4.8" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
  { id: "claude_sonnet_4_6", label: "Claude Sonnet 4.6" },
  { id: "gpt_5_6_sol", label: "GPT-5.6 Sol" },
  { id: "gpt_5_4", label: "GPT-5.4" },
  { id: "gemini_3_1_pro", label: "Gemini 3.1 Pro" },
  { id: "gemini_3_flash", label: "Gemini 3 Flash (fast)" },
  { id: "gpt_5_mini", label: "GPT-5 Mini (fast)" },
];

const ADD_VALUE = "__add_local__";
const GEMINI_QUICK = "__gemini_quick__";

export default function ModelSelector({ value, onChange, disabled, variant = "dark", onOpenSettings }) {
  const standalone = isStandalone();
  const [mgrOpen, setMgrOpen] = useState(false);
  const [geminiOpen, setGeminiOpen] = useState(false);
  const [, forceTick] = useState(0);
  // In standalone, the picker lists every configured provider (localStorage + .env).
  // Hosted keeps the localStorage-only list (add flows live there too).
  const local = standalone ? getAllProviders() : getLocalProviders();

  const handleChange = (v) => {
    if (v === ADD_VALUE) {
      // Models other than TTT Agent 1 need an API key — route to Settings to configure.
      if (onOpenSettings) { onOpenSettings(); return; }
      setMgrOpen(true);
      return; // keep current selection
    }
    if (v === GEMINI_QUICK) {
      if (onOpenSettings) { onOpenSettings(); return; }
      setGeminiOpen(true);
      return; // keep current selection
    }
    onChange(v);
  };

  const isLight = variant === "light";

  return (
    <>
      <label className={`flex items-center gap-1.5 h-8 pl-2 pr-1 rounded-lg transition-colors cursor-pointer ${
        isLight
          ? "bg-transparent border border-transparent text-[#5a554f] hover:text-[#1a1614]"
          : "bg-white/5 border border-white/10 text-white/60 hover:text-white"
      }`}>
        <Cpu className="w-3.5 h-3.5 flex-shrink-0" />
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className={`bg-transparent outline-none text-[11px] font-bold cursor-pointer disabled:opacity-40 max-w-[150px] ${
            isLight ? "text-[#1a1614]" : "text-white/70"
          }`}
        >
          {/* Hosted models only exist on the Base44 platform — hidden in standalone */}
          {!standalone && (
            <optgroup label="Hosted">
              {BUILDER_MODELS.filter((m) => !isModelHidden(m.id)).map((m) => (
                <option key={m.id} value={m.id} className="bg-[#161b22] text-white">{m.label}</option>
              ))}
            </optgroup>
          )}
          {standalone && local.length === 0 && (
            <option value="" disabled className="bg-[#161b22] text-white/50">No model — add one in Settings</option>
          )}
          {local.length > 0 && (
            <optgroup label={standalone ? "Open / Local" : "Open / Local"}>
              {local.map((p) => (
                <option key={p.id} value={`${LOCAL_MODEL_PREFIX}${p.id}`} className="bg-[#161b22] text-white">
                  {p.label}{p._env ? " 🔒" : ""}
                </option>
              ))}
            </optgroup>
          )}
          {/* Add flows: hosted app keeps them in the picker; standalone moves setup to Settings */}
          {!standalone && (
            <>
              <option value={GEMINI_QUICK} className="bg-[#161b22] text-[#4285F4]">★ Gemini Flash (free — add key)</option>
              <option value={ADD_VALUE} className="bg-[#161b22] text-white">+ Add open model...</option>
            </>
          )}
        </select>
      </label>
      <OpenModelsTab
        open={mgrOpen}
        onClose={() => { setMgrOpen(false); forceTick((t) => t + 1); }}
        onAdded={(entry) => { onChange(`${LOCAL_MODEL_PREFIX}${entry.id}`); setMgrOpen(false); forceTick((t) => t + 1); }}
      />
      <GeminiKeyModal
        open={geminiOpen}
        onClose={() => { setGeminiOpen(false); forceTick((t) => t + 1); }}
        onSaved={(entry) => { onChange(`${LOCAL_MODEL_PREFIX}${entry.id}`); setGeminiOpen(false); forceTick((t) => t + 1); }}
      />
    </>
  );
}