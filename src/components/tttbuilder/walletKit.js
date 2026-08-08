// Drop-in Kaspa wallet protocol for every app TTT Builder generates.
// Native (Terra-style) wallet: no browser extension, real keys in the browser.

import { NATIVE_WALLET_SOURCE } from "./walletKitNative";

export const WALLET_KIT_PATH = "scripts/kaspa-wallet.js";
export const WALLET_KIT_SOURCE = NATIVE_WALLET_SOURCE;

// Guarantees the wallet kit exists AND is loaded by the app.
// If the project already carries a kit file (possibly customized by the builder
// or an agent), that version is KEPT — we never overwrite edits.
export function ensureWalletKit(files) {
  const isNpm = files.some(f => f.path === "package.json");
  const existing = files.find(f => (f.path === WALLET_KIT_PATH || f.path === "public/kaspa-wallet.js") && f.content && f.content.length > 200);
  // Keep the project's kit only if it's the current generation or newer — outdated
  // stock kits (no version tag / older tag) are upgraded to the latest source.
  const ver = (s) => Number((String(s).match(/KIT v(\d+)/) || [])[1] || 0);
  const keepExisting = existing && ver(existing.content) >= ver(WALLET_KIT_SOURCE);
  let out = files.filter(f => f.path !== WALLET_KIT_PATH && f.path !== "public/kaspa-wallet.js");
  out.push({ path: isNpm ? "public/kaspa-wallet.js" : WALLET_KIT_PATH, content: keepExisting ? existing.content : WALLET_KIT_SOURCE });

  const tag = isNpm
    ? '<script src="/kaspa-wallet.js"></script>'
    : `<script src="${WALLET_KIT_PATH}"></script>`;

  return out.map(f => {
    if (f.path !== "index.html") return f;
    if (f.content.includes("kaspa-wallet.js")) return f;
    const content = f.content.includes("</body>")
      ? f.content.replace("</body>", `  ${tag}\n</body>`)
      : f.content + `\n${tag}`;
    return { ...f, content };
  });
}

