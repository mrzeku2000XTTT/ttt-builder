import React, { useState } from "react";
import { LayoutGrid, X, Loader2, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Generates 4 distinct design-direction mockups (like Base44's design picker)
// so the user can choose a direction before building the full app.
const DESIGN_STYLES = [
  { id: "minimal", label: "Minimal", blurb: "Clean whitespace, single accent, system fonts" },
  { id: "glass", label: "Glass", blurb: "Frosted glass cards, blur, depth, dark mode" },
  { id: "bold", label: "Bold", blurb: "Big type, high contrast, strong color blocks" },
  { id: "soft", label: "Soft", blurb: "Rounded, pastel, friendly, generous spacing" },
];

export default function DesignOptionsButton({ prompt, onPick, disabled }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState([]);
  const [err, setErr] = useState("");

  const generate = async () => {
    if (!prompt?.trim()) return;
    setBusy(true);
    setErr("");
    setOptions([]);
    try {
      const raw = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a design director. The user wants to build: "${prompt}".
Generate 4 DISTINCT visual design directions. For each, return a short name (2 words), a one-sentence visual description, a 3-color palette (hex), and a font pairing.
Return JSON: { "options": [{ "name": "...", "description": "...", "colors": ["#...", "#...", "#..."], "fonts": "Display / Body" }] }`,
        response_json_schema: {
          type: "object",
          properties: {
            options: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  colors: { type: "array", items: { type: "string" } },
                  fonts: { type: "string" },
                },
              },
            },
          },
        },
      });
      const data = raw?.options || raw?.response?.options || [];
      setOptions(data.length ? data : DESIGN_STYLES.map(s => ({ name: s.label, description: s.blurb, colors: ["#70C7BA", "#0d1117", "#e6edf3"], fonts: "Inter / Inter" })));
    } catch (e) {
      setErr(e.message || "Failed to generate options");
      setOptions(DESIGN_STYLES.map(s => ({ name: s.label, description: s.blurb, colors: ["#70C7BA", "#0d1117", "#e6edf3"], fonts: "Inter / Inter" })));
    } finally {
      setBusy(false);
    }
  };

  const pick = (opt, idx) => {
    const styleHint = `Design direction: ${opt.name}. ${opt.description}. Palette: ${opt.colors?.join(", ")}. Fonts: ${opt.fonts}.`;
    onPick(styleHint);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled || !prompt?.trim()}
        className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-purple-500/15 border border-purple-400/40 text-purple-200 text-[11px] font-bold hover:bg-purple-500/25 disabled:opacity-40 transition-colors"
        title="Show 4 design directions to pick from"
      >
        <LayoutGrid className="w-3 h-3" /> Designs
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
          onClick={(e) => e.target === e.currentTarget && !busy && setOpen(false)}
        >
          <div className="bg-[#161b22] border border-white/10 rounded-2xl w-full max-w-3xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <LayoutGrid className="w-4 h-4 text-purple-300" />
              <h3 className="font-bold text-sm text-white">Pick a design direction</h3>
              <button onClick={() => !busy && setOpen(false)} className="ml-auto text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-white/40 mb-4">
              4 distinct directions for: <span className="text-white/70">"{prompt?.slice(0, 80)}"</span>
            </p>

            {!options.length && !busy && (
              <div className="text-center py-8">
                <button
                  onClick={generate}
                  className="h-10 px-5 rounded-xl bg-purple-500 text-white text-sm font-bold hover:bg-purple-500/90"
                >
                  Generate 4 design directions
                </button>
                {err && <p className="text-[11px] text-red-400 mt-2">{err}</p>}
              </div>
            )}

            {busy && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-purple-300" />
                <span className="ml-2 text-sm text-white/50">Designing 4 directions…</span>
              </div>
            )}

            {options.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => pick(opt, i)}
                    className="text-left p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-purple-400/50 hover:bg-purple-500/10 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-1">
                        {opt.colors?.slice(0, 3).map((c, j) => (
                          <span key={j} className="w-5 h-5 rounded-full border border-white/20" style={{ background: c }} />
                        ))}
                      </div>
                      <span className="font-bold text-sm text-white">{opt.name}</span>
                      <Check className="w-4 h-4 ml-auto text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-white/50 mb-2">{opt.description}</p>
                    <p className="text-[10px] text-white/30 font-mono">{opt.fonts}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}