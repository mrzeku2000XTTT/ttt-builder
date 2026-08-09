import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, KeyRound, Sparkles, ExternalLink, Check, Loader2 } from "lucide-react";
import { getLocalProviders, saveLocalProvider, LOCAL_MODEL_PREFIX } from "./localLlm";

// Quick Gemini setup — the user only pastes their free AI Studio key.
// Everything is stored in localStorage and sent directly to Google's API.
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";

export default function GeminiKeyModal({ open, onClose, onSaved }) {
  const [apiKey, setApiKey] = useState("");
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) { setApiKey(""); setNickname(""); setErr(""); setBusy(false); }
  }, [open]);

  // If a Gemini provider already exists, just select it instead of asking again.
  const existing = open ? getLocalProviders().find(
    (p) => p.provider === "google" && p.model === GEMINI_MODEL
  ) : null;

  useEffect(() => {
    if (open && existing && onSaved) {
      onSaved(existing);
      onClose();
    }
  }, [open, existing, onSaved, onClose]);

  const save = async () => {
    setErr("");
    if (!apiKey.trim()) { setErr("Paste your Gemini API key."); return; }
    setBusy(true);
    // Quick connectivity check — verifies the key works before saving.
    try {
      const res = await fetch(`${GEMINI_BASE}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey.trim()}` },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          messages: [{ role: "user", content: "Reply with the single word: ok" }],
          temperature: 0,
          max_tokens: 5,
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Key rejected (${res.status}). ${t.slice(0, 200)}`);
      }
    } catch (e) {
      setBusy(false);
      setErr(e.message || "Could not verify the key. Check it and try again.");
      return;
    }

    const entry = saveLocalProvider({
      provider: "google",
      label: nickname.trim() || "Gemini Flash (free)",
      model: GEMINI_MODEL,
      baseUrl: GEMINI_BASE,
      apiKey: apiKey.trim(),
    });
    setBusy(false);
    if (onSaved) onSaved(entry);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && !existing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
          onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-md"
          >
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
              <Sparkles className="w-5 h-5 text-[#4285F4]" />
              <h2 className="font-bold text-white text-base">Gemini Flash — free</h2>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#4285F4]/20 text-[#4285F4] ml-1">LOCAL KEY</span>
              <button onClick={onClose} className="ml-auto text-white/40 hover:text-white" disabled={busy}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-white/40 text-xs leading-relaxed">
                Google's Gemini 2.0 Flash has a generous free tier and works straight from your browser. Get a key in 10 seconds — no credit card.
              </p>

              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#4285F4] text-xs font-bold hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Get a free key at aistudio.google.com/apikey
              </a>

              <div>
                <label className="text-[10px] font-bold text-white/50 mb-1 block uppercase tracking-wide">API key</label>
                <input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  type="password"
                  placeholder="AIza..."
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#4285F4]/60"
                  onKeyDown={(e) => e.key === "Enter" && save()}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/50 mb-1 block uppercase tracking-wide">Nickname (optional)</label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. Free Key"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#4285F4]/60"
                />
              </div>

              <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#4285F4]/10 border border-[#4285F4]/20">
                <KeyRound className="w-3.5 h-3.5 text-[#4285F4] flex-shrink-0" />
                <p className="text-[10px] text-white/60 leading-relaxed">
                  Stored <b>only in this browser</b>. Sent directly to Google — never to Base44 or any other server.
                </p>
              </div>

              {err && <p className="text-[11px] text-red-400">{err}</p>}

              <button
                onClick={save}
                disabled={busy}
                className="w-full h-10 rounded-lg bg-[#4285F4] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#4285F4]/90 disabled:opacity-40 transition-colors"
              >
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : <><Check className="w-4 h-4" /> Save & use Gemini</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}