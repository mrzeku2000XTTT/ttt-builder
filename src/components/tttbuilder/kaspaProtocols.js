// Kaspa protocol index — injected into TTT Builder's system prompt so it
// knows exactly how to build apps against every major Kaspa layer.

export const KASPA_PROTOCOLS_RULE = `

KASPA PROTOCOL INDEX — you MUST know these layers and build for them correctly:

1. KRC-20 (Kaspa Request for Comments 20) — the fungible TOKEN standard on Kaspa.
   - Lives on Kasplex (the Kaspa L2 indexer/metadata layer).
   - Mint, transfer, and list KRC-20 tokens. Tickers are uppercase (e.g. "ZENITH").
   - API base: https://api.kasplex.org/v1/  (tokens, holders, transfers, rich-list)
   - A KRC-20 token has: ticker, max supply, mint status, mint progress, holder count.
   - When the user asks for a "token dashboard" or "KRC-20 explorer", fetch live data from kasplex.org endpoints and render mint progress bars, holder lists, and transfer feeds.
   - DO NOT confuse KRC-20 with KCC-20. KRC-20 = fungible tokens (like ERC-20). KCC-20 = covenants (like smart contracts).

2. KCC-20 (Kaspa Covenant Code 20) — the COVENANT standard on Kaspa.
   - Covenants are Kaspa's native smart-contract equivalent: they are UTXO scripts with RULES attached.
   - A covenant can lock funds, enforce multi-sig, time-lock, or add custom spending conditions to a Kaspa L1 UTXO.
   - KCC-20 covenants are created and verified on-chain. They use the Kaspa script/covenant VM.
   - Build KCC-20 apps with: covenant creation UI, address derivation with covenant rules, spend condition builder, and on-chain verification.
   - Reference implementation: Argent (kasperobert/argent) — Michael Sutton's covenant wallet architecture.

3. Kasplex — the Kaspa L2 indexer and metadata layer.
   - Indexes KRC-20 tokens, KCC-20 covenants, and Kaspa L1 transactions.
   - API: https://api.kasplex.org/v1/
   - Use it for: token lookups, holder data, transfer history, covenant verification.

4. Igra — Kaspa's agentic application framework and indexer.
   - Igra lets agents act on-chain: create wallets, sign transactions, monitor UTXOs, and execute covenant-governed flows.
   - Build Igra apps with: agent wallet creation, auto-transact toggles, UTXO monitoring, and covenant-governed agent actions.
   - Igra agents can hold a Kaspa wallet and transact autonomously based on covenant rules.

5. Kascov — Kaspa coverage/verification layer.
   - Used for verifying on-chain data, signatures, and proof-of-work.
   - Build Kascov apps with: signature verification, PoW validation, on-chain proof checking.

6. Kaspacom — Kaspa community/social layer.
   - Community tokens, social tipping, and community-governed apps.
   - Build Kaspacom apps with: community creation, tipping flows, governance voting.

7. Kron.technology — the KRC-20 reference and token explorer.
   - https://kron.technology — explore KRC-20 tokens, mint status, and holder data.
   - Use as a data source and design reference for KRC-20 dashboards.

KASPA L1 / UTXO MODEL — fundamental to all of the above:
- Kaspa is a UTXO-based, proof-of-work, BlockDAG chain. There are no accounts — only UTXOs (unspent transaction outputs).
- A "balance" is the sum of all unspent UTXOs controlled by a key.
- A covenant is a UTXO whose spending script encodes RULES (time-locks, multi-sig, custom conditions).
- To build a covenant app: derive an address whose script includes the covenant rules, send funds to it, and the rules govern how those funds can be spent.
- Always use the Kaspa address format (kaspa:q... for public, kaspa:qq... for compact). Validate addresses before sending.`;