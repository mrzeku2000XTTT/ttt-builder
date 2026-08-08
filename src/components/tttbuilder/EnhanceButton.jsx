import React, { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { enhancePrompt } from "@/components/tttbuilder/promptEnhancer";

export default function EnhanceButton({ prompt, onEnhanced, buildMode, hasProject, disabled }) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    try {
      const better = await enhancePrompt(prompt, { buildMode, hasProject });
      onEnhanced(better);
    } catch {
      /* keep the original prompt on failure */
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={disabled || busy || !prompt.trim()}
      title="Enhance my prompt"
      className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-white/60 hover:text-white hover:border-[#70C7BA]/40 disabled:opacity-30 transition-colors"
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
      {busy ? "Enhancing…" : "Enhance"}
    </button>
  );
}