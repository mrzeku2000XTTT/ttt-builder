import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const STORAGE = {
  enabled: "ttt_autosync_enabled",
  repo: "ttt_autosync_repo",
  branch: "ttt_autosync_branch",
  isPrivate: "ttt_autosync_private",
};

const DEBOUNCE_MS = 4000;

/**
 * Watches the builder's `files` and auto-pushes every change to the user's
 * connected GitHub repo (via the per-user OAuth connector), debounced.
 *
 * @param {Array} files — the current project files
 * @param {Object} opts
 * @param {boolean} opts.loading — pause syncing while a build is in flight
 * @param {string} opts.defaultName — fallback repo name slug
 */
export function useGitHubAutoSync(files, { loading = false, defaultName = "" } = {}) {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE.enabled) === "1"; } catch { return false; }
  });
  const [repo, setRepo] = useState(() => {
    try { return localStorage.getItem(STORAGE.repo) || ""; } catch { return ""; }
  });
  const [branch, setBranch] = useState(() => {
    try { return localStorage.getItem(STORAGE.branch) || "main"; } catch { return "main"; }
  });
  const [isPrivate, setIsPrivate] = useState(() => {
    try { return localStorage.getItem(STORAGE.isPrivate) === "1"; } catch { return false; }
  });
  const [connected, setConnected] = useState(false);
  const [ghLogin, setGhLogin] = useState("");
  const [syncState, setSyncState] = useState("idle"); // idle | syncing | synced | error
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [error, setError] = useState("");
  const [repoUrl, setRepoUrl] = useState("");

  const debounceRef = useRef(null);
  const filesRef = useRef(files);
  const inFlightRef = useRef(false);
  const dirtyRef = useRef(false);
  const enabledRef = useRef(enabled);
  const connectedRef = useRef(connected);
  const repoRef = useRef(repo);
  const branchRef = useRef(branch);
  const isPrivateRef = useRef(isPrivate);

  filesRef.current = files;
  enabledRef.current = enabled;
  connectedRef.current = connected;
  repoRef.current = repo;
  branchRef.current = branch;
  isPrivateRef.current = isPrivate;

  const checkConnection = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("getUserGitHubConnection", {});
      const d = res.data || {};
      setConnected(!!d.connected);
      setGhLogin(d.login || "");
      return !!d.connected;
    } catch {
      setConnected(false);
      setGhLogin("");
      return false;
    }
  }, []);

  useEffect(() => {
    if (enabled) checkConnection();
  }, [enabled, checkConnection]);

  // Persist settings
  useEffect(() => { try { localStorage.setItem(STORAGE.enabled, enabled ? "1" : "0"); } catch {} }, [enabled]);
  useEffect(() => { try { localStorage.setItem(STORAGE.repo, repo); } catch {} }, [repo]);
  useEffect(() => { try { localStorage.setItem(STORAGE.branch, branch); } catch {} }, [branch]);
  useEffect(() => { try { localStorage.setItem(STORAGE.isPrivate, isPrivate ? "1" : "0"); } catch {} }, [isPrivate]);

  const doPush = useCallback(async () => {
    if (inFlightRef.current) { dirtyRef.current = true; return; }
    const f = filesRef.current;
    const r = repoRef.current;
    if (!f.length || !r.trim()) return;
    inFlightRef.current = true;
    dirtyRef.current = false;
    setSyncState("syncing");
    setError("");
    try {
      const res = await base44.functions.invoke("pushAppToUserGitHubOAuth", {
        repo: r.trim(),
        branch: (branchRef.current || "main").trim(),
        commitMessage: `Auto-sync from TTT Builder · ${new Date().toLocaleTimeString()}`,
        isPrivate: isPrivateRef.current,
        files: f.map(x => ({ path: x.path, content: x.content || "" })),
      });
      if (res?.data?.repoUrl) setRepoUrl(res.data.repoUrl);
      setSyncState("synced");
      setLastSyncAt(Date.now());
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Sync failed";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
      setSyncState("error");
    } finally {
      inFlightRef.current = false;
      if (dirtyRef.current && enabledRef.current && connectedRef.current) {
        debounceRef.current = setTimeout(() => doPush(), 1200);
      }
    }
  }, []);

  // Debounced auto-sync — fires DEBOUNCE_MS after the last file change
  useEffect(() => {
    if (!enabled || !connected || !repo.trim() || loading) return;
    dirtyRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (dirtyRef.current && !inFlightRef.current) doPush();
    }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [files, enabled, connected, repo, loading, doPush]);

  const defaultSlug = useCallback(() => {
    const slug = (defaultName || "my-kaspa-app")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "");
    return slug || "my-kaspa-app";
  }, [defaultName]);

  const enable = useCallback((repoName) => {
    if (repoName) setRepo(repoName);
    else if (!repo) setRepo(defaultSlug());
    setEnabled(true);
    // Publish immediately — don't wait for the debounce so the repo is created now
    setTimeout(() => doPush(), 300);
  }, [repo, defaultSlug, doPush]);

  const disable = useCallback(() => {
    setEnabled(false);
    setSyncState("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const syncNow = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doPush();
  }, [doPush]);

  return {
    enabled, repo, branch, isPrivate, connected, ghLogin,
    syncState, lastSyncAt, error, repoUrl,
    setRepo, setBranch, setIsPrivate,
    enable, disable, syncNow, checkConnection,
  };
}