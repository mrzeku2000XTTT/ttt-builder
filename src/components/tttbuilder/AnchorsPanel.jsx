import React, { useState, useEffect, useCallback } from "react";
import { Anchor, Loader2, Plus, ShieldCheck, Hash, Clock, ExternalLink, AlertTriangle, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";

const PRESSURE_OPTIONS = [
  { value: "creative_flow", label: "Creative Flow" },
  { value: "urgent_solving", label: "Urgent Solving" },
  { value: "analytical_thinking", label: "Analytical" },
  { value: "routine_execution", label: "Routine" },
];

const TRIGGER_OPTIONS = [
  { value: "intent", label: "Intent / pivot" },
  { value: "milestone", label: "Milestone" },
  { value: "open_loop", label: "Open loop" },
  { value: "commit", label: "Git commit" },
  { value: "deployment", label: "Deployment" },
  { value: "kaspa_action", label: "Kaspa action" },
  { value: "session_end", label: "Session end" },
  { value: "manual", label: "Manual" },
];

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Deterministic project manifest hash: sorted file list, each "path\0contentHash".
async function computeManifestHash(files) {
  const sorted = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const parts = [];
  for (const f of sorted) parts.push(`${f.path}\0${await sha256Hex(f.content || "")}`);
  return sha256Hex(parts.join("\n"));
}

export default function AnchorsPanel({ files = [], projectId = "" }) {
  const [anchors, setAnchors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [vector, setVector] = useState("");
  const [weight, setWeight] = useState("");
  const [openLoop, setOpenLoop] = useState("");
  const [pressure, setPressure] = useState("creative_flow");
  const [trigger, setTrigger] = useState("manual");
  const [tags, setTags] = useState("");
  const [gitRef, setGitRef] = useState("");
  const [deploymentRef, setDeploymentRef] = useState("");

  const [walletMode, setWalletMode] = useState("mnemonic"); // mnemonic | privatekey
  const [mnemonic, setMnemonic] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [fromAddress, setFromAddress] = useState("");

  const loadAnchors = useCallback(async () => {
    setLoading(true);
    try {
      const all = await base44.entities.ContinuityAnchor.list("-anchor_timestamp", 100);
      const mine = projectId
        ? all.filter(a => a.project_id === projectId)
        : all;
      setAnchors(mine);
    } catch (err) {
      setError(err?.message || "Failed to load anchors");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadAnchors(); }, [loadAnchors]);

  const canCreate = vector.trim() && weight.trim() && openLoop.trim() && fromAddress.trim() && (mnemonic.trim() || privateKey.trim()) && !creating;

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    setError("");
    try {
      const manifestHash = await computeManifestHash(files);
      const anchorTimestamp = new Date().toISOString();

      const res = await base44.functions.invoke("anchorContinuity", {
        vector: vector.trim(),
        weight: weight.trim(),
        open_loop: openLoop.trim(),
        pressure,
        project_id: projectId,
        manifest_hash: manifestHash,
        git_ref: gitRef.trim(),
        deployment_ref: deploymentRef.trim(),
        trigger,
        context_tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        anchor_timestamp: anchorTimestamp,
        mnemonic: walletMode === "mnemonic" ? mnemonic.trim() : undefined,
        privateKey: walletMode === "privatekey" ? privateKey.trim() : undefined,
        fromAddress: fromAddress.trim(),
      });

      const data = res?.data || res;
      if (!data?.success || !data.txId) throw new Error(data?.error || "Anchoring failed — no transaction id returned.");

      await base44.entities.ContinuityAnchor.create({
        vector: vector.trim(),
        weight: weight.trim(),
        open_loop: openLoop.trim(),
        pressure,
        project_id: projectId,
        manifest_hash: manifestHash,
        content_hash: data.content_hash,
        git_ref: gitRef.trim(),
        deployment_ref: deploymentRef.trim(),
        trigger,
        context_tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        anchor_timestamp: data.anchor_timestamp || anchorTimestamp,
        kaspa_tx_hash: data.txId,
        block_height: data.block_daa_score || 0,
        is_verified: !!data.is_verified,
      });

      // reset form
      setVector(""); setWeight(""); setOpenLoop(""); setTags(""); setGitRef(""); setDeploymentRef("");
      await loadAnchors();
    } catch (err) {
      setError(err?.message || "Anchoring failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Arh'tuun Anchors</h2>
        <p className="text-xs text-white/40">Continuity Anchors for this project — cryptographically verified on Kaspa. Each anchor captures Vector, Weight, Open Loop & Pressure.</p>
      </div>

      <div className="bg-[#70C7BA]/10 border border-[#70C7BA]/25 rounded-xl p-3 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-[#70C7BA] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-white/60 leading-relaxed">
          Anchoring sends a tiny self-transaction from your wallet, costing a small Kaspa fee. Only the <span className="text-[#70C7BA] font-bold">content hash</span> is proven on-chain — your seed phrase, private key, code, and secrets never leave your control. The credentials below are used only to sign this one transaction.
        </p>
      </div>

      {/* Create form */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-white/50 font-medium">
          <Plus className="w-3.5 h-3.5 text-[#70C7BA]" /> New Continuity Anchor
        </div>

        <Field label="Vector — directional aim">
          <input value={vector} onChange={e => setVector(e.target.value)} placeholder="What future state are you trying to bring into existence?" className={inputCls} />
        </Field>
        <Field label="Weight — why it matters now">
          <textarea value={weight} onChange={e => setWeight(e.target.value)} placeholder="Why does this matter right now?" rows={2} className={inputCls} />
        </Field>
        <Field label="Open Loop — point of suspension">
          <input value={openLoop} onChange={e => setOpenLoop(e.target.value)} placeholder="Where exactly did you leave off / what's unresolved?" className={inputCls} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Pressure">
            <select value={pressure} onChange={e => setPressure(e.target.value)} className={inputCls}>
              {PRESSURE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Trigger">
            <select value={trigger} onChange={e => setTrigger(e.target.value)} className={inputCls}>
              {TRIGGER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Git ref (commit SHA, optional)">
            <input value={gitRef} onChange={e => setGitRef(e.target.value)} placeholder="" className={inputCls} />
          </Field>
          <Field label="Deployment URL (optional)">
            <input value={deploymentRef} onChange={e => setDeploymentRef(e.target.value)} placeholder="" className={inputCls} />
          </Field>
        </div>

        <Field label="Context tags (comma separated)">
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="kcc20, wallet, vote" className={inputCls} />
        </Field>

        {/* Wallet */}
        <div className="pt-1 border-t border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/50 font-medium">Anchoring wallet</div>
            <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
              {["mnemonic", "privatekey"].map(m => (
                <button key={m} onClick={() => setWalletMode(m)} className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize transition-colors ${walletMode === m ? "bg-white text-black" : "text-white/50 hover:text-white"}`}>
                  {m === "mnemonic" ? "Seed phrase" : "Private key"}
                </button>
              ))}
            </div>
          </div>
          {walletMode === "mnemonic" ? (
            <input value={mnemonic} onChange={e => setMnemonic(e.target.value)} placeholder="12/24-word seed phrase" className={inputCls} type="password" />
          ) : (
            <input value={privateKey} onChange={e => setPrivateKey(e.target.value)} placeholder="hex private key" className={inputCls} type="password" />
          )}
          <input value={fromAddress} onChange={e => setFromAddress(e.target.value)} placeholder="kaspa:your-address" className={inputCls} />
          <div className="flex items-start gap-1.5 text-[10px] text-white/30">
            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 text-yellow-400/60" />
            <span>Local-only. Used solely to sign this anchor transaction. Never stored or logged.</span>
          </div>
        </div>

        {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}

        <button
          onClick={handleCreate}
          disabled={!canCreate}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#70C7BA] text-black text-sm font-bold hover:bg-[#70C7BA]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Anchoring on Kaspa…</> : <><Anchor className="w-4 h-4" /> Create & Anchor on Kaspa</>}
        </button>
      </div>

      {/* Anchor list */}
      <div>
        <div className="text-xs text-white/40 font-medium mb-2">{anchors.length} anchor{anchors.length !== 1 ? "s" : ""} for this project</div>
        {loading ? (
          <div className="flex items-center gap-2 text-white/30 text-xs py-6"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading anchors…</div>
        ) : anchors.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-xs">No anchors yet. Create one above to preserve this project's continuity thread.</div>
        ) : (
          <div className="space-y-2">
            {anchors.map(a => (
              <div key={a.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Anchor className="w-3.5 h-3.5 text-[#70C7BA]" />
                    <span className="text-xs text-white/40">{a.trigger || "manual"}</span>
                  </div>
                  {a.is_verified ? (
                    <span className="flex items-center gap-1 text-[10px] text-[#70C7BA] font-bold"><ShieldCheck className="w-3 h-3" /> Verified</span>
                  ) : (
                    <span className="text-[10px] text-white/30">Unverified</span>
                  )}
                </div>
                <div className="text-sm text-white/90 leading-snug mb-1">{a.vector}</div>
                <div className="text-[11px] text-white/50 leading-snug mb-2">{a.open_loop}</div>
                {a.kaspa_tx_hash && (
                  <div className="flex items-center gap-3 text-[10px] text-white/40 font-mono pt-2 border-t border-white/[0.06]">
                    <span className="flex items-center gap-1 truncate"><Hash className="w-2.5 h-2.5" /> {a.kaspa_tx_hash.slice(0, 18)}…</span>
                    {a.block_height ? <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {a.block_height.toLocaleString()}</span> : null}
                    <a href={`https://kaspa.org/explorer/transactions/${a.kaspa_tx_hash}`} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-[#70C7BA] hover:underline">
                      Explorer <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/50";

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[11px] text-white/50 mb-1 block font-medium">{label}</label>
      {children}
    </div>
  );
}