# TTT Builder × Arh'tuun — Continuity Architecture

> How TTT Builder uses the existing Arh'tuun Phase 4 protocol to solve
> **state consistency in agentic workflows** and **context-window drift during
> live updates** — without treating the LLM context window as the project's
> memory.

This document is the open-source explanation of the continuity layer inside
TTT Builder. It is written for contributors, integrators, and anyone auditing
how a Kaspa-native AI coding environment keeps a long-running build coherent
across hours, days, and devices.

---

## The question we had to answer

While announcing TTT Builder we received this technical comment:

> *"Vibe coding is a fun way to frame it but shipping v0.1.8 in real time is a
> heavy lift for state consistency in agentic workflows. If the Kaspa
> integration relies on specific transaction timing, I am curious how you
> handle the context window drift during those live updates."*

Two concerns are packed into one sentence:

1. **State consistency in agentic workflows.** An LLM-driven builder is a
   stateful system with an unreliable memory. Each turn mutates files, git,
   deployment, and on-chain state. Across many turns, how do we keep the
   LLM's *belief* about the project aligned with the *actual* project?

2. **Context-window drift during live updates.** The LLM context window is
   bounded and degrades as a session grows. While the project keeps mutating
   in real time (files written, preview rendered, Kaspa transactions
   firing), how do we stop the model from acting on stale or hallucinated
   state once the window can no longer hold the full session?

The question is **not** "how do you make the LLM smarter." It is: *what is
your durable source of truth, and how does the agent stay synced to it once
the context window is no longer sufficient?* That is exactly the gap
Arh'tuun's **Return Thread** is designed to address — Phase 4 defines it for
*personal identity*; TTT Builder repurposes it for *project identity*.

---

## The problem in concrete terms

TTT Builder is an LLM coding environment where users build Kaspa apps over
hours, days, or weeks. The concrete failures it must survive:

1. **Context-window exhaustion.** A multi-day project produces far more
   conversation + file history than any context window holds.
2. **Intent amnesia (the "why" loss).** The Builder will remember *what*
   files exist but forget *why* an architecture was chosen, *why* a feature
   was removed, or *why* a Kaspa pattern was rejected.
3. **State divergence across six distinct truths** (see below).
4. **Interrupted / resumed sessions.** A user leaves for a week; the LLM
   context is gone. On return, the Builder has the files but not the thread.
5. **Live-update races.** While the LLM is mid-build, the preview updates,
   autosync pushes to GitHub, and (if anchoring) a Kaspa tx is in-flight.
6. **Hallucinated continuity.** A resumed LLM may invent a plausible-but-wrong
   project history — the exact failure Arh'tuun solves with Kaspa-anchored
   truth.
7. **Multi-instance / open-source drift.** A user clones the Builder, runs
   locally with their own LLM and keys. Continuity must be portable and
   user-owned, not platform-locked.

### Six sources of truth — they are not one state

| Layer            | What it owns                              | Volatility        |
|------------------|-------------------------------------------|-------------------|
| Human intent     | what the user actually wants              | in their head     |
| AI context       | what the LLM currently believes           | volatile, bounded|
| Filesystem       | what files exist right now                | authoritative "is"|
| Git              | what was committed                        | append-only       |
| Deployment       | what is live at a URL                     | on deploy action  |
| Kaspa / on-chain | what was cryptographically asserted + when| immutable         |

These drift independently. Files can change without a commit. A commit can
exist without a deploy. A deploy can exist without an anchor. An anchor can
describe intent that no longer matches the files. **The Builder must never
silently assume they agree.**

---

## What Arh'tuun already provides (Phase 4)

Arh'tuun is an existing protocol — not something invented for TTT Builder.
From the Phase 4 spec it already defines:

- **Arh'tuun** — a continuity protocol for identity persistence across digital
  fractures.
- **The Return Thread** — returning to an intentional thread after an
  interruption, rather than starting cold.
- **Continuity Anchors** — the atomic unit, with four dimensions:
  - **Vector** — directional aim: the desired future state (not the task).
  - **Weight** — contextual significance: why this matters now.
  - **Open Loop** — point of suspension: the specific unresolved question /
    next action.
  - **Pressure** — motivational quality: `creative_flow | urgent_solving |
    analytical_thinking | routine_execution`.
