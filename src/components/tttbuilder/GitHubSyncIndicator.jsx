import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Loader2, CheckCircle, AlertCircle, Cloud, CloudOff, RefreshCw, Link2, Unlink, X, Settings2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const CONNECTOR_ID = "6a76c96c1625886d0f70a701";

export default function GitHubSyncIndicator({ autosync, disabled }) {
  const [open, setOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const {
    enabled, connected, ghLogin, syncState, repo, branch, setRepo, setBranch,
    enable, disable, syncNow, checkConnection, error, lastSyncAt, repoUrl,
  } = autosync;

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      window.open(url, "_blank");
      let ticks = 0;
      const timer = setInterval(async () => {
        ticks += 1;
        try {
          const res = await base44.functions.invoke("getUserGitHubConnection", {});
          if (res.data?.connected) {
            clearInterval(timer);
            checkConnection();
            setConnecting(false);
            return;
          }
        } catch {}
        if (ticks >= 48) { clearInterval(timer); setConnecting(false); }
      }, 2500);
    } catch { setConnecting(false); }
  };

  const handleDisconnect = async () => {
    try { await base44.connectors.disconnectAppUser(CONNECTOR_ID); } catch {}
    checkConnection();
  };

  // The small toolbar pill
  let Icon = Cloud, color = "text-white/50", bg = "bg-white/5 hover:bg-white/10", label = "Auto-sync";
  if (!enabled) { Icon = CloudOff; label = "Auto-sync off"; }
  else if (!connected) { Icon = Link2; color = "text-amber-400"; bg = "bg-amber-500/10 border-amber-500/30"; label = "Connect GitHub"; }
  else if (syncState === "syncing") { Icon = Loader2; color = "text-[#70C7BA]"; bg = "bg-[#70C7BA]/10 border-[#70C7BA]/30"; label = "Syncing…"; }
  else if (syncState === "synced") { Icon = CheckCircle; color = "text-emerald-400"; bg = "bg-emerald-500/10 border-emerald-500/20"; label = "Synced"; }
  else if (syncState === "error") { Icon = AlertCircle; color = "text-red-400"; bg = "bg-red-500/10 border-red-500/30"; label = "Sync error"; }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={`flex items-center gap-1.5 h-7 px-3 rounded-lg border text-xs font-bold transition-colors flex-shrink-0 whitespace-nowrap ${bg} ${color} disabled:opacity-30`}
        title="GitHub auto-sync settings"
      >
        <Icon className={`w-3 h-3 ${syncState === "syncing" ? "animate-spin" : ""}`} />
        <span className="hidden xl:inline">{label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161b22] border border-white/10 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Github className="w-5 h-5 text-white" />
                  <h2 className="font-bold text-white text-base">GitHub Auto-Sync</h2>
                </div>
                <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Connection status */}
                {connected ? (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#70C7BA]/20 flex items-center justify-center">
                      <Github className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/50">Connected as</p>
                      <p className="text-sm font-bold text-white truncate">{ghLogin}</p>
                    </div>
                    <button onClick={handleDisconnect} title="Disconnect" className="text-white/30 hover:text-red-400 p-1.5">
                      <Unlink className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="w-full h-11 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    {connecting ? <><Loader2 className="w-4 h-4 animate-spin" /> Waiting for GitHub…</> : <><Link2 className="w-4 h-4" /> Connect your GitHub</>}
                  </button>
                )}

                {/* Auto-sync toggle */}
                <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">Auto-sync changes</p>
                      <p className="text-[10px] text-white/40 mt-0.5">Every edit is pushed to your repo automatically (debounced ~4s).</p>
                    </div>
                    <button
                      onClick={() => enabled ? disable() : enable()}
                      disabled={!connected}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-30 ${enabled ? "bg-[#70C7BA]" : "bg-white/15"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${enabled ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                  </div>
                </div>

                {/* Repo config — only when enabled */}
                {enabled && connected && (
                  <>
                    <div>
                      <label className="text-xs text-white/50 mb-1.5 block">Repo <span className="text-white/30">(owner/name or just name)</span></label>
                      <input
                        value={repo}
                        onChange={(e) => setRepo(e.target.value)}
                        placeholder="my-kaspa-app"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-white/50 mb-1.5 block">Branch</label>
                      <input
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="main"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/50"
                      />
                    </div>

                    {/* Sync status + manual trigger */}
                    <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/10 p-3">
                      <div className="flex items-center gap-2">
                        {syncState === "syncing" && <Loader2 className="w-4 h-4 animate-spin text-[#70C7BA]" />}
                        {syncState === "synced" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                        {syncState === "error" && <AlertCircle className="w-4 h-4 text-red-400" />}
                        {syncState === "idle" && <Cloud className="w-4 h-4 text-white/30" />}
                        <div>
                          <p className="text-xs font-bold text-white capitalize">{syncState === "idle" ? "Waiting for changes" : syncState}</p>
                          {lastSyncAt && <p className="text-[10px] text-white/30">Last sync: {new Date(lastSyncAt).toLocaleTimeString()}</p>}
                        </div>
                      </div>
                      <button
                        onClick={syncNow}
                        disabled={syncState === "syncing" || !repo.trim()}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20 disabled:opacity-40 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" /> Sync now
                      </button>
                    </div>

                    {/* Repo link — visible once the first sync creates/pushes the repo */}
                    {repoUrl && (
                      <a
                        href={repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-xl bg-[#70C7BA]/10 border border-[#70C7BA]/30 p-3 text-sm text-white hover:bg-[#70C7BA]/15 transition-colors"
                      >
                        <Github className="w-4 h-4 text-[#70C7BA] flex-shrink-0" />
                        <span className="flex-1 truncate font-medium">View repo on GitHub</span>
                        <span className="text-[10px] text-white/40 truncate">{repoUrl.replace("https://github.com/", "")}</span>
                      </a>
                    )}

                    {error && (
                      <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3">
                        <p className="text-[11px] text-red-300 break-words">{error}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}