export const WALLET_RULE = `

KASPA WALLET PROTOCOL — ALWAYS AVAILABLE:
- The wallet kit is injected automatically and loaded via a script tag in index.html. NEVER import it from JS/JSX and never add it to package.json. Normally just use the global \`window.TTTWallet\` at runtime.
- The kit file (scripts/kaspa-wallet.js or public/kaspa-wallet.js) IS EDITABLE: if the user explicitly asks to change wallet behavior (balance handling, fees, UI of the fallback pill, extra methods), edit that file directly and return its FULL updated content — your version is kept. Do not touch it otherwise.
- LIVE BALANCE: the kit polls the balance every 10s and refreshes in a burst right after send(). \`TTTWallet.onChange(cb)\` fires with \`{address, mode, connected, balance}\` whenever the balance changes — drive your widget's balance display from \`state.balance\` in that callback instead of manual getBalance() polling, so sends/receives update the UI automatically. \`TTTWallet.refreshBalance()\` forces an immediate refresh.
- It is a NATIVE Kaspa wallet (like TTT Terra): the user creates or imports a real seed phrase in the browser, and the kit derives the address, reads balances and signs + submits real mainnet transactions. There is NO browser extension, NO KasWare. Never mention KasWare, MetaMask or "install an extension" anywhere in the UI.
- REACT/VITE PROJECTS: the file lives at public/kaspa-wallet.js and index.html loads it with <script src="/kaspa-wallet.js"></script>. Do NOT import it, do NOT put it in src/. Read it inside a useEffect via \`window.TTTWallet\` and subscribe with \`TTTWallet.onChange(cb)\` to drive React state.
- YOUR widget is the visible one. Put \`data-ttt-wallet\` on the root element of the wallet widget you build — that disables the kit's fallback overlay. If you forget it, a floating pill appears on top of your UI, which is a bug.
- API: TTTWallet.connect() (loads the saved wallet or creates one), TTTWallet.createWallet() -> {address, mnemonic}, TTTWallet.importWallet(mnemonic), TTTWallet.exportMnemonic(), TTTWallet.watch(address), TTTWallet.disconnect(), TTTWallet.forget(), TTTWallet.getState(), TTTWallet.onChange(cb), TTTWallet.getBalance(), TTTWallet.getTransactions(), TTTWallet.getPrice(), TTTWallet.send(to, amountKas) -> txId, TTTWallet.receiveQR(amount) -> QR image URL, TTTWallet.receiveURI(), TTTWallet.isValidAddress(a), TTTWallet.explorerUrl(txId). All async calls can throw — show the real message.
- When a new wallet is created you MUST show the seed phrase once with a "save this, it cannot be recovered" warning, and offer an import field for an existing phrase. Never ask for a private key.
- MANDATORY IN EVERY APP, NO EXCEPTIONS (even if the app has nothing to do with crypto): render a wallet widget INSIDE the app's own header/top bar, aligned to the TOP RIGHT, labelled "TTT Kaspa". Disconnected state = a compact "TTT Kaspa · Connect" button; connected state = the same pill showing the truncated address (kaspa:qz...abcd) and the live KAS balance, and clicking it opens an in-app panel/modal with Receive (QR + copy address) and Send. It must be part of the generated app's markup — never a separate page, never omitted, never placed only at the bottom.

WALLET POSITIONING — NEVER OVERLAP CONTENT (violating this is a failed build):
- The wallet pill (the "TTT Kaspa · Connect" / address button) MUST live in normal document flow INSIDE the app's header bar (flex/grid in the header row). NEVER position:absolute/fixed on the pill itself.
- The wallet PANEL (the Receive/Send/Export card that opens on click) MUST be a DROPDOWN anchored to the pill, full stop:
    * The header element that contains the pill is position:relative.
    * The panel is position:absolute; top:100%; right:0; width:320px; max-height:80vh; overflow-y:auto; z-index:50. It drops down DIRECTLY below the pill, never centered over the page.
    * A transparent full-screen backdrop div (position:fixed; inset:0; z-index:40) sits behind the panel and closes it on click. This is mandatory — it captures click-outside AND guarantees the panel never sits bare over content.
- POSITION LOCK — never auto-move the panel: its default position is the anchored dropdown above. It must NEVER be repositioned by the app's layout, scroll, route changes, or any component mounting/unmounting. The ONLY way it may move is an EXPLICIT user drag (and only if you implement a drag handle); on close/reopen it snaps back to the anchored default. Do NOT center it, do NOT float it over the dashboard, do NOT "place it wherever looks nice" — anchor it to the pill.
- The panel must have a visible X close button in its header AND backdrop-click closing. It must never be stuck open over content.
- On mobile (viewport < 640px) you MAY switch the SAME panel to a bottom sheet (position:fixed; bottom:0; left:0; right:0; max-height:85vh) with the backdrop — still never a bare centered card over content.
- REQUIRED STRUCTURE (mirror this exactly in your WalletWidget):
    <header style="position:relative"> ... <button data-ttt-wallet onClick={toggle}>TTT Kaspa · {connected ? shortAddr : "Connect"}</button>
      {open && <>
        <div style={{position:'fixed',inset:0,zIndex:40}} onClick={close} />
        <div style={{position:'absolute',top:'100%',right:0,width:320,maxHeight:'80vh',overflowY:'auto',zIndex:50}} data-ttt-wallet>
          <button onClick={close}>X</button> ... Receive / Send / Export tabs ... "Keys generated locally in this browser." ...
        </div>
      </>}
    </header>
- NEVER render the wallet panel as a bare position:fixed/absolute card with NO backdrop and NO anchor (a floating card over the dashboard). That overlap is the exact bug this rule exists to kill — it is a hard build failure.
- Always ship: create/import wallet, live balance in KAS + USD, a Receive panel with the QR and copyable address, a Send form that validates address/amount and links the returned txId to the explorer, and an Export panel with "Export seed phrase" (TTTWallet.exportMnemonic()) and "Export private key" (TTTWallet.exportPrivateKey()), each shown in a secure modal with a "keep this secret, never share it" warning. Watch-only wallets show "not available" for export.
- LOCAL ONLY: always display a visible note near the wallet: "Keys generated locally in this browser. Never sent to any server." The seed phrase and private key NEVER leave the browser — no fetch(), no API call, no telemetry. Only the signed transaction broadcast goes to api.kaspa.org.

WALLET OVERLAP — SELF-HEAL (recognize and fix this bug on sight, even in complex inherited apps):
- KNOWN-BAD signature: a wallet card floating BARE over the page — a white rounded card with a "BALANCE" / "0.0000 KAS" header, "Receive / Send / Export" pill tabs, a large QR code, a "kaspa:qq..." address line, a "Copy address" link, and a small downward triangle, rendered with position:fixed/absolute near top-center or center with NO full-screen backdrop, so it sits on top of the hero / dashboard content. The little triangle means it was meant to be a dropdown but got detached from its anchor. This is a hard build failure, not a styling preference.
- If you generate, inherit, or are asked to edit any project whose wallet matches that signature, you MUST refactor it into the anchored dropdown from the WALLET POSITIONING section: move the panel INSIDE the header element (position:relative), set the panel to position:absolute; top:100%; right:0; width:320px, and add the transparent fixed backdrop (position:fixed; inset:0; z-index:40) that closes it on click. The pill stays in header flow; the panel drops down directly below it. Never leave the card centered or floating.
- Treat "the wallet overlaps the preview" / "wallet card is on top of my content" / "wallet covers the dashboard" as a trigger to apply this fix immediately — do NOT just tweak colors, margins, or z-index; fix the positioning STRUCTURE (anchor + backdrop). After the fix, verify the panel opens below the pill and closes on backdrop click.
- This applies to every app, simple or complicated: the wallet panel is never an island floating over content. It is always anchored to the header pill.

TEXT OUTPUT RULE: write real characters in file content — never emit literal escape sequences like \\u2014, \\u00b7 or \\u21bb inside strings/JSX. Use plain ASCII punctuation (a hyphen "-" instead of an em dash) so nothing renders as gibberish.`;