- **Kaspa cryptographic verification** — every Anchor receives a
  `kaspa_tx_hash` + `block_height`, making it hallucination-resistant and
  tamper-evident.
- **A three-layer architecture** — Intent Observation → Intent Preservation →
  Intent Restoration.
- **The AI Continuity Spine** — invisible, AI-mediated context preservation.
- **User-owned identity infrastructure** — continuity belongs to the user.
- **Anti-Storage-Fallacy design** — preserves the *why* (compressed meaning),
  not the *what* (raw data).

---

## What Arh'tuun does NOT provide (and TTT Builder adds)

Phase 4 is a personal identity/focus protocol, not a software-engineering
tool. It does **not** define:

- **Project / filesystem state** — anchors capture intent, not file trees.
- **Git integration** — no commit SHAs, no diff awareness.
- **Deployment state** — no URL, no build artifact, no "what is live" record.
- **A deterministic project manifest** — no canonicalized structure/dependency
  description for stable hashing.
- **Divergence detection** — Phase 4 verifies an anchor is *authentic*; it does
  not check whether the anchor's Open Loop still matches reality.
- **State-machine semantics** over the six sources of truth.
- **Builder-specific metadata** (file lists, touched paths, model used, build
  mode, wallet-kit version, sandbox URL).

These are added as **clearly-labeled Builder-specific extensions**, never
retrofitted into Phase 4 itself.

---

## The integration: Arh'tuun as the continuity layer

The core move: **Arh'tuun sits *between* the LLM context and the project's
concrete states.** The LLM context is treated as ephemeral and untrusted;
Arh'tuun provides the compact, verified, user-owned "what this project is
and where it's going" that the LLM rehydrates from on every session.

Kaspa's role is **anchoring + verification, never storage.** The filesystem
stores code; Git stores history; deployment stores the live artifact; Kaspa
anchors the *hash* of meaningful transitions. Each source of truth owns its
lane.

```
Human
  │  (intent — only the human has it)
  ▼
TTT Builder (UI + session + file editing + preview + deploy + git sync)
  ▼
LLM Agent
  │  (ephemeral context; untrusted memory)
  │  ← reads Return Thread on resume, never the full history
  ▼
Arh'tuun Continuity Layer
  ├── Continuity Anchors (Phase 4: Vector/Weight/Open Loop/Pressure
  │                       + Builder metadata)
  ├── Project State   (deterministic manifest; filesystem = "what is")
  ├── Git             (source of "what was committed")
  ├── Deployment      (source of "what is live")
  └── Kaspa Verification (anchors the *hash*; verifies authenticity + time)
```

### Trust hierarchy (who wins on conflict)

1. **Filesystem / Git / Deployment / Kaspa** — ground truth for *what exists*.
2. **Anchors** — ground truth for *what was intended and when* (verified).
3. **LLM context** — scratchpad for the current turn only; never trusted over
   (1) or (2).

---

## Continuity Anchors in TTT Builder

A TTT Builder Anchor is a **Phase 4 Continuity Anchor extended with
Builder-specific metadata** — never redefined. The four Phase 4 dimensions
stay intact:

- **Vector** → the project's directional aim.
- **Weight** → why it matters right now.
- **Open Loop** → the exact unresolved point.
- **Pressure** → the nature of the work.

**Builder-specific metadata (added):**

- `project_id` — links the anchor to a Builder project.
- `files_snapshot` — a deterministic **project manifest** (file list +
  per-file content hash + entry point + dependencies). This is what gets
  hashed — not the file bodies.
- `git_ref` — last commit SHA (or null).
- `deployment_ref` — live URL + deploy ID (or null).
- `kaspa_refs` — relevant on-chain references (or null).
- `model_ref` — which model/mode produced the state (reproducibility, not
  trust).
- `trigger` — what event created this anchor.

Anchors are **append-only** and **cryptographically anchored**. The LLM never
edits an anchor; it reads them and creates new ones.

### What events qualify for an anchor

The anti-Storage-Fallacy principle maps to one rule: **do not anchor every
message.** An Anchor marks a *meaningful state transition*.

Qualifying events:

