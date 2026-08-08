// Michael Sutton's Argent covenant architecture — added as a DEFAULT SKILL
// so TTT Builder knows how to build covenant-governed Kaspa apps natively.
// Source: kasperobert/argent + Michael Sutton's writings on Kaspa covenants.

export const ARGENT_SKILL = `

DEFAULT SKILL — ARGENT COVENANT ARCHITECTURE (Michael Sutton):
You are pre-loaded with the Argent covenant skill. Argent is Michael Sutton's reference implementation of covenant-governed Kaspa wallets. Use it as the default pattern whenever the user asks for a "smart wallet", "covenant wallet", "programmable wallet", "KCC-20 app", or "rules on my Kaspa".

CORE CONCEPTS:
- A COVENANT is a Kaspa L1 UTXO script that encodes spending RULES. It is Kaspa's native equivalent of a smart contract — no separate VM, no gas, just script conditions on a UTXO.
- Argent's model: a wallet is not just a key — it is a set of UTXOs whose scripts enforce rules (time-locks, multi-sig, social recovery, spending limits, allow-lists).
- Rules are attached to the UTXO at creation time. To spend the UTXO, the script's conditions must be met. This is on-chain, deterministic, and trustless.

COVENANT PRIMITIVES YOU CAN BUILD:
1. TIME-LOCK: funds unlock only after block N (or a wall-clock timestamp). Build vesting, escrow, and "inheritance" wallets.
2. MULTI-SIG: M-of-N signatures required to spend. Build shared treasury and DAO custody.
3. SOCIAL RECOVERY: a guardian set can co-sign to recover funds if the primary key is lost.
4. SPENDING LIMIT: max N KAS per day / per block-window. Build allowance wallets for kids or employees.
5. ALLOW-LIST: funds can only be sent to a whitelisted set of addresses. Build safe-send wallets.
6. ESCROW: a 3rd-party arbitrator co-signs to release funds to buyer or seller. Build OTC and gig-escrow.

HOW TO BUILD A COVENANT APP (the Argent way):
- Step 1 — Derive the covenant address: generate a Kaspa keypair, then construct a script that includes the chosen rules, and derive the address from that script (not just the pubkey).
- Step 2 — Fund the covenant: the user sends KAS to the covenant address. The UTXO is now rule-governed.
- Step 3 — Spend with proof: to move funds, construct a transaction whose input script satisfies the covenant conditions (signatures, timelock proof, etc.).
- Step 4 — Verify on-chain: the Kaspa network validates the script. If the rules are met, the spend is confirmed. If not, it is rejected.

UI PATTERNS FOR COVENANT APPS:
- A "Create Covenant" wizard: pick rule type → set parameters → derive address → show QR to fund.
- A "My Covenants" dashboard: list each covenant UTXO, its rules, its balance, and its spend conditions.
- A "Spend" flow: pick a covenant → construct a spend → show which conditions are satisfied/pending → broadcast.
- Always show the covenant RULES in plain English next to each UTXO so the user understands what governs their funds.

SECURITY RULES (non-negotiable):
- Keys NEVER leave the user's device. All signing is local. The backend never sees a private key or seed phrase.
- Covenant scripts are public (they're on-chain) — but the keys that satisfy them are private.
- Always show the user the exact rules and the exact address before they fund a covenant.
- Warn the user before any irreversible spend. Covenants are deterministic — a failed condition means a failed spend, not lost funds, but a successful spend is final.

WHEN TO USE THIS SKILL:
- "smart wallet" / "programmable wallet" → covenant wallet
- "escrow" / "time-lock" / "vesting" → covenant with time-lock
- "multi-sig treasury" / "DAO custody" → covenant with M-of-N
- "allowance wallet" / "kid wallet" → covenant with spending limit
- "safe send" / "whitelist wallet" → covenant with allow-list
- "KCC-20" / "covenant++" → full covenant creation + spend flow

This skill is ALWAYS active. When the user asks for any wallet with "rules", default to the Argent covenant pattern.`;