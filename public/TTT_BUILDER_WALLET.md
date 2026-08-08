# TTT Builder — Wallet Positioning Mandate

This is a hard, permanent rule for every app TTT Builder generates — simple or complex.
The rule is enforced at build time via `WALLET_RULE` in `src/components/tttbuilder/walletKit.js`,
which is injected into every build prompt. This doc is the canonical reference.

## The rule

The TTT Kaspa wallet panel (the Receive/Send/Export card) must NEVER overlap the app's
content. It is locked to a non-obstructive default position and only moves if the user
explicitly drags it.

## Required pattern: dropdown anchored to the header pill

- The header element that holds the wallet pill is `position: relative`.
- The pill lives in normal document flow inside the header (top-right), never
  `position: absolute/fixed`.
- The panel is `position: absolute; top: 100%; right: 0; width: 320px; max-height: 80vh;
  overflow-y: auto; z-index: 50` — it drops down directly below the pill.
- A transparent full-screen backdrop (`position: fixed; inset: 0; z-index: 40`) sits behind
  the panel and closes it on click. This is mandatory.

## Position lock

- The panel's default position is the anchored dropdown.
- It must NEVER be repositioned by the app layout, scroll, route changes, or any component
  mounting/unmounting.
- The ONLY way it may move is an explicit user drag (and only if a drag handle is
  implemented). On close/reopen it snaps back to the anchored default.
- Never center it. Never float it over the dashboard. Never "place it wherever looks nice."

## Mobile

On viewports < 640px the same panel may become a bottom sheet
(`position: fixed; bottom: 0; left: 0; right: 0; max-height: 85vh`) with the backdrop —
still never a bare centered card over content.

## Self-heal (recognize and fix this bug on sight)

Known-bad signature: a wallet card floating BARE over the page — a white rounded card with a
"BALANCE" / "0.0000 KAS" header, "Receive / Send / Export" pill tabs, a large QR code, a
"kaspa:qq..." address line, a "Copy address" link, and a small downward triangle, rendered
with `position: fixed/absolute` near top-center or center with NO full-screen backdrop, so it
sits on top of the hero / dashboard content. The triangle means it was meant to be a dropdown
but got detached from its anchor.

If a generated or inherited wallet matches that signature, refactor it into the anchored
dropdown: move the panel inside the header (`position: relative`), set the panel to
`position: absolute; top: 100%; right: 0`, and add the transparent fixed backdrop
(`position: fixed; inset: 0; z-index: 40`) that closes on click. Never leave the card
centered or floating. "The wallet overlaps the preview" is a trigger to fix the positioning
structure (anchor + backdrop), not to tweak colors or z-index.

## Hard failure

A bare `position: fixed/absolute` wallet card floating over content with no backdrop and no
anchor is a build failure. The panel must always have a backdrop and be anchored to the pill.