1. Major user-intent statement (new project, or a pivot).
2. Architectural decision that constrains future work.
3. Completed milestone (works end-to-end in preview).
4. Unresolved decision / explicit open loop.
5. Git commit (a checkpoint the user chose to persist).
6. Deployment (a version shipped live).
7. Kaspa on-chain action (an anchor itself, a token deploy, a covenant action,
   a payment tied to the app).
8. Explicit session end ("I'm done for now").
9. Divergence resolution (see below) — the resolution is itself anchored.

**Non-qualifying:** every LLM message, every keystroke, every preview
refresh, routine edits that don't change intent. Heuristic: *would a future
you, cold-starting this project, need to know this happened?*

---

## Return Threads

On session resume, the Builder does **not replay the full conversation.** It
reconstructs a compact **Return Thread** — a small, deterministic document
built from Anchors + live state inspection, fed into the LLM as the fresh
context.

A Return Thread contains:

- **What the project is** — latest Vector + current project manifest.
- **Where it is going** — Vector from the most recent intent-anchor.
- **Why it matters** — Weight from the most recent anchor.
- **What remains unresolved** — the most recent Open Loop + any unresolved
  decision anchors still open.
- **Current constraints** — last session's Pressure + flagged divergences.
- **Last meaningful state** — manifest hash from the last anchor vs. the
  current manifest (the divergence check).
- **Relevant Git commit** — current HEAD vs. the commit in the last anchor.
- **Deployment state** — current live URL + whether it matches the last
  anchored deployment.
- **Relevant Kaspa references** — anchored tx hashes + app-level on-chain
  state.

The Return Thread is **generated deterministically** from (a) the anchor
chain and (b) live inspection of filesystem / Git / deploy / Kaspa. It is
*not stored* — it is recomputed on every return, so it always reflects
current reality. The LLM receives only this compact thread, not the history.
This is the direct mechanism by which Arh'tuun reduces dependence on the
context window.

---

## Divergence detection (the part Phase 4 does not solve)

Phase 4 verifies an Anchor is *authentic*; it does not verify an Anchor is
*still accurate*. TTT Builder adds a divergence system comparing the last
Anchor's recorded state to current reality:

- **Anchor vs. filesystem** — manifest hash changed → files moved since the
  anchor. Flagged only if the Open Loop assumed a state that no longer holds.
- **Anchor vs. Git** — anchor's `git_ref` behind HEAD → uncommitted work;
  HEAD ahead in an unexpected way → external edits.
- **Anchor vs. deployment** — deployed content hash ≠ anchor's recorded
  content → redeploy outside the Builder, or stale deploy.
- **Anchor vs. Kaspa** — anchor's tx does not confirm, or a referenced app
  tx is in a different state → on-chain reality moved.
- **Anchor vs. LLM belief** — the LLM asserts something contradicted by the
  live manifest → the LLM is hallucinating; live state wins.

Resolution: the Builder surfaces divergence as explicit, human-readable
statements — *"Your last session expected vote-signing to be unimplemented,
but the current files show a completed `signVote()` — did you finish this?"*
— and lets the user or agent reconcile, then **anchors the resolution**. The
Builder never silently assumes continuity.

---

## What Kaspa verifies (and what never goes on-chain)

Kaspa's role is **anchoring + verification, never storage.** Only hashes and
small, public, non-secret identifiers belong on-chain.

**Hashed and anchored:**

