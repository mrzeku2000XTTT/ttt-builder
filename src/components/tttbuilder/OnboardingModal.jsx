import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, KeyRound, Server, CheckCircle, Sparkles, ArrowRight, Github, Copy, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getLocalProviders, saveLocalProvider, PROVIDER_PRESETS } from "./localLlm";

const E2B_KEY_STORAGE = "ttt_builder_e2b_key";
const ONBOARDING_DONE = "ttt_builder_onboarded";

export function isStandalone() {
  try { return base44.__standalone === true; } catch { return false; }
}

export function getE2BKey() {
  try { return localStorage.getItem(E2B_KEY_STORAGE) || ""; } catch { return ""; }
}

export function setE2BKey(key) {
  try { localStorage.setItem(E2B_KEY_STORAGE, key || ""); } catch {}
}

export function isOnboarded() {
  try { return localStorage.getItem(ONBOARDING_DONE) === "1"; } catch { return false; }
}

function needsOnboarding() {
  if (!isStandalone()) return false;
  if (isOnboarded()) return false;
  return getLocalProviders().length === 0;
}

/**
 * OnboardingModal — standalone repo version only.
 * Step-by-step: add a model → add E2B key (optional) → ready.
 * Everything is stored locally in the browser, never on a server.
 */
export default function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0); // 0=model, 1=e2b, 2=done
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [e2bKey, setE2bKey] = useState(() => getE2BKey());
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (needsOnboarding()) {
      setOpen(true);
      setStep(0);
    }
    // Allow other components (E2B panel, Settings) to re-open onboarding on demand.
    const handler = () => { setOpen(true); setStep(0); };
    window.addEventListener("ttt-open-onboarding", handler);
    return () => window.removeEventListener("ttt-open-onboarding", handler);
  }, []);

  if (!isStandalone()) return null;

  const autoDetectProvider = (modelStr) => {
    if (modelStr.includes("/")) return "openrouter";
    if (modelStr.startsWith("deepseek")) return "deepseek";
    return "openrouter";
  };

  const addModel = () => {
    setErr("");
    if (!model.trim()) { setErr("Enter a model name."); return; }
    if (!apiKey.trim() && autoDetectProvider(model) !== "ollama") {
      setErr("Enter your API key."); return;
    }
    const provider = autoDetectProvider(model);
    const preset = PROVIDER_PRESETS.find((p) => p.provider === provider) || PROVIDER_PRESETS[0];
    saveLocalProvider({
      provider,
      label: model.trim(),
      model: model.trim(),
      baseUrl: preset.baseUrl,
      apiKey: apiKey.trim(),
    });
    setStep(1);
  };

  const saveE2B = () => {
    setE2BKey(e2bKey.trim());
    setStep(2);
  };

  const finish = () => {
    try { localStorage.setItem(ONBOARDING_DONE, "1"); } catch {}
    setOpen(false);
  };

  const cloneCmd = "git clone https://github.com/mrzeku2000XTTT/ttt-builder.git && cd ttt-builder && npm install && npm run dev";

  const copyClone = () => {
    navigator.clipboard?.writeText(cloneCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10 sticky top-0 bg-[#0d1117] z-10">
              <Sparkles className="w-5 h-5 text-[#70C7BA]" />
              <h2 className="font-bold text-white text-base">Welcome to TTT Builder</h2>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#70C7BA]/20 text-[#70C7BA] ml-1">STANDALONE</span>
              <button onClick={finish} className="ml-auto text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress dots */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    step >= i ? "bg-[#70C7BA] text-black" : "bg-white/10 text-white/40"
                  }`}>
                    {step > i ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  {i < 2 && <div className={`w-8 h-0.5 rounded ${step > i ? "bg-[#70C7BA]" : "bg-white/10"}`} />}
                </div>
              ))}
            </div>

            <div className="p-5">
              {/* Step 0: Model */}
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-bold text-sm mb-1">Add your AI model</h3>
                    <p className="text-white/40 text-xs leading-relaxed">
                      This is a standalone build — no hosted models are included. Bring your own model and API key to start building. Everything stays in your browser.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-white/50 mb-1 block uppercase tracking-wide">Model name</label>
                      <input
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="nvidia/nemotron-3-super-120b-a12b:free"
                        className="w-full bg-white/5 border border-[#70C7BA]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/60"
                        autoFocus
                      />
                      <p className="text-[10px] text-white/30 mt-1">Paste any model. Models with a "/" are auto-detected as OpenRouter. Get a free key at openrouter.ai/keys.</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-white/50 mb-1 block uppercase tracking-wide">API key</label>
                      <input
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        type="password"
                        placeholder="sk-or-v1-..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/60"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#70C7BA]/10 border border-[#70C7BA]/20">
                    <KeyRound className="w-3.5 h-3.5 text-[#70C7BA] flex-shrink-0" />
                    <p className="text-[10px] text-white/60 leading-relaxed">
                      Keys are stored <b>only in this browser</b> (localStorage) and sent directly to the provider. They never touch any server.
                    </p>
                  </div>

                  {err && <p className="text-[11px] text-red-400">{err}</p>}

                  <button
                    onClick={addModel}
                    className="w-full h-10 rounded-lg bg-[#70C7BA] text-black text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#70C7BA]/90 transition-colors"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Step 1: E2B key */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                      <Server className="w-4 h-4 text-[#70C7BA]" /> Live preview key (optional)
                    </h3>
                    <p className="text-white/40 text-xs leading-relaxed">
                      To run React/npm projects live in a real sandbox, add an E2B API key. You can skip this and add it later in Settings. Static HTML apps preview without it.
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-white/50 mb-1 block uppercase tracking-wide">E2B API key</label>
                    <input
                      value={e2bKey}
                      onChange={(e) => setE2bKey(e.target.value)}
                      type="password"
                      placeholder="e2b_..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/60"
                    />
                    <p className="text-[10px] text-white/30 mt-1">
                      Get one at e2b.dev → Dashboard → API Keys. Free tier available.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#70C7BA]/10 border border-[#70C7BA]/20">
                    <KeyRound className="w-3.5 h-3.5 text-[#70C7BA] flex-shrink-0" />
                    <p className="text-[10px] text-white/60 leading-relaxed">
                      Stored <b>locally in your browser only</b>. Never sent to any server. Used to create sandbox previews directly from your browser.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setE2bKey(""); saveE2B(); }}
                      className="flex-1 h-10 rounded-lg bg-white/5 text-white/60 hover:text-white text-sm font-bold transition-colors"
                    >
                      Skip for now
                    </button>
                    <button
                      onClick={saveE2B}
                      className="flex-1 h-10 rounded-lg bg-[#70C7BA] text-black text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#70C7BA]/90 transition-colors"
                    >
                      Continue <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Done */}
              {step === 2 && (
                <div className="space-y-4 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#70C7BA]/15 border border-[#70C7BA]/30 flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-[#70C7BA]" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base mb-1">You're ready to build</h3>
                    <p className="text-white/40 text-xs leading-relaxed max-w-sm mx-auto">
                      Your model and keys are saved locally. Start describing your app in the chat — every app ships with a Kaspa wallet built in.
                    </p>
                  </div>

                  <div className="text-left bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-white/50 uppercase tracking-wide">
                      <Github className="w-3 h-3" /> Clone command
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[10px] font-mono text-[#70C7BA]/80 break-all leading-relaxed">
                        {cloneCmd}
                      </code>
                      <button onClick={copyClone} className="flex-shrink-0 text-white/40 hover:text-white p-1">
                        {copied ? <Check className="w-3.5 h-3.5 text-[#70C7BA]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={finish}
                    className="w-full h-10 rounded-lg bg-[#70C7BA] text-black text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#70C7BA]/90 transition-colors"
                  >
                    Start building <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}