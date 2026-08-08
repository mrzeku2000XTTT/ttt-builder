import React, { useState, useEffect, useRef } from "react";
import { Loader2, Play, Square, ExternalLink, Server, Terminal, RefreshCw, X, Wrench } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function E2BLivePanel({ files, autoStart = false, onUrlChange, onFixBuild }) {
  const [state, setState] = useState({ status: "idle", url: null, sandboxId: null, logs: [], error: null });
  const [showLogs, setShowLogs] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const started = useRef(false);

  // Report the live URL up so the parent (Push to Store, Fullscreen) can use
  // the REAL running app instead of a fake srcDoc HTML bundle.
  useEffect(() => { onUrlChange?.(state.url); }, [state.url]);

  // Vite often finishes compiling a second or two after the port opens —
  // re-load the frame a few times so the app doesn't stay blank.
  useEffect(() => {
    if (state.status !== "live" || !state.url) return;
    const t = setTimeout(() => setFrameKey(k => k + 1), 4000);
    return () => clearTimeout(t);
  }, [state.status, state.url]);

  const boot = async () => {
    setState({ status: "booting", url: null, sandboxId: null, logs: [], error: null });
    try {
      const res = await base44.functions.invoke("e2bSandbox", { action: "run", files });
      const d = res.data || {};
      setState({
        status: d.url ? "live" : "error",
        url: d.url || null,
        sandboxId: d.sandboxId || null,
        logs: d.logs || [],
        error: d.error || null,
      });
    } catch (err) {
      setState({ status: "error", url: null, sandboxId: null, logs: [], error: err.message });
    }
  };

  // Auto-boot the sandbox the first time this panel is shown
  useEffect(() => {
    if (autoStart && !started.current && files.length) {
      started.current = true;
      boot();
    }
  }, [autoStart, files.length]);

  // Keep the microVM from timing out while the user is watching it
  useEffect(() => {
    if (state.status !== "live" || !state.sandboxId) return;
    const id = setInterval(() => {
      base44.functions.invoke("e2bSandbox", { action: "keepalive", sandboxId: state.sandboxId }).catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, [state.status, state.sandboxId]);

  const stop = async () => {
    if (state.sandboxId) {
      try { await base44.functions.invoke("e2bSandbox", { action: "kill", sandboxId: state.sandboxId }); } catch { /* ignore */ }
    }
    setState({ status: "idle", url: null, sandboxId: null, logs: [], error: null });
  };

  return (
    <div className="absolute inset-0 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 flex-shrink-0 overflow-x-auto scrollbar-hide">
        <Server className="w-3.5 h-3.5 text-[#70C7BA] flex-shrink-0" />
        <span className="hidden sm:inline text-xs text-white/50 flex-shrink-0">Live runtime</span>
        {state.logs.length > 0 && (
          <button
            onClick={() => setShowLogs(v => !v)}
            className="flex items-center gap-1 h-7 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[10px] font-bold flex-shrink-0"
          >
            <Terminal className="w-3 h-3" /> {showLogs ? "Hide" : "Logs"}
          </button>
        )}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {state.url && (
            <a href={state.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold whitespace-nowrap">
              <ExternalLink className="w-3 h-3" /> <span className="hidden sm:inline">Open</span>
            </a>
          )}
          {state.status === "live" ? (
            <>
            <button onClick={() => setFrameKey(k => k + 1)}
              className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold whitespace-nowrap">
              <RefreshCw className="w-3 h-3" /> <span className="hidden sm:inline">Reload</span>
            </button>
            <button onClick={boot}
              className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold whitespace-nowrap">
              <RefreshCw className="w-3 h-3" /> <span className="hidden sm:inline">Restart</span>
            </button>
            <button onClick={stop}
              className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold whitespace-nowrap">
              <Square className="w-3 h-3" /> <span className="hidden sm:inline">Stop</span>
            </button>
            </>
          ) : (
            <button onClick={boot} disabled={state.status === "booting" || !files.length}
              className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-[#70C7BA] text-black text-xs font-bold disabled:opacity-40 whitespace-nowrap">
              {state.status === "booting" ? <><Loader2 className="w-3 h-3 animate-spin" /> Booting…</> : <><Play className="w-3 h-3" /> Run Live</>}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-black">
        {state.status === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center text-center p-8">
            <div>
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#70C7BA]/10 border border-[#70C7BA]/20 flex items-center justify-center">
                <Server className="w-7 h-7 text-[#70C7BA]/60" />
              </div>
              <p className="text-white/40 text-sm font-medium">Run this project live</p>
              <p className="text-white/25 text-xs mt-1 max-w-xs">Installs dependencies and starts the app for you.</p>
            </div>
          </div>
        )}
        {state.status === "booting" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-6 h-6 text-[#70C7BA] animate-spin mx-auto mb-3" />
              <p className="text-white/50 text-sm">Starting up & installing packages…</p>
              <p className="text-white/25 text-xs mt-1">This can take up to a minute</p>
            </div>
          </div>
        )}
        {state.status === "live" && state.url && (
          <iframe key={frameKey} src={state.url} className="w-full h-full border-0" title="Live Sandbox" />
        )}
        {state.status === "error" && (
          <div className="absolute inset-0 overflow-auto p-4">
            <p className="text-red-400 text-sm font-bold mb-2">Runtime failed to start</p>
            <p className="text-white/40 text-xs mb-3">{state.error}</p>
            {state.logs.length > 0 && (
              <pre className="text-[10px] font-mono text-red-300/80 whitespace-pre-wrap break-all bg-black/40 rounded-lg p-2 mb-3 max-h-48 overflow-auto">{state.logs.join("\n")}</pre>
            )}
            {onFixBuild && state.logs.length > 0 && (
              <button onClick={() => onFixBuild(state.logs.join("\n"))}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#70C7BA] text-black text-xs font-bold hover:bg-[#70C7BA]/90 transition-colors">
                <Wrench className="w-3.5 h-3.5" /> Fix build error
              </button>
            )}
          </div>
        )}
      </div>

      {showLogs && state.logs.length > 0 && (
        <div className="flex-shrink-0 max-h-28 sm:max-h-32 overflow-auto border-t border-white/5 bg-[#08090b] p-3">
          <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-white/30 font-bold">
            <Terminal className="w-3 h-3" /> LOGS
            <button onClick={() => setShowLogs(false)} className="ml-auto text-white/40 hover:text-white" title="Close logs">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <pre className="text-[10px] font-mono text-green-300/70 whitespace-pre-wrap break-all leading-relaxed">
            {state.logs.join("\n")}
          </pre>
        </div>
      )}
    </div>
  );
}