- The Continuity Anchor itself (canonicalized serialization of all fields).
- The project manifest hash (proves "at time T, the project was exactly
  this").
- Git commit SHA (optional, redundant with Git's own integrity).
- Deployment identifier (URL + content hash).
- Selected public project metadata (entry point, stack, dependency list).

**Never on-chain (hard rule):**

- API keys, private keys, passwords, credentials, LLM keys, seed phrases,
  wallet secrets, user PII, source code content, full file bodies.

Kaspa provides a tamper-evident, time-ordered, publicly verifiable proof
that a given state existed at a given block. The manifest hash proves
integrity; the files are re-fetched from filesystem/Git — never from the
chain.

---

## What stays local

Everything except the on-chain hash stays user-owned and local:

- Full anchor content — stored in the user's project continuity store
  (entity on hosted TTTz; local file/SQLite on self-hosted clones).
- Full file contents — filesystem/Git, never Kaspa.
- Manifest details — local; only the hash is anchored.
- LLM history — local, ephemeral, disposable.
- All secrets — local only.

**Hashes on Kaspa, meaning locally, code in Git, live artifact at the deploy
target.**

---

## Open-source / local operation

TTT Builder is open-source; users clone it, run locally, use their own LLM +
keys. Arh'tuun survives this:

- **Local anchors** — the continuity store is a portable artifact bundled
  with the project. A cloned Builder reads/writes it locally; no TTTz
  server required.
- **Optional Kaspa anchoring** — on-chain anchoring is *opt-in*. Without a
  wallet, a user runs on local anchors (losing cryptographic verification but
  keeping continuity). With a wallet, they anchor and get tamper-resistance.
- **Verification from cloned instances** — because only hashes are on-chain,
  any cloned Builder verifies an anchor by recomputing the canonical hash and
  checking it against the referenced Kaspa tx. A project's continuity is
  verifiable by anyone, anywhere, without trusting TTTz.
- **Export / import** — a project export = files + Git ref + deploy ref +
  anchor chain + (optionally) anchored tx hashes. Import on another instance
  reconstructs the full continuity. The user owns their continuity and can
  move it between hosted TTTz and self-hosted instances.
- **Interoperability** — the Anchor schema is the contract. Different
  Builder instances (different LLMs, configs) read the same anchor chain
  because the four dimensions + metadata are model-agnostic.

---

## The precise answer to the commenter

> *Does Arh'tuun solve context-window drift itself, or does it provide a
> continuity layer that reduces the Builder's dependence on the context
> window?*

**The latter.** Arh'tuun does **not** solve context-window drift — the
context window is a property of the LLM runtime and nothing outside it can
enlarge it or prevent tokens from aging out. Drift will still happen.

Arh'tuun makes drift **harmless.** By externalizing the project's meaningful
continuity into a compact, verified, user-owned anchor chain — and by
regenerating a fresh Return Thread from anchors + live state on every resume
— the Builder stops relying on the context window as the *memory of the
project*. When the window inevitably loses early turns, the Builder
rehydrates from the anchor chain rather than from stale conversation. The
LLM context becomes a *scratchpad for the current turn*, not the *store of
record*.

Beyond Arh'tuun, the Builder adds:

1. **Project-state inspection** — deterministic manifest generation.
2. **Git inspection** — HEAD / commit / diff reading.
3. **Deterministic project manifests** — canonical file list + content hashes
   for stable anchoring and divergence diffing.
4. **Context summarization** — compress the current turn's history into the
   next anchor's Open Loop rather than into the LLM window.
5. **Continuity Anchors** — provided by Phase 4.
6. **Divergence detection** — live-state vs. anchor comparison
   (Builder-specific; Phase 4 has no concept of "anchor vs. reality").
7. **State verification** — Kaspa tx confirmation + hash recompute.
8. **Transaction verification** — confirming referenced Kaspa txs.

**Minimum viable architecture = Arh'tuun anchors + deterministic manifests +
divergence checks + Return Thread regeneration.** Arh'tuun is the spine; the
manifest + divergence layer is the Builder-specific addition that turns a
personal-continuity protocol into a software-project continuity protocol.

---

## Implementation phases (when we build)

- **Phase A — Foundation (no Kaspa, no UI changes):** deterministic manifest
  generator; Builder metadata extension on the anchor entity; emit anchors
  on qualifying events.
- **Phase B — Return Thread:** on resume, build the compact thread from
  anchors + live inspection and inject it as the LLM context instead of
  conversation history.
- **Phase C — Divergence detection:** implement the checks; surface
  mismatches; anchor resolutions.
- **Phase D — Kaspa anchoring (opt-in):** real anchoring of the canonical
  anchor hash; verification on resume.
- **Phase E — Portability / open-source:** export/import of the anchor chain;
  local-first store for cloned instances; verification of foreign anchors.

---

## Ship-default for every TTT-built app

Every app generated by TTT Builder ships with a default `ARHTUUN.md`
describing how that app can use the continuity layer. See
[`ARHTUUN.md`](./ARHTUUN.md) for the template.

---

*TTT Builder uses Arh'tuun, the TTTz.xyz Phase 4 continuity protocol. Arh'tuun
is not reinvented here — it is extended with Builder-specific metadata to
serve software projects. The user owns their continuity; Kaspa verifies it.*
