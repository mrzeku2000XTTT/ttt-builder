import React, { useState } from "react";
import { Code2, X, Wand2 } from "lucide-react";

export default function PasteHtmlButton({ onConvert, disabled }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");

  const submit = () => {
    if (!code.trim()) return;
    onConvert(code);
    setCode("");
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-purple-500/15 border border-purple-400/40 text-purple-200 text-xs font-bold hover:bg-purple-500/25 disabled:opacity-40 transition-colors"
        title="Paste HTML and convert it into a full React app"
      >
        <Code2 className="w-3.5 h-3.5" />
        Paste HTML → React
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-[#161b22] border border-white/10 rounded-2xl w-full max-w-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Code2 className="w-4 h-4 text-purple-300" />
              <h3 className="font-bold text-sm text-white">Paste HTML → full React app</h3>
              <button onClick={() => setOpen(false)} className="ml-auto text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-white/40 mb-3">
              Paste any HTML (a landing page, a template, an exported design). TTT Agent 1 will rebuild it as a real
              React + Vite project — split into components, with routing, live data and the Kaspa wallet wired in.
            </p>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="<!DOCTYPE html> …"
              className="w-full h-64 bg-black/40 border border-white/10 rounded-xl p-3 text-[11px] font-mono text-white/80 outline-none focus:border-purple-400/50 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 h-10 rounded-xl bg-white/5 text-white/60 hover:text-white text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!code.trim()}
                className="flex-1 h-10 rounded-xl bg-purple-500 text-white text-sm font-bold hover:bg-purple-500/90 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Wand2 className="w-4 h-4" /> Convert to React app
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}