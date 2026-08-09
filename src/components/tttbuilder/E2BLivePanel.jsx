import React, { useState, useEffect, useRef } from "react";
import { Loader2, Play, Square, ExternalLink, Server, Terminal, RefreshCw, X, Wrench, KeyRound, Settings } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { isStandalone, getE2BKey } from "./OnboardingModal";

export default function E2BLivePanel({ files, autoStart = false, onUrlChange, onFixBuild, onOpenOnboarding }) {
  const [state, setState] = useState({ status: "idle", url: null, sandboxId: null, logs: [], error: null });
  const [showLogs, setShowLogs] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const started = useRef(false);
  const standalone = isStandalone();
  const e2bKey = getE2BKey();

  useEffect(() => { onUrlChange?.(state.url); }, [state.url]);

  useEffect(() => {
    if (state.status !== "live" || !state.url) return;
    const t = setTimeout(() => setFrameKey(k => k + 1), 4000);
    return () => clearTimeout(t);
  }, [state.status, state.url]);

  const boot = async () => {
    setState({ status: "booting", url: null, sandboxId: null, logs: [], error: null });
    try {
      if (standalone) {
        // Standalone: call E2B directly from the browser with the locally-stored key.
        if (!e2bKey) {
          setState({ status: "error", url: null, sandboxId: null, logs: [], error: "No E2B API key found. Add one in Settings or Onboarding to run npm projects live." });
          return;
        }
        // E2B REST API — create a sandbox, upload files, start the dev server.
        // Uses the E2B Code Interpreter via dynamic import (loaded from esm.sh so
        // the standalone repo doesn't need the package installed).
        let Sandbox;
        try {
          const mod = await import(/* @vite-ignore */ "https://esm.sh/@e2b/code-interpreter@1.0.2");
          Sandbox = mod.Sandbox || mod.default?.Sandbox || mod.default;
        } catch (impErr) {
          setState({ status: "error", url: null, sandboxId: null, logs: [], error: `Could not load E2B SDK: ${impErr.message}. Check your internet connection.` });
          return;
        }
        const sbx = await Sandbox.create({ apiKey: e2bKey });
        const APP = "/home/user/app";
        // Write all project files into the sandbox
        for (const f of files) {
          try { await sbx.files.write(`${APP}/${f.path}`, f.content); } catch {}
        }
        const pkg = files.find(f => f.path === "package.json");
        const logs = [`● sandbox ${sbx.sandboxId} started`];

        if (pkg) {
          let pkgObj = {};
          try { pkgObj = JSON.parse(pkg.content || "{}"); } catch {}
          const deps = { ...(pkgObj.dependencies || {}), ...(pkgObj.devDependencies || {}) };
          const scripts = pkgObj.scripts || {};

          // Install deps
          const install = await sbx.commands.run("npm install --no-audit --no-fund", { cwd: APP, timeoutMs: 120000 });
          logs.push(`$ npm install → exit ${install.exitCode}`);
          if (install.stderr) logs.push(install.stderr.slice(-1000));
          if (install.exitCode !== 0) {
            setState({ status: "error", url: null, sandboxId: sbx.sandboxId, logs, error: "npm install failed — check the logs." });
            return;
          }

          // Vite projects: validate build, then inject a wrapper config so Vite
          // accepts the E2B sandbox hostname (allowedHosts) and binds to 0.0.0.0:3000.
          if (deps.vite) {
            const build = await sbx.commands.run("npx vite build", { cwd: APP, timeoutMs: 90000 });
            logs.push(`$ npx vite build → exit ${build.exitCode}`);
            if (build.stdout) logs.push(build.stdout.slice(-2000));
            if (build.stderr) logs.push(build.stderr.slice(-2000));
            if (build.exitCode !== 0) {
              setState({ status: "error", url: null, sandboxId: sbx.sandboxId, logs, error: "Vite build failed — the generated project has a compile error. Open logs and tap Fix build error." });
              return;
            }
            const VITE_WRAPPER = `import { defineConfig, mergeConfig } from 'vite';
export default defineConfig(async (env) => {
  let user = {};
  for (const p of ['./vite.config.js', './vite.config.mjs', './vite.config.ts']) {
    try { const m = await import(p); user = m.default ?? {}; break; } catch (e) {}
  }
  if (typeof user === 'function') user = await user(env);
  return mergeConfig(user, { server: { host: '0.0.0.0', port: 3000, strictPort: true, allowedHosts: true, hmr: { clientPort: 443 } } });
});`;
            await sbx.files.write(`${APP}/vite.e2b.config.mjs`, VITE_WRAPPER);
            logs.push("● injected vite.e2b.config.mjs (allowedHosts)");
            await sbx.commands.run("npx vite --config vite.e2b.config.mjs", { cwd: APP, background: true, timeoutMs: 600000 });
            logs.push("$ npx vite --config vite.e2b.config.mjs (background, port 3000)");
            var devPort = 3000;
          } else {
            const cmd = scripts.dev ? "npm run dev" : scripts.start ? "npm start" : "node index.js";
            await sbx.commands.run(cmd, { cwd: APP, background: true, timeoutMs: 600000 });
            logs.push(`$ ${cmd} (background)`);
            var devPort = 3000;
          }
        } else {
          // Plain HTML — static server
          var devPort = 8080;
          await sbx.commands.run(`python3 -m http.server ${devPort} --bind 0.0.0.0`, { cwd: APP, background: true, timeoutMs: 600000 });
          logs.push(`$ python3 -m http.server ${devPort}`);
        }

        // Build the preview URL
        const hostname = typeof sbx.getUrl === "function"
          ? sbx.getUrl(devPort)
          : `https://${devPort}-${sbx.sandboxId}.e2b.dev`;

        // Poll until the server actually responds — otherwise the iframe loads a dead page
        let ready = false;
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 2000));
          try {
            const probe = await fetch(hostname, { redirect: "follow", mode: "no-cors" });
            ready = true; break;
          } catch { /* not up yet */ }
        }
        logs.push(ready ? `● live at ${hostname}` : `⚠️ server not responding yet at ${hostname}`);
        setState({
          status: "live",
          url: hostname,
          sandboxId: sbx.sandboxId,
          logs,
          error: null,
        });
      } else {
        // Hosted: use the backend function with the server-side E2B key.
        const res = await base44.functions.invoke("e2bSandbox", { action: "run", files });
        const d = res?.data || res || {};
        if (d.error) {
          setState({ status: "error", url: null, sandboxId: d.sandboxId || null, logs: d.logs || [], error: d.error });
        } else if (d.url && d.ready) {
          setState({ status: "live", url: d.url, sandboxId: d.sandboxId || null, logs: d.logs || [], error: null });
        } else if (d.url && d.ready === false) {
          // Server started but didn't respond in time — show it anyway with a warning
          setState({ status: "live", url: d.url, sandboxId: d.sandboxId || null, logs: [...(d.logs || []), "⚠️ server still warming up — reload in a few seconds if blank"], error: null });
        } else {
          setState({ status: "error", url: null, sandboxId: null, logs: d.logs || [], error: "No preview URL returned from the sandbox." });
        }
      }
    } catch (err) {
      setState({ status: "error", url: null, sandboxId: null, logs: [], error: err.message });
    }
  };

  useEffect(() => {
    if (autoStart && !started.current && files.length && !standalone) {
      started.current = true;
      boot();
    }
  }, [autoStart, files.length]);

  useEffect(() => {
    if (state.status !== "live" || !state.sandboxId) return;
    if (standalone) return; // standalone sandboxes auto-timeout; no keepalive needed
    const id = setInterval(() => {
      base44.functions.invoke("e2bSandbox", { action: "keepalive", sandboxId: state.sandboxId }).catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, [state.status, state.sandboxId]);

  const stop = async () => {
    if (state.sandboxId && !standalone) {
      try { await base44.functions.invoke("e2bSandbox", { action: "kill", sandboxId: state.sandboxId }); } catch {}
    }
    setState({ status: "idle", url: null, sandboxId: null, logs: [], error: null });
  };

  return (
    <div className="absolute inset-0 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 flex-shrink-0 overflow-x-auto scrollbar-hide">
        <Server className="w-3.5 h-3.5 text-[#70C7BA] flex-shrink-0" />
        <span className="hidden sm:inline text-xs text-white/50 flex-shrink-0">Live runtime</span>
        {standalone && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#70C7BA]/15 text-[#70C7BA] flex-shrink-0">LOCAL E2B</span>
        )}
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
              {standalone && !e2bKey && (
                <button
                  onClick={() => onOpenOnboarding?.()}
                  className="mt-4 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#70C7BA]/20 border border-[#70C7BA]/40 text-[#70C7BA] text-xs font-bold hover:bg-[#70C7BA]/30 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Add E2B key to enable
                </button>
              )}
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
          <iframe key={frameKey} src={state.url} className="w-full h-full border-0 bg-white" title="Live Sandbox" />
        )}
        {state.status === "error" && (
          <div className="absolute inset-0 overflow-auto p-4">
            <p className="text-red-400 text-sm font-bold mb-2">Runtime failed to start</p>
            <p className="text-white/40 text-xs mb-3">{state.error}</p>
            {standalone && !e2bKey && (
              <button
                onClick={() => onOpenOnboarding?.()}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#70C7BA] text-black text-xs font-bold hover:bg-[#70C7BA]/90 transition-colors mb-3"
              >
                <Settings className="w-3.5 h-3.5" /> Add E2B key
              </button>
            )}
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