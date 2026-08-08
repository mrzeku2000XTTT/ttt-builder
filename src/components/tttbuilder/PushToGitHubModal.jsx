import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Loader2, CheckCircle, X, ExternalLink, Rocket, ShieldCheck, Eye, EyeOff, Link2, Unlink } from "lucide-react";
import { base44 } from "@/api/base44Client";

const STORAGE_KEY = "ttt_github_pat";
const CONNECTOR_ID = "6a76c96c1625886d0f70a701";

export default function PushToGitHubModal({ open, onClose, files, defaultName }) {
  const [mode, setMode] = useState("oauth"); // "oauth" | "pat"

  // OAuth state
  const [ghConnected, setGhConnected] = useState(false);
  const [ghLogin, setGhLogin] = useState("");
  const [ghAvatar, setGhAvatar] = useState("");
  const [checkingConn, setCheckingConn] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // PAT state
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
  });
  const [remember, setRemember] = useState(() => {
    try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
  });
  const [showToken, setShowToken] = useState(false);

  // Shared form state
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [isPrivate, setIsPrivate] = useState(false);
  const [commitMessage, setCommitMessage] = useState("Initial commit from TTT Builder");
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState(null);

  const defaultSlug = () => {
    const slug = (defaultName || "my-kaspa-app")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "");
    return slug || "my-kaspa-app";
  };

  const checkConnection = useCallback(async () => {
    setCheckingConn(true);
    try {
      const res = await base44.functions.invoke("getUserGitHubConnection", {});
      const d = res.data || {};
      setGhConnected(!!d.connected);
      setGhLogin(d.login || "");
      setGhAvatar(d.avatar || "");
    } catch {
      setGhConnected(false);
      setGhLogin("");
      setGhAvatar("");
    } finally {
      setCheckingConn(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setRepo(defaultSlug());
      setBranch("main");
      setIsPrivate(false);
      setResult(null);
      setCommitMessage("Initial commit from TTT Builder");
      try { setToken(localStorage.getItem(STORAGE_KEY) || ""); } catch {}
      checkConnection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultName]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      window.open(url, "_blank");
      // The OAuth tab usually stays open on the callback success page,
      // so we can't rely on popup.closed. Poll the connection instead.
      let ticks = 0;
      const timer = setInterval(async () => {
        ticks += 1;
        try {
          const res = await base44.functions.invoke("getUserGitHubConnection", {});
          if (res.data?.connected) {
            clearInterval(timer);
            setGhConnected(true);
            setGhLogin(res.data.login || "");
            setGhAvatar(res.data.avatar || "");
            setConnecting(false);
            return;
          }
        } catch {}
        if (ticks >= 48) { // ~2 min
          clearInterval(timer);
          setConnecting(false);
        }
      }, 2500);
    } catch (err) {
      setConnecting(false);
    }
  };

  const manualRecheck = async () => {
    setCheckingConn(true);
    await checkConnection();
    setCheckingConn(false);
  };

  const handleDisconnect = async () => {
    try {
      await base44.connectors.disconnectAppUser(CONNECTOR_ID);
    } catch {}
    setGhConnected(false);
    setGhLogin("");
    setGhAvatar("");
  };

  const push = async () => {
    if (!repo.trim() || !files.length) return;
    if (mode === "pat" && !token.trim()) return;
    if (mode === "oauth" && !ghConnected) return;
    setPushing(true);
    setResult(null);
    try {
      if (mode === "pat" && remember) {
        try { localStorage.setItem(STORAGE_KEY, token.trim()); } catch {}
      } else if (mode === "pat") {
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
      }
      const fnName = mode === "oauth" ? "pushAppToUserGitHubOAuth" : "pushAppToUserGitHub";
      const payload = {
        repo: repo.trim(),
        branch: branch.trim() || "main",
        commitMessage: commitMessage.trim() || "Initial commit from TTT Builder",
        isPrivate,
        files: files.map((f) => ({ path: f.path, content: f.content || "" })),
      };
      if (mode === "pat") payload.token = token.trim();
      const res = await base44.functions.invoke(fnName, payload);
      setResult({ success: true, ...res.data });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Push failed";
      setResult({ success: false, error: typeof msg === "string" ? msg : JSON.stringify(msg) });
    } finally {
      setPushing(false);
    }
  };

  const forgetToken = () => {
    setToken("");
    setRemember(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  const canPush = mode === "oauth"
    ? (ghConnected && !!repo.trim() && !!files.length && !pushing)
    : (!!token.trim() && !!repo.trim() && !!files.length && !pushing);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#161b22] border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Github className="w-5 h-5 text-white" />
                <h2 className="font-bold text-white text-base">Push to your GitHub</h2>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!result ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-[#70C7BA]/8 border border-[#70C7BA]/25 px-3 py-2.5 flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#70C7BA] mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-white/55 leading-relaxed">
                    This pushes to <span className="text-white font-bold">your own GitHub</span> — not TTT's. Connect once with OAuth (recommended) or paste a Personal Access Token.
                  </p>
                </div>

                {/* Mode tabs */}
                <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                  <button
                    onClick={() => setMode("oauth")}
                    className={`flex-1 h-8 rounded-lg text-xs font-bold transition-colors ${mode === "oauth" ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
                  >
                    OAuth connect
                  </button>
                  <button
                    onClick={() => setMode("pat")}
                    className={`flex-1 h-8 rounded-lg text-xs font-bold transition-colors ${mode === "pat" ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
                  >
                    Access token
                  </button>
                </div>

                {mode === "oauth" ? (
                  <div>
                    {checkingConn ? (
                      <div className="flex items-center justify-center py-4 text-white/40 text-xs gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Checking your GitHub connection…
                      </div>
                    ) : ghConnected ? (
                      <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
                        {ghAvatar && <img src={ghAvatar} alt="" className="w-9 h-9 rounded-full" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/50">Connected as</p>
                          <p className="text-sm font-bold text-white truncate">{ghLogin}</p>
                        </div>
                        <button onClick={handleDisconnect} title="Disconnect" className="text-white/30 hover:text-red-400 p-1.5">
                          <Unlink className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={handleConnect}
                          disabled={connecting}
                          className="w-full h-11 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                        >
                          {connecting ? <><Loader2 className="w-4 h-4 animate-spin" /> Waiting for GitHub…</> : <><Link2 className="w-4 h-4" /> Connect your GitHub</>}
                        </button>
                        {connecting && (
                          <button
                            onClick={manualRecheck}
                            className="w-full mt-2 text-[11px] text-[#70C7BA] hover:underline"
                          >
                            I've authorized — check again
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block">GitHub Personal Access Token</label>
                    <div className="relative">
                      <input
                        type={showToken ? "text" : "password"}
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="ghp_... (classic, repo scope)"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 pr-9 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/50 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                      >
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <label className="flex items-center gap-1.5 text-[10px] text-white/50 cursor-pointer">
                        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-[#70C7BA]" />
                        Remember on this device
                      </label>
                      {token && (
                        <button onClick={forgetToken} className="text-[10px] text-white/30 hover:text-red-400">Forget token</button>
                      )}
                    </div>
                    <a href="https://github.com/settings/tokens/new?scopes=repo&description=TTT%20Builder" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-[#70C7BA] hover:underline mt-1.5">
                      <ExternalLink className="w-3 h-3" /> Create a token (repo scope)
                    </a>
                  </div>
                )}

                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Repo <span className="text-white/30">(owner/name or just name → your account)</span></label>
                  <input
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    placeholder="my-kaspa-app"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block">Branch</label>
                    <input
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="main"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block">Visibility</label>
                    <select
                      value={isPrivate ? "private" : "public"}
                      onChange={(e) => setIsPrivate(e.target.value === "private")}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#70C7BA]/50"
                    >
                      <option value="public" className="bg-[#161b22]">Public</option>
                      <option value="private" className="bg-[#161b22]">Private</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Commit message</label>
                  <input
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/50"
                  />
                </div>

                <p className="text-[10px] text-white/30">
                  {files.length} file{files.length !== 1 ? "s" : ""} will be committed in a single push. The repo is created if it doesn't exist.
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={onClose}
                    className="flex-1 h-10 rounded-xl bg-white/5 text-white/60 hover:text-white text-sm font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={push}
                    disabled={!canPush}
                    className="flex-1 h-10 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                  >
                    {pushing ? <><Loader2 className="w-4 h-4 animate-spin" /> Pushing…</> : <><Github className="w-4 h-4" /> Push to GitHub</>}
                  </button>
                </div>
              </div>
            ) : result.success ? (
              <div className="text-center py-3">
                <CheckCircle className="w-10 h-10 text-[#70C7BA] mx-auto mb-3" />
                <p className="font-bold text-white mb-1">Pushed to your GitHub!</p>
                <p className="text-xs text-white/40 mb-4">{result.filesPushed} file{result.filesPushed !== 1 ? "s" : ""} committed to {result.owner}/{result.repo} ({result.branch}).</p>
                <div className="space-y-2 text-left mb-4">
                  <a href={result.repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-[#70C7BA] hover:underline">
                    <Github className="w-3.5 h-3.5" /> View repo: {result.owner}/{result.repo}
                  </a>
                  <a href={result.commitUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-[#70C7BA] hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" /> View commit
                  </a>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-left mb-4">
                  <p className="text-[11px] font-bold text-white mb-1.5 flex items-center gap-1.5"><Rocket className="w-3.5 h-3.5 text-[#70C7BA]" /> Deploy it yourself</p>
                  <p className="text-[10px] text-white/40 mb-2">Import this repo into your favourite host:</p>
                  <div className="flex flex-wrap gap-2">
                    <a href={`https://vercel.com/new/clone?repository-url=${encodeURIComponent(result.repoUrl)}`} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2.5 py-1.5 rounded-lg bg-black text-white border border-white/15 hover:bg-black/80">Vercel</a>
                    <a href={`https://app.netlify.com/start?repo=${encodeURIComponent(result.repoUrl)}`} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2.5 py-1.5 rounded-lg bg-[#00AD9F] text-white hover:opacity-90">Netlify</a>
                    <a href={`${result.repoUrl}/settings/pages`} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2.5 py-1.5 rounded-lg bg-white/10 text-white border border-white/15 hover:bg-white/15">GitHub Pages</a>
                  </div>
                </div>
                <button onClick={onClose} className="w-full h-9 rounded-xl bg-white/5 text-white/60 hover:text-white text-sm font-bold transition-colors">
                  Close
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-red-400 font-bold mb-2">Push failed</p>
                <p className="text-xs text-white/40 mb-4 break-words">{result.error}</p>
                <button onClick={() => setResult(null)} className="w-full h-9 rounded-xl bg-white/5 text-white/60 hover:text-white text-sm font-bold transition-colors">
                  Try again
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}