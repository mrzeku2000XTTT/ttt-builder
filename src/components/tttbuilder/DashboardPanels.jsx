import React, { useState } from "react";
import { FileCode, Server, Bot, Database, Brain, Settings, Zap, Plus, Trash2, Save, Cpu, Wallet, Sparkles, KeyRound, ShieldCheck, ExternalLink } from "lucide-react";
import { getLocalProviders, getAllProviders, getEnvProviders, removeLocalProvider, LOCAL_MODEL_PREFIX, PROVIDER_PRESETS } from "./localLlm";
import { isStandalone } from "./OnboardingModal";
import OpenModelsTab from "./OpenModelsTab";
import GeminiKeyModal from "./GeminiKeyModal";
import ModelKeySettings from "./ModelKeySettings";

/* ---------- Overview ---------- */
export function OverviewPanel({ files, messages, buildMode, model, walletKit, onJump }) {
  const stats = [
    { label: "Files", value: files.length, icon: FileCode, color: "#70C7BA" },
    { label: "Messages", value: messages.length, icon: Sparkles, color: "#a78bfa" },
    { label: "Build mode", value: buildMode, icon: Server, color: "#60a5fa" },
    { label: "Model", value: model === "ttt_agent_1" ? "Agent 1" : model, icon: Cpu, color: "#f59e0b" },
    { label: "Wallet kit", value: walletKit ? "On" : "Off", icon: Wallet, color: "#70C7BA" },
  ];
  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Overview</h2>
        <p className="text-xs text-white/40">Your project at a glance.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                <span className="text-[11px] text-white/40 font-medium">{s.label}</span>
              </div>
              <div className="text-white font-bold text-sm capitalize truncate">{s.value}</div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onJump("code")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold transition-colors">
          <FileCode className="w-3.5 h-3.5" /> Open Code
        </button>
        <button onClick={() => onJump("live")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold transition-colors">
          <Server className="w-3.5 h-3.5" /> Open Live
        </button>
        <button onClick={() => onJump("agents")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold transition-colors">
          <Bot className="w-3.5 h-3.5" /> Configure Agents
        </button>
      </div>
    </div>
  );
}

/* ---------- Agents ---------- */
export function AgentsPanel({ onGenerate, loading, files = [] }) {
  const [agentPrompt, setAgentPrompt] = useState("");
  const hasProject = files.length > 0;

  // When a project already exists, presets are ADDITIVE — they tell the
  // builder to add the agent to the existing app, not rebuild it.
  const presets = hasProject
    ? [
        "Add an AI image-generation agent to this app — a panel where the user types a prompt and the agent calls a real image API and shows the generated image inline.",
        "Add a research agent to this app that fetches live data from a public API, summarizes it with an LLM call, and displays the summary in a new panel.",
        "Add a multi-agent workflow to this app: one agent monitors a live data source and alerts, another creates a summary, and a third displays it in a feed — all wired into the existing UI without rebuilding it.",
      ]
    : [
        "Build me an agentic app with a proper workflow: a research agent that gathers data, a planner agent that creates a task list, and an executor agent that runs each task and reports results.",
        "Build an app with an AI agent that can answer user questions, search the web, and save notes to a local database.",
        "Build a multi-agent workflow app: one agent monitors crypto prices and alerts, another auto-creates a summary, and a third posts it to a feed.",
      ];

  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Agents</h2>
        <p className="text-xs text-white/40">
          {hasProject
            ? "Add a real AI agent to your existing project — it will be wired in without rebuilding."
            : "Add real AI agents and workflows to your build."}
        </p>
      </div>

      {hasProject && (
        <div className="bg-[#70C7BA]/10 border border-[#70C7BA]/25 rounded-xl p-3 flex items-start gap-2">
          <Zap className="w-3.5 h-3.5 text-[#70C7BA] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-white/60 leading-relaxed">
            Your project has {files.length} file{files.length > 1 ? "s" : ""}. The agent will be <span className="text-[#70C7BA] font-bold">added</span> to it — existing files are kept and only the minimum needed is edited.
          </p>
        </div>
      )}

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <label className="text-xs text-white/50 mb-2 block font-medium">
          {hasProject ? "Describe the agent to add" : "Describe the agentic app you want"}
        </label>
        <textarea
          value={agentPrompt}
          onChange={e => setAgentPrompt(e.target.value)}
          placeholder={hasProject ? "Add an AI agent that generates images from a text prompt and shows them in a new panel…" : "Build me an agentic app with a proper workflow..."}
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/50 resize-none"
        />
        <button
          onClick={() => agentPrompt.trim() && onGenerate(agentPrompt)}
          disabled={loading || !agentPrompt.trim()}
          className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#70C7BA] text-black text-sm font-bold hover:bg-[#70C7BA]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <Sparkles className="w-4 h-4 animate-pulse" /> : <Zap className="w-4 h-4" />}
          {hasProject ? "Add Agent to Project" : "Build Agentic App"}
        </button>
      </div>
      <div>
        <div className="text-xs text-white/40 font-medium mb-2">Quick starts</div>
        <div className="space-y-2">
          {presets.map((p, i) => (
            <button
              key={i}
              onClick={() => setAgentPrompt(p)}
              className="w-full text-left p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-[#70C7BA]/30 text-xs text-white/60 hover:text-white transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Database ---------- */
export function DatabasePanel({ files }) {
  const hasDb = files.some(f => f.path.includes("database") || f.path.includes("db") || f.path.includes("store"));
  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Database</h2>
        <p className="text-xs text-white/40">Local storage and data persistence for your app.</p>
      </div>
      {hasDb ? (
        <div className="bg-[#70C7BA]/10 border border-[#70C7BA]/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-[#70C7BA]" />
            <span className="text-sm font-bold text-white">Database detected</span>
          </div>
          <p className="text-xs text-white/50">Your project has data storage files. They persist locally in the browser via localStorage / IndexedDB.</p>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-white/40" />
            <span className="text-sm font-bold text-white/70">No database yet</span>
          </div>
          <p className="text-xs text-white/40 mb-3">Ask the builder to add data persistence: "Add a local database to store and retrieve user data."</p>
        </div>
      )}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="text-xs text-white/50 font-medium mb-2">How data works in TTT Builder apps</div>
        <ul className="text-xs text-white/40 space-y-1.5 leading-relaxed">
          <li>• Static apps use <code className="text-[#70C7BA]/70">localStorage</code> / <code className="text-[#70C7BA]/70">IndexedDB</code> — data stays in the browser.</li>
          <li>• React/npm apps can use any client-side store (Zustand, Jotai, or raw localStorage).</li>
          <li>• Data never leaves the device unless you explicitly fetch() to an external API.</li>
        </ul>
      </div>
    </div>
  );
}

/* ---------- Memory ---------- */
const MEMORY_KEY = "ttt_builder_memory_notes";
export function MemoryPanel() {
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(MEMORY_KEY) || "[]"); } catch { return []; }
  });
  const [text, setText] = useState("");

  const save = () => {
    if (!text.trim()) return;
    const next = [...notes, { id: Date.now(), text: text.trim(), at: new Date().toISOString() }];
    setNotes(next);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
    setText("");
  };
  const remove = (id) => {
    const next = notes.filter(n => n.id !== id);
    setNotes(next);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
  };

  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Memory</h2>
        <p className="text-xs text-white/40">Persistent context the builder remembers across sessions.</p>
      </div>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <label className="text-xs text-white/50 mb-2 block font-medium">Add a memory note</label>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && save()}
            placeholder="e.g. Always use dark theme with Kaspa green accents"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/50"
          />
          <button onClick={save} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#70C7BA] text-black text-sm font-bold hover:bg-[#70C7BA]/90 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {notes.length === 0 && (
          <div className="text-center py-8 text-white/30 text-xs">No memory notes yet.</div>
        )}
        {notes.map(n => (
          <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <Brain className="w-4 h-4 text-[#70C7BA] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white/80">{n.text}</div>
              <div className="text-[10px] text-white/30 mt-1">{new Date(n.at).toLocaleString()}</div>
            </div>
            <button onClick={() => remove(n.id)} className="text-white/30 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Settings ---------- */
export function SettingsPanel({ buildMode, onChangeBuildMode, model, onChangeModel, walletKit, onChangeWalletKit, loading }) {
  const standalone = isStandalone();
  const [localLLM, setLocalLLM] = useState(() => {
    try { return localStorage.getItem("ttt_builder_local_llm") || ""; } catch { return ""; }
  });
  const [mgrOpen, setMgrOpen] = useState(false);
  const [geminiOpen, setGeminiOpen] = useState(false);
  const [, forceTick] = useState(0);
  const refresh = () => forceTick((t) => t + 1);
  const local = getLocalProviders();
  const env = getEnvProviders();
  const all = getAllProviders();

  const saveLocalLLM = (v) => {
    setLocalLLM(v);
    try { localStorage.setItem("ttt_builder_local_llm", v); } catch {}
  };

  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Settings</h2>
        <p className="text-xs text-white/40">Configure your build environment.</p>
      </div>

      {/* Models & API keys — standalone only (hosted app manages models in the picker) */}
      {standalone && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#70C7BA]" />
            <div className="text-xs text-white/50 font-medium">Models &amp; API keys</div>
          </div>
          <p className="text-[11px] text-white/30 leading-relaxed">
            Add the models you want to build with. Keys are stored <b>locally in your browser</b> (localStorage) and sent directly to the provider — never to any server. For a safer setup, use a <code className="text-[#70C7BA]/80">.env</code> file (see below).
          </p>

          {/* Configured providers */}
          <div className="space-y-2">
            {all.length === 0 && (
              <div className="text-center py-4 text-white/30 text-xs border border-dashed border-white/10 rounded-lg">
                No models yet. Add one below.
              </div>
            )}
            {all.map((p) => {
              const active = model === `${LOCAL_MODEL_PREFIX}${p.id}`;
              return (
                <div key={p.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <Cpu className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white/80 truncate font-medium">
                      {p.label}{p._env && <span className="ml-1.5 text-[9px] font-bold text-[#70C7BA]">ENV</span>}
                    </div>
                    <div className="text-[10px] text-white/30 truncate">{p.provider} · {p.model || "—"}</div>
                  </div>
                  {active && <span className="text-[9px] font-bold text-[#70C7BA]">ACTIVE</span>}
                  {!p._env && (
                    <button
                      onClick={() => { removeLocalProvider(p.id); if (active) onChangeModel(""); refresh(); }}
                      className="text-white/30 hover:text-red-400 transition-colors p-1"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setGeminiOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#4285F4]/15 border border-[#4285F4]/30 text-[#4285F4] text-xs font-bold hover:bg-[#4285F4]/25 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Gemini (free)
            </button>
            <button
              onClick={() => setMgrOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add open model
            </button>
          </div>

          {/* .env (safer) hint */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#70C7BA]/8 border border-[#70C7BA]/20">
            <ShieldCheck className="w-3.5 h-3.5 text-[#70C7BA] flex-shrink-0 mt-0.5" />
            <div className="text-[10px] text-white/60 leading-relaxed">
              <b className="text-white/80">Safer: use a .env file.</b> Create <code className="text-[#70C7BA]/80">.env</code> in the repo root (gitignored) and restart <code className="text-[#70C7BA]/80">npm run dev</code>:
              <pre className="mt-1.5 p-2 rounded bg-black/30 text-[9px] font-mono text-white/70 overflow-x-auto">{`VITE_GEMINI_API_KEY=AIza...
# or any OpenAI-compatible provider:
VITE_LLM_API_KEY=sk-...
VITE_LLM_MODEL=llama-3.3-70b-versatile
VITE_LLM_BASE_URL=https://api.groq.com/openai/v1
VITE_LLM_PROVIDER=groq`}</pre>
              {env.length > 0
                ? <span className="text-[#70C7BA]">✓ {env.length} model{env.length > 1 ? "s" : ""} loaded from .env (read-only).</span>
                : <span className="text-white/40">No env keys detected yet. Get a free Gemini key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-[#70C7BA] underline inline-flex items-center gap-0.5">aistudio.google.com/apikey <ExternalLink className="w-2.5 h-2.5" /></a>.</span>}
            </div>
          </div>

          <OpenModelsTab
            open={mgrOpen}
            onClose={() => { setMgrOpen(false); refresh(); }}
            onAdded={(entry) => { onChangeModel(`${LOCAL_MODEL_PREFIX}${entry.id}`); setMgrOpen(false); refresh(); }}
          />
          <GeminiKeyModal
            open={geminiOpen}
            onClose={() => { setGeminiOpen(false); refresh(); }}
            onSaved={(entry) => { onChangeModel(`${LOCAL_MODEL_PREFIX}${entry.id}`); setGeminiOpen(false); refresh(); }}
          />
        </div>
      )}

      {/* Build mode */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="text-xs text-white/50 font-medium mb-3">Build mode</div>
        <div className="flex gap-2">
          {["html", "react"].map(m => (
            <button
              key={m}
              onClick={() => onChangeBuildMode(m)}
              disabled={loading}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold capitalize transition-colors ${
                buildMode === m ? "bg-[#70C7BA] text-black" : "bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              {m === "html" ? "Static HTML" : "React / Vite"}
            </button>
          ))}
        </div>
      </div>

      {/* Model — full model list with per-model API key inputs (hosted app only) */}
      {!standalone && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-[#70C7BA]" />
            <div className="text-xs text-white/50 font-medium">AI model &amp; API keys</div>
          </div>
          <ModelKeySettings model={model} onChangeModel={onChangeModel} loading={loading} />
        </div>
      )}

      {/* Wallet kit */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-white/50 font-medium">Kaspa wallet kit</div>
            <div className="text-[11px] text-white/30 mt-0.5">Inject the native Kaspa wallet into every build</div>
          </div>
          <button
            type="button"
            onClick={() => onChangeWalletKit(!walletKit)}
            disabled={loading}
            aria-pressed={walletKit}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${walletKit ? "bg-[#70C7BA]" : "bg-white/15"}`}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: walletKit ? "22px" : "2px" }}
            />
          </button>
        </div>
      </div>

      {/* Local LLM */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-4 h-4 text-white/50" />
          <div className="text-xs text-white/50 font-medium">Local LLM endpoint</div>
        </div>
        <p className="text-[11px] text-white/30 mb-3">Point to a local LLM server (e.g. Ollama at http://localhost:11434). Used as a fallback model for generation.</p>
        <input
          value={localLLM}
          onChange={e => saveLocalLLM(e.target.value)}
          placeholder="http://localhost:11434"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/50"
        />
      </div>
    </div>
  );
}