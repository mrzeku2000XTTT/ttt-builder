import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2, ExternalLink, RefreshCw, Code2, Eye, Zap, Globe, ArrowRight, ChevronRight, GitBranch, CheckCircle, ArrowLeft, Monitor, Smartphone, Server, FolderOpen, Store, Maximize2, PanelLeftClose, PanelLeftOpen, ClipboardList, Github, KeyRound, Settings } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import FileExplorer from "@/components/tttbuilder/FileExplorer";
import FileEditor from "@/components/tttbuilder/FileEditor";
import E2BLivePanel from "@/components/tttbuilder/E2BLivePanel";
import ModelSelector from "@/components/tttbuilder/ModelSelector";
import BuildModeToggle from "@/components/tttbuilder/BuildModeToggle";
import BuilderOrb from "@/components/tttbuilder/BuilderOrb";
import ChatMessage from "@/components/tttbuilder/ChatMessage";
import EnhanceButton from "@/components/tttbuilder/EnhanceButton";
import WalletKitToggle from "@/components/tttbuilder/WalletKitToggle";
import AttachButton from "@/components/tttbuilder/AttachButton";
import TemplateGallery from "@/components/tttbuilder/TemplateGallery";
import PasteHtmlButton from "@/components/tttbuilder/PasteHtmlButton";
import { IMAGE_RULE, resolveImages } from "@/components/tttbuilder/imageGen";
import { WALLET_RULE, ensureWalletKit } from "@/components/tttbuilder/walletKit";
import { bundleProject, applyFileOps, sortFiles, FILE_OPS_SCHEMA, norm, findMissingImports } from "@/components/tttbuilder/projectFiles";
import { orchestrateBuild, parseResult } from "@/components/tttbuilder/orchestrator";
import { invokeLLMWithRetry } from "@/components/tttbuilder/llmRetry";
import ProjectsPanel, { upsertProject } from "@/components/tttbuilder/ProjectsPanel";
import DashboardSidebar from "@/components/tttbuilder/DashboardSidebar";
import { OverviewPanel, AgentsPanel, DatabasePanel, MemoryPanel, SettingsPanel } from "@/components/tttbuilder/DashboardPanels";
import PushToStoreModal from "@/components/tttbuilder/PushToStoreModal";
import PushToGitHubModal from "@/components/tttbuilder/PushToGitHubModal";
import GitHubSyncIndicator from "@/components/tttbuilder/GitHubSyncIndicator";
import { useGitHubAutoSync } from "@/components/tttbuilder/useGitHubAutoSync";
import ChatDropZone from "@/components/tttbuilder/ChatDropZone";
import CloneUrlButton from "@/components/tttbuilder/CloneUrlButton";
import DesignOptionsButton from "@/components/tttbuilder/DesignOptionsButton";
import FullscreenPreview from "@/components/tttbuilder/FullscreenPreview";
import { KASPA_PROTOCOLS_RULE } from "@/components/tttbuilder/kaspaProtocols";
import { ARGENT_SKILL } from "@/components/tttbuilder/argentSkill";
import ChatModeToggle from "@/components/tttbuilder/ChatModeToggle";
import SecurityPanel from "@/components/tttbuilder/SecurityPanel";
import AnchorsPanel from "@/components/tttbuilder/AnchorsPanel";
import { analyzeAttachments } from "@/components/tttbuilder/fileAnalyzer";
import CloneBuilderRepoModal from "@/components/tttbuilder/CloneBuilderRepoModal";
import OnboardingModal, { isStandalone } from "@/components/tttbuilder/OnboardingModal";
import { getLocalProviders, LOCAL_MODEL_PREFIX, isLocalModelId } from "@/components/tttbuilder/localLlm";

const OUR_REPO = "TTT-Build/ttt-sites";
const STANDALONE = isStandalone();

const SCOPE_RULE = `

SCOPE DISCIPLINE — FOLLOW THE REQUEST LITERALLY:
- Build EXACTLY what the user asked for and nothing else. Do not widen the subject.
- If the user asks for a KASPA dashboard, show KASPA data only (price, 24h change, market cap, volume, supply, hashrate, blocks) — do NOT add Bitcoin, Ethereum, Solana or any other coin unless they explicitly ask for them.
- Same rule for every domain: no extra sections, no extra entities, no filler cards the user did not request.
- Depth over breadth: make the requested subject rich (chart, stats, detail panels) instead of padding with unrelated items.`;

const LIVE_DATA_RULE = `

LIVE DATA — HARD REQUIREMENT (violating this is a failed build):
- NEVER write a hardcoded price, percentage or stat into the code. No seed arrays of prices, no Math.random(), no "simulated" drift, no fake tick animation. If you cannot fetch it, show an error state.
- Fetch on mount AND on a 30s setInterval, and clear the interval on teardown.
- Kaspa specifically:
  price/change/mcap/volume: https://api.coingecko.com/api/v3/coins/kaspa?localization=false&tickers=false&community_data=false&developer_data=false
  simple price: https://api.coingecko.com/api/v3/simple/price?ids=kaspa&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true
  7d chart: https://api.coingecko.com/api/v3/coins/kaspa/market_chart?vs_currency=usd&days=7
  network stats: https://api.kaspa.org/info/hashrate and https://api.kaspa.org/info/blockdag and https://api.kaspa.org/info/coinsupply
- Render only values that came back from the response. Show a skeleton while loading, a visible error + Retry button on failure, and a real "Updated HH:MM:SS" timestamp taken from the moment the fetch succeeded.

RESILIENT FETCHING — CoinGecko rate-limits (429) and then the browser reports "Failed to fetch". You MUST write a helper that tries multiple CORS-friendly sources in order and only shows an error if ALL of them fail:
  1. CoinCap (very reliable, CORS open): https://api.coincap.io/v2/assets?ids=bitcoin,ethereum,solana,cardano,polkadot,kaspa  → data[].priceUsd, changePercent24Hr, marketCapUsd, volumeUsd24Hr
  2. Binance (per symbol): https://api.binance.com/api/v3/ticker/24hr?symbol=KASUSDT → lastPrice, priceChangePercent
  3. CoinGecko simple/price (as written above)
- Prefer CoinCap as the PRIMARY source. Wrap each attempt in try/catch, check res.ok, use AbortController with an ~8s timeout, and keep the previously loaded values visible while a refresh is retrying (never blank the UI on a failed refresh — show a small "retrying…" note instead).
- The Retry button re-runs the same helper chain.`;

const TROUBLESHOOT_RULE = `

TROUBLESHOOTING PROTOCOL — when the user reports something broken (an error, a blank screen, a 400/404/500, "doesn't work", "shows wrong data"):
1. REPRODUCE MENTALLY: trace the exact user action through the current project files, line by line, until you find the code that actually governs the reported behavior. Never guess.
2. ROOT CAUSE, NOT SYMPTOM: identify WHY it happens (malformed URL, wrong query param, missing file, bad address encoding, race condition, unhandled promise, stale state) and fix that — never patch around it.
3. HTTP FAILURES: inspect the exact URL and body being sent. A 400 means the request itself is wrong — check encoding, casing, required params. Surface the response body text in the error shown to the user, never just the status code.
4. VERIFY THE FIX: re-trace the same user action through your changed code end-to-end; confirm every import resolves, every element id referenced in JS exists in the markup, and every async path has a visible error state.
5. If the same bug was "fixed" before and came back, the previous fix missed — search WIDER in the project for other code paths producing the same symptom.
6. STATE THE ROOT CAUSE in your summary in one plain sentence so the user learns what was actually wrong.
7. Everything you build must surface failures visibly: failed fetches show the real error message and a Retry button — never a silent blank screen.`;

const SURGICAL_EDIT_RULE = `

SURGICAL EDITING — TOUCH ONLY WHAT THE USER ASKED FOR:
- When the user asks to change ONE thing (a color, a section, a button, a fix), edit ONLY the file(s) that contain that thing. Return ONLY those files with their FULL updated content. Do NOT return files you did not touch.
- Never rewrite or rename files the user did not ask you to change. If a file is not related to the request, leave it out of the response entirely.
- If the user says "fix the send button", open the file with the send button, fix that button, and return only that file. Do not restructure the app, do not rename components, do not "improve" unrelated code.
- Accuracy over creativity: the user's intent is a scalpel, not a sledgehammer. A precise 2-line fix beats a full rewrite every time.
- The only exception is when the user explicitly asks to "rebuild", "redesign", "restructure" or "start over" — then a full rewrite is the intent.`;

const APPLE_DESIGN_RULE = `

APPLE / macOS PREMIUM DESIGN LANGUAGE — the default aesthetic:
- Typography is the hero: use a crisp system font stack (-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif). Large, tight headline tracking (letter-spacing -0.02em to -0.03em), generous line-height (1.4 body, 1.05 headlines). Never use generic serif or decorative fonts unless the user asks.
- Frosted glass: use backdrop-filter: blur(20px) saturate(180%) on overlays, nav bars, and cards over rich backgrounds. Semi-transparent backgrounds (rgba(255,255,255,0.7) light / rgba(20,20,22,0.7) dark).
- Depth and layering: soft shadows (0 8px 32px rgba(0,0,0,0.12)), rounded corners (12-20px on cards, 8-10px on buttons, 999px on pills). Subtle 1px borders (rgba(0,0,0,0.06) light / rgba(255,255,255,0.08) dark).
- Motion: spring-based easing (cubic-bezier(0.34, 1.56, 0.64, 1) for playful, cubic-bezier(0.4, 0, 0.2, 1) for UI). 200-400ms transitions. Hover states lift slightly (translateY(-2px)) with a shadow increase.
- Color: muted, desaturated backgrounds. One vibrant accent. Generous whitespace. No neon, no harsh gradients. Light mode: #f5f5f7 bg, #1d1d1f text. Dark mode: #0b1216 bg, #ffffff text, #70C7BA accent.
- Components feel native: segmented controls, rounded toggle switches, sheet-style modals that slide up, list rows with chevron disclosure indicators. Every interactive element has a clear tap target (min 44px).`;

const AGENT_RULE = `

AGENTIC APPS — when the user asks for "an agentic app", "AI agents", "a workflow", or "multi-agent":
- Build a real multi-agent system inside the app: each agent is a self-contained module (e.g. scripts/agents/researcher.js, scripts/agents/planner.js, scripts/agents/executor.js) with a clear role, input, and output.
- Agents communicate through a shared message bus / event emitter or a simple queue in localStorage. Each agent runs its step, posts its result, and triggers the next.
- Give the user a visible workflow UI: a panel that shows each agent, its current status (idle / running / done), its latest output, and a "Run workflow" button. Show the step-by-step progress as it happens.
- Use window.TTTWallet or fetch() to public APIs as agent tools. An agent that "researches" should fetch real data; an agent that "plans" should produce a real task list; an agent that "executes" should call the tools and show results.
- The workflow must be deterministic and replayable: the user can run it again and see fresh results. Persist the last run in localStorage so it survives refreshes.

ADDITIVE AGENT INSTALL — when the user asks to "add an agent", "add AI", or "add a workflow" to a project that ALREADY HAS FILES:
- This is an EXTENSION of the existing app, NOT a rebuild. Do NOT return files you are not changing. Do NOT restructure or rename existing files.
- Add the agent as NEW files only: a new module under src/agents/ (or scripts/agents/), a new workflow panel component, and a small mount point that wires the agent panel into the EXISTING app shell (e.g. add one <AgentPanel /> import + render to the existing App.jsx or main page — edit that one file surgically, return only the changed lines plus the new files).
- The agent must actually DO something real: an image-generation agent calls a real image API and shows the result; a research agent fetches live data; a video agent calls a real video endpoint. No stub agents that just log "running…".
- If the existing app already has an agent system, EXTEND it (add the new agent to its registry) rather than creating a parallel one.
- Return ONLY: the new agent files + the one or two existing files you surgically edited to mount them. Never return the whole project.`;

// TTT Agent 1 = strongest available model + elite engineering directive
const TTT_AGENT_1 = "claude_opus_4_8";
const AGENT_1_DIRECTIVE = `

YOU ARE TTT AGENT 1 — the highest tier build agent. Work at the level of a staff engineer shipping production software:
- THINK FIRST: silently decide the data model, the file structure and the component boundaries before writing a line.
- ARCHITECTURE: many small single-purpose files. No file over ~150 lines. Shared logic extracted into its own module. Named, meaningful functions — no giant inline blobs.
- COMPLETENESS: every feature you name in your summary is fully wired — no TODOs, no stubs, no dead handlers, no "coming soon".
- CORRECTNESS: guard every async call, validate inputs, handle empty/loading/error states, avoid race conditions on intervals and fetches, clean up listeners and timers.
- REAL DATA ALWAYS: live APIs over invented numbers, with retry and a visible last-updated state.
- DESIGN: cohesive design system (spacing scale, type scale, tokens), deliberate motion, hover/focus/active states, perfect mobile layout at 375px, no horizontal scroll.
- Ship something a user could put in front of customers today.`;

const MULTIPLAYER_RULE = `

MULTIPLAYER APPS - when the user asks for "multiplayer", "play with friends", "online", "real-time", or "shared state between players":
- Build a REAL networked multiplayer experience, NOT a local pass-and-play fake. Use a public real-time backend that works with zero setup:
  - PRIMARY: PeerJS (free, no server needed). In STATIC MODE add <script src="https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js"></script> in index.html; in REAL PROJECT MODE run npm install peerjs. One peer creates a room and gets a shareable room code (the PeerJS id), others join with that code. Use the DataConnection to sync game state (moves, scores, turns) in real time.
  - FALLBACK: a public WebSocket relay (e.g. wss://ws.postman-echo.com/raw) if PeerJS signalling fails.
- AUTHORITATIVE HOST: the room creator owns the game state. Clients send their moves to the host; the host validates them, applies the rules (win/lose/turn), and broadcasts the new state to every client. Never let a client declare a win locally.
- LOBBY UI: a "Create Room" button (generates a room code, shows it with a Copy button), a "Join Room" input (enter the code), and a live player list with connection status. Handle disconnects gracefully - mark the player "left" and let the host continue or end the round.
- SYNC every state-changing action over the wire: moves, turn changes, score updates, game-over, and restart. Add a small connection-quality/latency badge so players see the link is live.
- The TTT Kaspa wallet kit still ships in the header as normal.
- If the user ONLY wants local two-player (same device, pass-and-play), build that instead. But the words "multiplayer", "online", or "with friends" mean the NETWORKED version above.`;

const EXAMPLES = [
  "Kaspa staking dashboard with live price ticker and animated stats",
  "NFT marketplace with gallery, filters, and wallet connect UI",
  "DeFi protocol app with TVL counter, swap interface, and charts",
  "Crypto portfolio tracker with holdings table and pie chart",
  "Web3 developer portfolio with project cards and contact form",
];

const SYSTEM_PROMPT = `You are TTT Builder — an expert full-stack web developer working in a REAL multi-file project.

FILE SYSTEM RULES — MUST FOLLOW EXACTLY:
- The project is a folder of files. index.html is the entry point and MUST always exist.
- Split the app into proper files, e.g.: index.html, styles/main.css, scripts/app.js, scripts/state.js, data/config.json
- index.html links its files with RELATIVE paths only: <link rel="stylesheet" href="styles/main.css"> and <script src="scripts/app.js"></script>
- NO external CDN <script> or font <link> tags — but fetch() to public APIs DOES work.
- Return in "files" the FULL final content of every file you create or change (never diffs, never partial files, no placeholders like "// rest unchanged")
- Only include files you actually touched. Use "deleted_files" for files that should be removed.
- Keep existing file paths stable when modifying an app — edit those same files instead of renaming them.

TWO PROJECT MODES — pick based on what the user asks for:

A) STATIC MODE (default): vanilla HTML/CSS/JS, no build step. Renders instantly in the Preview tab.
   - No CDN script/font tags and no npm — all code self-contained — but fetch() to public APIs works.

B) REAL PROJECT MODE: use this when the user asks for React, Vue, Svelte, Next, TypeScript, Node/Express, an API, a database, Python, or any real backend.
   - Write a proper npm project: package.json (with all dependencies and a "dev" or "start" script), config files (e.g. vite.config.js), src/ files with real imports/JSX/modules.
   - For frontends use Vite and make the dev script bind publicly: "dev": "vite --host 0.0.0.0 --port 3000"
   - For Node backends listen on port 3000 and host 0.0.0.0.
   - For Python write main.py serving on port 8000, host 0.0.0.0.
   - CDN links and npm packages ARE allowed here — the sandbox has real internet.
   - This mode runs in the Live tab (a real Linux sandbox that runs npm install and starts the server). Tell the user to hit the Live tab to run it.
   - index.html still must exist at the project root (Vite's entry point).

REAL DATA RULE — NEVER FAKE NUMBERS:
- If the app shows real-world data (crypto prices, market caps, weather, sports, news), you MUST fetch it live from a free public CORS-enabled API. Hardcoded/mock prices are a FAILURE.
- Crypto prices/changes: https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano,polkadot,kaspa&vs_currencies=usd&include_24hr_change=true
  Charts/history: https://api.coingecko.com/api/v3/coins/{id}/market_chart?vs_currency=usd&days=7
  Map symbols to CoinGecko ids (BTC→bitcoin, ETH→ethereum, SOL→solana, ADA→cardano, DOT→polkadot, KAS→kaspa).
- Refresh with setInterval (e.g. every 30–60s), show a "live" indicator and the last-updated time.
- Handle loading + failure states: skeletons while loading, a visible retry/error message if the request fails. Never silently fall back to invented numbers.
- Only user-owned data (holdings, tasks, settings) may be seeded/persisted locally — value/price columns must be computed from the live prices.

QUALITY BAR — build like a senior product engineer:
- Plan the architecture first, then split it into clean focused files (one concern per file, no 1000-line dumps).
- Real state management, real event handling, no dead buttons — every control does something.
- Polished visual craft: consistent spacing scale, type scale, hover/focus states, empty states, micro-animations, keyboard accessibility.
- Mobile-first responsive: nothing overflows horizontally at 375px width.

CODE RULES:
- Static mode: pure vanilla JavaScript, no frameworks, no build step
- Write ALL styles in CSS files (no Tailwind unless you add it to package.json in real project mode)
- Use CSS custom properties, CSS animations, CSS Grid/Flexbox for beautiful layouts
- Write REAL interactivity: event listeners, DOM manipulation, state variables in JS
- For games: implement full game logic (win detection, turn switching, score tracking, AI if needed)
- For dashboards: fetch real live data on an interval (see REAL DATA RULE), charts drawn with SVG or Canvas
- For apps: full CRUD, local storage persistence, form validation
- Use dark theme with these colors unless user says otherwise: bg #0d1117, accent #70C7BA (Kaspa green), text #e6edf3
- Add CSS animations: keyframes, transitions, hover effects, pulse effects
- Make it fully responsive with media queries
- index.html is a complete <!DOCTYPE html> ... </html> document
- IMPORTANT: The app must render and work immediately — no loading, no missing assets
- Build whatever the user asks, fully functional, beautiful, production quality`;

const HTML_TO_REACT_DIRECTIVE = `CONVERSION TASK — turn the pasted HTML below into a COMPLETE React + Vite application (not a copy-paste of the markup):
- Recreate the design faithfully: same layout, sections, copy, spacing, typography and colour palette as the pasted HTML.
- Produce a real npm project: package.json (react, react-dom, react-router-dom, vite, @vitejs/plugin-react, "dev": "vite --host 0.0.0.0 --port 3000"), vite.config.js, index.html, src/main.jsx, src/App.jsx.
- src/App.jsx sets up react-router-dom routes. The pasted page becomes the real landing page at "/". Every nav link / anchor in the pasted HTML that points at a page (features, pricing, about, docs, dashboard, contact…) becomes its own route + page file under src/pages/, fully designed in the same visual language — no dead links, no empty pages.
- Split every section of the page into its own component under src/components/ (Navbar, Hero, Features, Pricing, Footer, …), each under ~150 lines. Convert inline <script> logic into React state/effects and <style>/CSS into CSS files imported by the components.
- Make it a working app, not a static shell: real React state, working forms with validation, mobile nav that opens/closes, and any data shown must be fetched live per the LIVE DATA rules.
- Keep the mandatory TTT Kaspa wallet widget in the header.`;

const MODE_DIRECTIVE = {
  html: `\n\nLOCKED MODE: STATIC MODE (A). The user explicitly chose HTML mode.
- Use ONLY vanilla HTML/CSS/JS. NO package.json, NO npm, NO React/JSX, NO build step.
- index.html at the project root must be a complete document that renders in a sandboxed iframe with no internet.`,
  react: `\n\nLOCKED MODE: REAL PROJECT MODE (B). The user explicitly chose React mode.
- Write a real npm project: package.json (react, react-dom, vite, @vitejs/plugin-react, "dev": "vite --host 0.0.0.0 --port 3000"), vite.config.js, index.html at root, src/main.jsx, src/App.jsx and separate components under src/components/.
- Real ES module imports and JSX. Plain CSS files unless you add a styling package to package.json.
- This renders directly in the Preview tab (compiled in-browser), and can also run in the Live sandbox.`,
};

export default function TTTBuilderPage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setAuthLoading(false); }).catch(() => setAuthLoading(false));
  }, []);

  if (authLoading) {
    return <div className="min-h-screen bg-[#0d1117] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#70C7BA]/40 border-t-[#70C7BA] rounded-full animate-spin" /></div>;
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-center px-5">
        <div>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-white font-bold text-xl mb-2">Admin Only</h2>
          <p className="text-white/40 text-sm">TTT Builder is restricted to admins.</p>
        </div>
      </div>
    );
  }

  return <TTTBuilderStudio />;
}

function TTTBuilderStudio() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [topTab, setTopTab] = useState("preview"); // "preview" | "dashboard"
  const [dashSection, setDashSection] = useState("overview"); // dashboard sidebar section
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showPushStoreModal, setShowPushStoreModal] = useState(false);
  const [showPushGithubModal, setShowPushGithubModal] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [publishForm, setPublishForm] = useState({ siteName: "", repo: OUR_REPO });
  const iframeRef = useRef(null);
  const chatEndRef = useRef(null);
  const runIdRef = useRef(0); // bumped on New Chat to abort any in-flight generate()
  const [iframeKey, setIframeKey] = useState(0);
  const [device, setDevice] = useState("desktop"); // desktop | mobile
  const [model, setModel] = useState(() => {
    try {
      const saved = localStorage.getItem("ttt_builder_model");
      // Standalone builds have no hosted models — if the saved model is a hosted
      // one (or none exists), default to the user's first local/open model instead.
      if (STANDALONE) {
        const locals = getLocalProviders();
        if (locals.length > 0) {
          if (!saved || (!isLocalModelId(saved) && saved !== "automatic")) {
            return `${LOCAL_MODEL_PREFIX}${locals[0].id}`;
          }
        }
      }
      return saved || "ttt_agent_1";
    } catch { return "ttt_agent_1"; }
  });

  const [buildMode, setBuildMode] = useState(() => {
    try { return localStorage.getItem("ttt_builder_mode") || "react"; } catch { return "react"; }
  });

  const changeBuildMode = (m) => {
    setBuildMode(m);
    try { localStorage.setItem("ttt_builder_mode", m); } catch {}
  };

  const [walletKit, setWalletKit] = useState(() => {
    try { return localStorage.getItem("ttt_builder_wallet") !== "off"; } catch { return true; }
  });

  const changeWalletKit = (v) => {
    setWalletKit(v);
    try { localStorage.setItem("ttt_builder_wallet", v ? "on" : "off"); } catch {}
  };

  const changeModel = (m) => {
    setModel(m);
    try { localStorage.setItem("ttt_builder_model", m); } catch {}
  };
  const [attachments, setAttachments] = useState([]);
  const [mobileView, setMobileView] = useState("preview"); // chat | preview (mobile only)
  const [liveUrl, setLiveUrl] = useState(null); // real running URL from the E2B sandbox (npm projects)
  const [chatCollapsed, setChatCollapsed] = useState(() => {
    try { return localStorage.getItem("ttt_builder_chat_collapsed") === "1"; } catch { return false; }
  });
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < 1024);
  const [showProjects, setShowProjects] = useState(false);
  const [projectId, setProjectId] = useState(() => {
    try { return localStorage.getItem("ttt_builder_project_id") || ""; } catch { return ""; }
  });

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // On real phones always show the phone-framed preview
  const effectiveDevice = isNarrow ? "mobile" : device;

  // Persist session across refreshes — real multi-file project
  const [files, setFiles] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ttt_builder_files") || "null");
      if (Array.isArray(saved) && saved.length) return saved;
      const legacy = localStorage.getItem("ttt_builder_html");
      if (legacy) return [{ path: "index.html", content: legacy }];
    } catch {}
    return [];
  });
  const [activePath, setActivePath] = useState("index.html");
  const html = useMemo(() => bundleProject(files), [files]);
  const activeFile = files.find(f => f.path === activePath) || files[0] || null;
  const isRealProject = files.some(f => f.path === "package.json");
  const missingImports = useMemo(() => findMissingImports(files), [files]);
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ttt_builder_messages") || "[]"); } catch { return []; }
  });

  // Auto-sync every file change to the user's connected GitHub repo (debounced)
  const autosync = useGitHubAutoSync(files, {
    loading,
    defaultName: prompt || (messages.find(m => m.role === "user")?.content) || "my-kaspa-app",
  });
  const [phase, setPhase] = useState(() => {
    try { return localStorage.getItem("ttt_builder_phase") || "hero"; } catch { return "hero"; }
  });
  const [chatMode, setChatMode] = useState(() => {
    try { return localStorage.getItem("ttt_builder_chat_mode") || "build"; } catch { return "build"; }
  });
  const [analyzing, setAnalyzing] = useState(null); // {name, status} while a file is being analyzed

  useEffect(() => {
    try { localStorage.setItem("ttt_builder_chat_collapsed", chatCollapsed ? "1" : "0"); } catch {}
  }, [chatCollapsed]);

  useEffect(() => {
    try { localStorage.setItem("ttt_builder_files", JSON.stringify(files)); } catch {}
  }, [files]);

  // RESUME ON MOUNT — if the user comes back with an existing project, jump
  // straight to the studio (never the hero, never a blank refresh).
  useEffect(() => {
    try {
      const savedFiles = JSON.parse(localStorage.getItem("ttt_builder_files") || "[]");
      const savedMsgs = JSON.parse(localStorage.getItem("ttt_builder_messages") || "[]");
      if (Array.isArray(savedFiles) && savedFiles.length > 0 && savedMsgs.length > 0) {
        setPhase("studio");
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-snapshot the session right before the user closes the tab / navigates away,
  // so "resume" always has the freshest state.
  useEffect(() => {
    const onBeforeUnload = () => {
      try {
        if (files.length > 0) {
          const id = projectId || `proj_${Date.now()}`;
          upsertProject({
            id,
            name: (prompt || "Untitled").slice(0, 60),
            files,
            messages,
            phase,
            buildMode,
            model,
            walletKit,
            savedAt: new Date().toISOString(),
          });
        }
      } catch {}
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, messages, phase, buildMode, model, walletKit, projectId, prompt]);

  const updateFile = (path, content) => {
    setFiles(prev => prev.map(f => (f.path === path ? { ...f, content } : f)));
    setIframeKey(k => k + 1);
  };

  const createFile = (path) => {
    setFiles(prev => (prev.some(f => f.path === path) ? prev : sortFiles([...prev, { path, content: "" }])));
    setActivePath(path);
  };

  const deleteFile = (path) => {
    setFiles(prev => prev.filter(f => f.path !== path));
    setActivePath("index.html");
    setIframeKey(k => k + 1);
  };

  useEffect(() => {
    try { localStorage.setItem("ttt_builder_messages", JSON.stringify(messages)); } catch {}
  }, [messages]);

  useEffect(() => {
    try { localStorage.setItem("ttt_builder_phase", phase); } catch {}
  }, [phase]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generate = async (userPrompt, opts = {}) => {
    if (!userPrompt.trim() || loading) return;
    const runMode = opts.mode || buildMode;
    const myRunId = ++runIdRef.current;
    setLoading(true);
    setPhase("studio");

    const attached = opts.attachments !== undefined ? opts.attachments : attachments;
    const newMsg = { role: "user", content: userPrompt, attachments: attached.length ? attached.map(a => ({ name: a.name, image: a.image })) : undefined };
    setMessages(prev => [...prev, newMsg]);
    setPrompt("");
    setAttachments([]);

    try {
      const history = [...messages, newMsg]
        .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.role === "assistant" ? "[previous HTML omitted]" : m.content}`)
        .join("\n");

      const wantsWallet = /wallet|balance|seed|send kas|receive|transaction/i.test(userPrompt);
      const projectDump = files.length
        ? `Current project files:\n${files.filter(f => wantsWallet || !f.path.includes("kaspa-wallet.js")).map(f => `--- FILE: ${f.path} ---\n${f.content.slice(0, f.path.includes("kaspa-wallet.js") ? 30000 : 6000)}`).join("\n\n")}`
        : "";

      const isAgent1 = model === "ttt_agent_1";
      // "ttt_agent_1" is a UI alias — resolve it to the real model id before any LLM call.
      const llmModel = isAgent1 ? TTT_AGENT_1 : model;
      // Context budget: the full system prompt is ~32K chars (~8K tokens). Local
      // models (qwen 32K ctx) struggle when wallet/kaspa/argent rules bloat the
      // prompt for a simple landing page. Only include the heavy rules when the
      // user's prompt actually touches those domains — saves ~17K chars (~4.3K
      // tokens) for non-crypto builds, leaving room for file context + output.
      const isLocal = !isAgent1 && model !== "automatic" && !model.startsWith("gpt") && !model.startsWith("claude") && !model.startsWith("gemini");
      const p = userPrompt.toLowerCase();
      const needsWallet = walletKit || /wallet|balance|seed|send kas|receive|transaction|kaspa|krc-20|zeku/i.test(p);
      const needsMultiplayer = /multiplayer|realtime|socket|live room|game lobby|duel|battle|co-op|versus|1v1/i.test(p);
      const needsKaspaProtocols = /kaspa|dag|blockdag|krc-20|mempool|utxo|node/i.test(p);
      const needsArgent = /argent|covenant|smart contract|kaspinator|opcode/i.test(p);
      // TTT Agent 1 (hosted, 200K ctx) always gets the full prompt — it can handle it.
      // Local / BYO-key models get a trimmed prompt unless the domain is relevant.
      const trim = isLocal;
      let baseRules = `${SYSTEM_PROMPT}${SCOPE_RULE}${LIVE_DATA_RULE}${TROUBLESHOOT_RULE}${SURGICAL_EDIT_RULE}${APPLE_DESIGN_RULE}${AGENT_RULE}${trim && !needsMultiplayer ? "" : MULTIPLAYER_RULE}${IMAGE_RULE}${trim && !needsKaspaProtocols ? "" : KASPA_PROTOCOLS_RULE}${trim && !needsArgent ? "" : ARGENT_SKILL}${MODE_DIRECTIVE[runMode] || ""}${needsWallet ? WALLET_RULE : ""}${isAgent1 ? AGENT_1_DIRECTIVE : ""}`;

      // If the user is adding an agent/AI/workflow to a project that already has
      // files, make it crystal clear: this is an EXTENSION, not a rebuild.
      const isAddAgentIntent = /\b(add|include|insert|install)\b.*\b(agent|ai|workflow|assistant|bot)\b/i.test(userPrompt);
      if (files.length > 0 && isAddAgentIntent) {
        baseRules += `\n\nCRITICAL — ADD TO EXISTING PROJECT: The user is adding an agent to a project that already has ${files.length} file(s). Do NOT rebuild the app. Do NOT return files you are not changing. Add the agent as NEW files and surgically edit only the one or two existing files needed to mount the agent panel (e.g. add an import + render the <AgentPanel/> in the existing App.jsx). Every existing file you were not asked to change must be left exactly as it is. The agent must actually work — a real API call that produces a real result (image, data, summary), not a stub.`;
      }

      // Analyze attached files of ANY type (images, text, PDFs, videos) so the
      // LLM can actually use their content. Shows a per-file analyzing state.
      let fileUrls = [];
      let attachmentNote = "";
      if (attached.length) {
        setAnalyzing({ name: attached[0].name, status: "analyzing" });
        const analyzed = await analyzeAttachments(attached, (s) => setAnalyzing(s));
        fileUrls = analyzed.fileUrls;
        attachmentNote = analyzed.note;
        setAnalyzing(null);
      }

      // PLAN / DISCUSS modes — no code is written, just a text response.
      if (chatMode !== "build") {
        const modeDirective = chatMode === "plan"
          ? "You are in PLAN MODE. Do NOT write or modify any code. Read the user's request and the current project, then produce a clear, structured plan: what files to create/edit, what each will contain, the data model, the UI sections, and the order of work. End with a one-line summary. The user will review this plan before building."
          : "You are in DISCUSS MODE. Do NOT write or modify any code. Answer the user's question about the project, architecture, design, or approach in plain language. Be concise and helpful.";
        const raw = await invokeLLMWithRetry({
          system: baseRules,
          prompt: `${modeDirective}\n\n${projectDump}\n${attachmentNote}\n${history ? `Conversation so far:\n${history}\n` : ""}\nUser: ${userPrompt}`,
          model: llmModel,
          file_urls: fileUrls.length ? fileUrls : undefined,
        });
        const text = typeof raw === "string" ? raw : (raw?.response || JSON.stringify(raw));
        if (runIdRef.current !== myRunId) return; // stale — New Chat already reset
        setMessages(prev => [...prev, { role: "assistant", content: text, mode: chatMode }]);
        return;
      }

      const patchLast = (patch) =>
        setMessages(prev => prev.map((m, i) => (i === prev.length - 1 ? { ...m, ...patch } : m)));

      let nextFiles, summary, thinking = [], touched = [], agentList = null, planText = "", activityLog = [];

      if (isAgent1) {
        // TTT Agent 1 orchestrates as many specialist subagents as the build needs
        setMessages(prev => [...prev, { role: "assistant", content: "Planning the build…", agents: [], activity: [] }]);
        let live = [];
        const run = await orchestrateBuild({
          baseRules,
          userPrompt,
          history,
          files,
          model: TTT_AGENT_1,
          fileUrls,
          attachmentNote,
          onProgress: (ev) => {
            if (runIdRef.current !== myRunId) return; // stale — ignore progress
            if (ev.type === "activity") {
              activityLog = [...activityLog, ev.item];
              patchLast({ activity: activityLog });
            } else if (ev.type === "planned") {
              live = ev.agents;
              patchLast({ content: `Dispatching ${live.length} subagents…`, plan: ev.plan, agents: live });
            } else if (ev.type === "agent_start") {
              live = live.map((a, i) => (i === ev.index ? { ...a, status: "running" } : a));
              patchLast({ content: `Running: ${ev.name}`, agents: live });
            } else if (ev.type === "agent_done") {
              live = live.map((a, i) => (i === ev.index ? { ...a, status: ev.status, files: ev.files?.length ? ev.files : a.files } : a));
              patchLast({ agents: live });
            }
          },
        });
        nextFiles = run.files;
        touched = run.touched;
        summary = run.summary;
        thinking = run.thinking;
        agentList = live.length ? live : run.agents;
        planText = run.summary;
      } else {
        const raw = await invokeLLMWithRetry({
          system: baseRules,
          prompt: `${files.length > 0 ? `Previous conversation:\n${history}\n\n${projectDump}\n\nUser wants to MODIFY this project:` : "User wants to BUILD a new project:"}
          ${attachmentNote}
          ${userPrompt}

          Return the file operations only.`,
          model: llmModel,
          file_urls: fileUrls.length ? fileUrls : undefined,
          response_json_schema: FILE_OPS_SCHEMA,
        });
        const result = parseResult(raw);
        nextFiles = applyFileOps(files, result);
        touched = (result?.files || []).map(f => norm(f.path));
        summary = result?.summary || "Project updated.";
        thinking = Array.isArray(result?.thinking) ? result.thinking : [];
      }

      // Turn TTT_IMAGE[...] markers into real generated artwork
      nextFiles = await resolveImages(nextFiles, (item) => {
        activityLog = [...activityLog, item];
        if (isAgent1) patchLast({ activity: activityLog });
      });

      // Every generated app ships with the Kaspa wallet protocol
      if (walletKit) nextFiles = sortFiles(ensureWalletKit(nextFiles));
      if (!nextFiles.length) throw new Error("The build produced no files. Try rephrasing your prompt.");
      const isNpm = nextFiles.some(f => f.path === "package.json");
      // Only static projects need a root index.html — npm projects run through the Live sandbox
      if (!isNpm && !nextFiles.some(f => f.path === "index.html")) {
        throw new Error("The build didn't produce an index.html. Try again.");
      }

      // Stale run (user hit New Chat mid-build) — drop everything, don't touch state.
      if (runIdRef.current !== myRunId) return;

      setFiles(nextFiles);
      setActivePath(touched.includes("index.html") ? "index.html" : touched[0] || "index.html");
      setIframeKey(k => k + 1);
      // npm projects auto-run their real sandbox right inside the Preview tab
      setTopTab("preview");

      const finalMsg = { role: "assistant", content: summary, thinking, files: touched, agents: agentList || undefined, plan: planText || undefined, activity: activityLog.length ? activityLog : undefined };
      if (isAgent1) patchLast(finalMsg);
      else setMessages(prev => [...prev, finalMsg]);

      // Auto-snapshot this build so it shows up in Projects and can be restored later
      try {
        const id = projectId || `proj_${Date.now()}`;
        if (!projectId) { setProjectId(id); localStorage.setItem("ttt_builder_project_id", id); }
        const firstUser = [...messages, newMsg].find(m => m.role === "user")?.content || "Untitled";
        upsertProject({
          id,
          name: (userPrompt || firstUser).slice(0, 60),
          files: nextFiles,
          messages: [...messages, newMsg, finalMsg],
          phase: "studio",
          buildMode: runMode,
          model,
          walletKit,
          savedAt: new Date().toISOString(),
        });
      } catch {}
    } catch (err) {
      if (runIdRef.current !== myRunId) return; // stale — New Chat already reset
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `⚠️ Generation failed: ${err?.message || "unknown error"}\n\nTip: big multi-file projects work best with a shorter, more specific prompt.`,
      }]);
    } finally {
      if (runIdRef.current === myRunId) setLoading(false);
    }
  };

  // Self-heal: when the E2B sandbox reports a Vite build error (a black screen
  // is Vite's dark error overlay), feed the real build logs to the builder so it
  // fixes only the broken file(s) instead of leaving a dead preview.
  const fixBuild = (logs) => {
    generate(`The live preview is a black screen because the React project failed to compile. Here are the Vite build logs:\n\n${logs}\n\nFind the compile error in the logs, identify the exact file and the broken line, and fix it by returning ONLY the corrected file(s) with their FULL content. Do not rewrite files that have no errors.`);
  };

  // Paste raw HTML → rebuild it as a real React + Vite project
  const convertHtmlToReact = (rawHtml) => {
    changeBuildMode("react");
    generate(
      `${HTML_TO_REACT_DIRECTIVE}\n\n--- PASTED HTML START ---\n${rawHtml.slice(0, 60000)}\n--- PASTED HTML END ---`,
      { mode: "react" }
    );
  };

  const handleExampleClick = (ex) => {
    setPrompt(ex);
    generate(ex);
  };

  // Clone any website URL → backend scrapes it → we feed the screenshot + structure
  // to the builder as a clone request with the reference image attached.
  const cloneWebsite = (scraped) => {
    const refAttachments = scraped.screenshot
      ? [{ name: `${scraped.title || "cloned-site"}.png`, url: scraped.screenshot, image: true }]
      : [];
    setAttachments(refAttachments);
    const navNote = scraped.navLinks?.length
      ? `\nNav pages to build as routes: ${scraped.navLinks.map(l => `${l.label} (${l.href})`).join(", ")}`
      : "";
    const colorNote = scraped.colors?.length ? `\nDetected palette: ${scraped.colors.join(", ")}` : "";
    const fontNote = scraped.fonts?.length ? `\nDetected fonts: ${scraped.fonts.join(", ")}` : "";
    const clonePrompt = `Clone this website faithfully — same layout, sections, copy, spacing, and visual style. The screenshot is attached as a reference image; reproduce it closely. Source URL: ${scraped.url}. Title: ${scraped.title}.${colorNote}${fontNote}${navNote}\n\nMake it a fully working Kaspa-ready app with the TTT wallet widget in the header.`;
    setPrompt(clonePrompt.slice(0, 500));
    generate(clonePrompt, { attachments: refAttachments });
  };

  const publishToGitHub = async () => {
    if (!html || !publishForm.siteName.trim()) return;
    setPublishing(true);
    setPublishResult(null);
    try {
      const res = await base44.functions.invoke("publishToGitHub", {
        html,
        siteName: publishForm.siteName.trim(),
        repo: publishForm.repo.trim() || OUR_REPO,
      });
      setPublishResult({ success: true, ...res.data });
      // Auto-list the built app in the App Store grid under "Builder"
      try {
        const me = await base44.auth.me().catch(() => null);
        const siteUrl = res.data?.pagesUrl || res.data?.htmlUrl || "";
        await base44.entities.AppProposal.create({
          app_name: publishForm.siteName.trim(),
          app_link: siteUrl,
          icon_url: "",
          description: prompt?.slice(0, 200) || "Built with TTT Builder",
          category: "Builder",
          submitter_email: me?.email || "anonymous",
          submitter_name: me?.username || me?.email?.split("@")[0] || "TTT Builder",
          status: "pending",
        });
      } catch {}
    } catch (err) {
      setPublishResult({ success: false, error: err.message });
    } finally {
      setPublishing(false);
    }
  };

  const downloadHtml = () => {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ttt-site.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadProject = (p) => {
    if (!p) return;
    setFiles(p.files || []);
    setMessages(p.messages || []);
    setPhase(p.phase || "studio");
    setActivePath("index.html");
    setTopTab("preview");
    setDashSection("overview");
    if (p.buildMode) changeBuildMode(p.buildMode);
    if (p.model) changeModel(p.model);
    if (typeof p.walletKit === "boolean") changeWalletKit(p.walletKit);
    if (p.id) { setProjectId(p.id); try { localStorage.setItem("ttt_builder_project_id", p.id); } catch {} }
    setIframeKey(k => k + 1);
  };

  return (
    <div className={`min-h-screen overflow-x-hidden ${phase === "hero" ? "bg-[#f5f2ed] text-[#1a1614]" : "bg-[#0d1117] text-white"}`}>

      {/* Top nav */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-3 sm:px-5 backdrop-blur-xl border-b transition-colors ${phase === "hero" ? "bg-[#f5f2ed]/80 border-[#e0dcd7]" : "bg-[#0d1117]/80 border-white/5"}`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)", minHeight: "calc(3rem + env(safe-area-inset-top, 0px))" }}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate("/AppStoreV2")}
            className={`flex items-center gap-1.5 transition-colors px-2.5 py-2 min-h-[44px] -ml-1 rounded-lg active:bg-black/5 ${phase === "hero" ? "text-[#8a8580] hover:text-[#1a1614]" : "text-white/60 hover:text-white"}`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <span className={`font-black text-lg tracking-tight ${phase === "hero" ? "text-[#1a1614]" : "text-white"}`}>TTT</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${phase === "hero" ? "bg-[#1a1614] text-white" : "bg-[#70C7BA] text-black"}`}>BUILDER</span>
        </div>
        <div className={`hidden sm:flex items-center gap-4 text-xs ${phase === "hero" ? "text-[#8a8580]" : "text-white/50"}`}>
          <span>Built on Kaspa</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProjects(true)}
            className={`flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-full border text-xs font-bold transition-colors ${phase === "hero" ? "bg-white border-[#e0dcd7] text-[#5a554f] hover:bg-[#f5f2ed]" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"}`}
            title="Saved projects"
          >
            <FolderOpen className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Projects</span>
          </button>
          <button
            onClick={() => navigate('/BuilderSettings')}
            className={`flex items-center justify-center h-8 w-8 sm:w-auto sm:px-3 rounded-full border text-xs font-bold transition-colors ${phase === "hero" ? "bg-white border-[#e0dcd7] text-[#5a554f] hover:bg-[#f5f2ed]" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"}`}
            title="Builder settings"
          >
            <Settings className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            onClick={() => setShowCloneModal(true)}
            className={`flex items-center justify-center h-8 w-8 rounded-full border transition-colors flex-shrink-0 ${phase === "hero" ? "bg-[#1a1614] border-[#1a1614] text-white hover:bg-[#2a2622]" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"}`}
            title="Clone TTT Builder repo"
          >
            <Github className="w-4 h-4" />
          </button>
        </div>
        {html && (
          <button
            onClick={downloadHtml}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#70C7BA]/20 border border-[#70C7BA]/40 text-[#70C7BA] text-xs font-bold hover:bg-[#70C7BA]/30 transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> Export HTML
          </button>
        )}
      </nav>

      <AnimatePresence mode="wait">
        {phase === "hero" ? (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-5 bg-[#f5f2ed]"
            style={{ paddingTop: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}
          >
            <div className="relative max-w-3xl mx-auto text-center w-full">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e8e4df] text-[#5a554f] text-xs font-medium mb-6 sm:mb-10"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#8a8076]" />
                AI Site Builder for Kaspa
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-4xl sm:text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.05] mb-4 sm:mb-5 text-[#1a1614] font-heading"
                style={{ letterSpacing: "-0.02em" }}
              >
                Build your site.
                <br />
                <span className="text-[#a8a29a]">Ship it now.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[#6a655f] text-base sm:text-lg max-w-xl mx-auto mb-8 sm:mb-12 font-normal px-2"
              >
                Describe what you want. TTT Builder generates a complete, beautiful landing page — no code needed.
              </motion.p>

              {/* Main input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="relative max-w-2xl mx-auto"
              >
                <div className="flex flex-wrap items-center gap-2 bg-white border border-[#e0dcd7] focus-within:border-[#c8c4be] focus-within:shadow-[0_0_0_4px_rgba(26,22,20,0.04)] rounded-2xl p-2 transition-all shadow-[0_2px_8px_rgba(26,22,20,0.04)]">
                  <ModelSelector variant="light" value={model} onChange={changeModel} disabled={loading} onOpenSettings={() => navigate('/BuilderSettings')} />
                  <input
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && generate(prompt)}
                    placeholder={chatMode === "plan" ? "Tell the builder your idea…" : "Describe your app — e.g. 'Kaspa staking dashboard'"}
                    className="flex-1 min-w-0 w-full sm:w-auto bg-transparent outline-none text-[#1a1614] placeholder:text-[#aaa6a0] text-sm px-3 py-3 order-3 sm:order-none"
                  />
                  {/* Plan mode toggle — talk through the idea before building */}
                  <button
                    type="button"
                    onClick={() => setChatMode(chatMode === "plan" ? "build" : "plan")}
                    disabled={loading}
                    title="Plan mode — talk through your idea before building"
                    className={`flex items-center gap-1.5 h-10 px-3 rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex-shrink-0 ${
                      chatMode === "plan"
                        ? "bg-[#1a1614] text-white"
                        : "bg-[#f5f2ed] text-[#5a554f] hover:bg-[#ece9e4] border border-[#e0dcd7]"
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>Plan</span>
                  </button>
                  {/* Build orb — white background, icon only */}
                  <button
                    onClick={() => generate(prompt)}
                    disabled={!prompt.trim() || loading}
                    className="flex items-center justify-center h-10 w-10 rounded-xl bg-white border border-[#e0dcd7] text-[#1a1614] hover:bg-[#f5f2ed] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
                    title={chatMode === "plan" ? "Send plan" : "Build"}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>

              {/* Standalone only: setup wizard */}
              {STANDALONE && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-3 flex items-center justify-center gap-2"
                >
                  <button
                    onClick={() => window.dispatchEvent(new Event("ttt-open-onboarding"))}
                    className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-[#70C7BA]/15 border border-[#70C7BA]/40 text-[#70C7BA] text-xs font-bold hover:bg-[#70C7BA]/25 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" /> Setup wizard
                  </button>
                </motion.div>
              )}

              {/* Examples */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-5 flex flex-wrap gap-x-5 gap-y-2 justify-center"
              >
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => handleExampleClick(ex)}
                    className="text-xs text-[#8a8580] hover:text-[#1a1614] transition-colors"
                  >
                    {ex.slice(0, 38)}…
                  </button>
                ))}
              </motion.div>

              {/* Kaspa app templates */}
              <TemplateGallery onPick={(t) => generate(t.prompt)} disabled={loading} />
              </div>
              </motion.div>
        ) : (
          <motion.div
            key="studio"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-screen flex flex-col"
            style={{ paddingTop: "calc(3rem + env(safe-area-inset-top, 0px))" }}
          >
            {/* Mobile view toggle */}
            <div className="lg:hidden flex items-center gap-1 px-3 py-2 border-b border-white/5 bg-[#0d1117] flex-shrink-0">
              <div className="flex gap-1 bg-white/5 rounded-lg p-0.5 w-full">
                <button
                  onClick={() => setMobileView("chat")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-colors ${mobileView === "chat" ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Chat
                </button>
                <button
                  onClick={() => setMobileView("preview")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-colors ${mobileView === "preview" ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
              </div>
            </div>

            {/* Studio layout — chat column collapses to 0 so preview goes full-width */}
            <div className={`flex-1 grid min-h-0 w-full max-w-full overflow-hidden ${chatCollapsed ? "lg:grid-cols-[1fr]" : "lg:grid-cols-[380px_1fr]"}`}>

              {/* Left: Chat */}
              <div className={`flex flex-col border-r border-white/5 min-h-0 min-w-0 overflow-hidden bg-[#0d1117] ${chatCollapsed ? "lg:hidden" : ""} ${mobileView === "chat" ? "flex" : "hidden"} lg:flex`}>
                <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                  <BuilderOrb size={30} />
                  <span className="font-bold text-sm">TTT Builder</span>
                  <button
                    onClick={() => {
                      runIdRef.current++; // abort any in-flight generate() — it will bail out before touching state
                      setFiles([]); setMessages([]); setPhase("hero"); setActivePath("index.html"); setLoading(false); setAnalyzing(null); setLiveUrl(null);
                      try { localStorage.removeItem("ttt_builder_files"); localStorage.removeItem("ttt_builder_html"); localStorage.removeItem("ttt_builder_messages"); localStorage.removeItem("ttt_builder_phase"); localStorage.removeItem("ttt_builder_project_id"); } catch {}
                      setProjectId("");
                    }}
                    className="ml-auto text-[10px] text-white/30 hover:text-white/70 px-2 py-1 rounded hover:bg-white/5 transition-colors"
                  >
                    + New
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  {messages.length === 0 && (
                    <div className="text-center py-8 text-white/30 text-xs">
                      Generating your site…
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <ChatMessage key={i} message={m} />
                  ))}
                  {loading && (
                    <div className="flex items-center gap-2 text-white/40 text-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {analyzing ? `Analyzing ${analyzing.name}…` : chatMode === "plan" ? "Planning…" : chatMode === "discuss" ? "Thinking…" : "Building your site…"}
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-3 border-t border-white/5">
                  <ChatDropZone attachments={attachments} onChange={setAttachments} disabled={loading}>
                  <form
                    onSubmit={e => { e.preventDefault(); generate(prompt); }}
                    className="flex items-center gap-2 bg-white/[0.04] border border-white/10 focus-within:border-[#70C7BA]/40 rounded-xl pl-3 pr-1.5 py-1.5"
                  >
                    <input
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      placeholder="Describe, drop images, or paste…"
                      disabled={loading}
                      className="flex-1 bg-transparent outline-none text-white placeholder:text-white/30 text-sm py-1.5"
                    />
                    <button
                      type="submit"
                      disabled={loading || !prompt.trim()}
                      className="w-8 h-8 rounded-lg bg-[#70C7BA] text-black flex items-center justify-center disabled:opacity-30 hover:bg-[#70C7BA]/90 transition-colors"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  </form>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <ChatModeToggle value={chatMode} onChange={setChatMode} disabled={loading} />
                    <BuildModeToggle value={buildMode} onChange={changeBuildMode} disabled={loading} />
                    <ModelSelector value={model} onChange={changeModel} disabled={loading} />
                    <WalletKitToggle value={walletKit} onChange={changeWalletKit} disabled={loading} />
                    <AttachButton attachments={attachments} onChange={setAttachments} disabled={loading} />
                    <CloneUrlButton onClone={cloneWebsite} disabled={loading} />
                    <DesignOptionsButton prompt={prompt} onPick={(hint) => generate(`${hint}\n\n${prompt}`)} disabled={loading} />
                    <PasteHtmlButton onConvert={convertHtmlToReact} disabled={loading} />
                    <EnhanceButton
                      prompt={prompt}
                      onEnhanced={setPrompt}
                      buildMode={buildMode}
                      hasProject={files.length > 0}
                      disabled={loading}
                    />
                  </div>
                  </ChatDropZone>

                  {/* Quick actions */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["Make it darker", "Add pricing section", "More animations", "Add contact form", "Make it mobile-perfect"].map(action => (
                      <button
                        key={action}
                        onClick={() => generate(action)}
                        disabled={loading || !html}
                        className="text-[10px] px-2 py-1 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/30 disabled:opacity-30 transition-colors"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Preview / Dashboard */}
              <div className={`flex flex-col min-h-0 min-w-0 overflow-hidden bg-[#080c10] relative ${mobileView === "preview" ? "flex" : "hidden"} lg:flex`}>
                {/* Top-level toggle: Preview | Dashboard */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 flex-shrink-0 overflow-x-auto scrollbar-hide">
                  {/* Chat collapse/expand toggle — always visible in the preview toolbar */}
                  <button
                    onClick={() => setChatCollapsed(v => !v)}
                    className="hidden lg:flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-colors flex-shrink-0"
                    title={chatCollapsed ? "Show chat" : "Hide chat — expand preview"}
                  >
                    {chatCollapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
                    <span className="hidden xl:inline">{chatCollapsed ? "Chat" : "Hide chat"}</span>
                  </button>
                  <div className="flex gap-1 bg-white/5 rounded-lg p-0.5 flex-shrink-0">
                    <button
                      onClick={() => setTopTab("preview")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${topTab === "preview" ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
                    >
                      <Eye className="w-3 h-3" /> Preview
                    </button>
                    <button
                      onClick={() => setTopTab("dashboard")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${topTab === "dashboard" ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
                    >
                      <Code2 className="w-3 h-3" /> Dashboard
                    </button>
                  </div>
                  <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                    {html && topTab === "preview" && (
                      <>
                        <div className="hidden lg:flex gap-1 bg-white/5 rounded-lg p-0.5 flex-shrink-0">
                          <button
                            onClick={() => setDevice("desktop")}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors ${device === "desktop" ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
                            title="Desktop preview"
                          >
                            <Monitor className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setDevice("mobile")}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors ${device === "mobile" ? "bg-white text-black" : "text-white/50 hover:text-white"}`}
                            title="Mobile preview"
                          >
                            <Smartphone className="w-3 h-3" />
                          </button>
                          </div>
                          <button
                            onClick={() => setShowFullscreen(true)}
                            className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-colors flex-shrink-0 whitespace-nowrap"
                            title="Open fullscreen preview"
                          >
                            <Maximize2 className="w-3 h-3" /> Fullscreen
                          </button>
                        <button
                          onClick={() => generate("Regenerate with the same concept but different design")}
                          className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-colors flex-shrink-0 whitespace-nowrap"
                        >
                          <RefreshCw className="w-3 h-3" /> Remix
                        </button>
                        <button
                          onClick={downloadHtml}
                          className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-colors flex-shrink-0 whitespace-nowrap"
                        >
                          <Globe className="w-3 h-3" /> Export
                        </button>
                        <GitHubSyncIndicator autosync={autosync} disabled={loading} />
                        <button
                          onClick={() => setShowPushGithubModal(true)}
                          className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-colors flex-shrink-0 whitespace-nowrap"
                        >
                          <GitBranch className="w-3 h-3" /> GitHub
                        </button>
                        <button
                          onClick={() => setShowPushStoreModal(true)}
                          className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-[#70C7BA]/20 border border-[#70C7BA]/40 text-[#70C7BA] text-xs font-bold hover:bg-[#70C7BA]/30 transition-colors flex-shrink-0 whitespace-nowrap"
                        >
                          <Store className="w-3 h-3" /> Push to Store
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 relative">
                  {topTab === "preview" && (
                    <>
                      {!html && !loading && !isRealProject && (
                        <div className="absolute inset-0 flex items-center justify-center text-center p-8">
                          <div>
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#70C7BA]/10 border border-[#70C7BA]/20 flex items-center justify-center">
                              <Globe className="w-8 h-8 text-[#70C7BA]/60" />
                            </div>
                            <p className="text-white/30 text-sm">
                              {isRealProject
                                ? "This npm project needs a server — open Dashboard > Live to run it."
                                : "Your site preview will appear here"}
                            </p>
                          </div>
                        </div>
                      )}

                      {loading && (
                        <div className="absolute top-3 right-3 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0d1117]/90 backdrop-blur-xl border border-[#70C7BA]/30 shadow-lg">
                          <div className="w-3 h-3 rounded-full border-2 border-t-[#70C7BA] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                          <span className="text-[11px] font-bold text-[#70C7BA]">Editing…</span>
                        </div>
                      )}

                      {/* Real npm projects run in the cloud sandbox, streamed straight into Preview.
                          The panel stays MOUNTED during edits so the preview never disappears —
                          only the "Editing…" badge overlays on top while a build runs. */}
                      {isRealProject && (
                        <div className="absolute inset-0 flex flex-col">
                          {missingImports.length > 0 && (
                            <div className="flex-shrink-0 px-3 py-2 bg-red-500/10 border-b border-red-500/30 text-[11px] text-red-300 flex items-center justify-between gap-3">
                              <span className="truncate">
                                Missing file{missingImports.length > 1 ? "s" : ""}: {missingImports.map(m => m.path).join(", ")} — the app can't render without {missingImports.length > 1 ? "them" : "it"}.
                              </span>
                              <button
                                onClick={() => generate(`Create the missing files that are imported but do not exist: ${missingImports.map(m => `${m.path} (imported by ${m.importer})`).join(", ")}. Write their full real implementation.`, { mode: "react" })}
                                className="flex-shrink-0 px-2 py-1 rounded bg-red-500/20 border border-red-500/40 font-bold hover:bg-red-500/30"
                              >
                                Fix now
                              </button>
                            </div>
                          )}
                          <div className="flex-1 min-h-0 relative">
                            <E2BLivePanel files={files} autoStart onUrlChange={setLiveUrl} onFixBuild={fixBuild} onOpenOnboarding={() => window.dispatchEvent(new Event("ttt-open-onboarding"))} />
                          </div>
                        </div>
                      )}

                      {html && !isRealProject && (
                        effectiveDevice === "desktop" ? (
                          <iframe
                            key={iframeKey}
                            ref={iframeRef}
                            srcDoc={html}
                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                            className="w-full h-full border-0"
                            title="Site Preview"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
                            <div className="relative h-full max-h-full aspect-[9/19] max-w-full mx-auto">
                              <div className="absolute inset-0 rounded-[2rem] bg-white/5 border border-white/15 pointer-events-none" />
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-white/10 rounded-b-xl z-10 pointer-events-none" />
                              <iframe
                                key={iframeKey}
                                ref={iframeRef}
                                srcDoc={html}
                                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                className="relative w-full h-full rounded-[1.6rem] border border-white/15 overflow-hidden bg-black"
                                title="Site Preview (Mobile)"
                              />
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}

                  {topTab === "dashboard" && (
                    <div className="absolute inset-0 flex min-h-0">
                      {/* Sidebar — desktop */}
                      <div className="w-56 flex-shrink-0 hidden sm:block">
                        <DashboardSidebar active={dashSection} onChange={setDashSection} fileCount={files.length} />
                      </div>

                      {/* Mobile section pills */}
                      <div className="sm:hidden absolute top-0 left-0 right-0 z-10 bg-[#0f1419] border-b border-white/[0.06] px-2 py-2 flex items-center gap-1 overflow-x-auto scrollbar-hide">
                        {dashSection !== "overview" && (
                          <button
                            onClick={() => setDashSection("overview")}
                            className="flex items-center gap-1 flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back
                          </button>
                        )}
                        {["overview", "code", "live", "agents", "database", "memory", "security", "anchors", "settings"].map(s => (
                          <button
                            key={s}
                            onClick={() => setDashSection(s)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-colors ${
                              dashSection === s ? "bg-white/10 text-white" : "text-white/40"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>

                      {/* Panel content */}
                      <div className="flex-1 min-w-0 bg-[#0d1117] pt-12 sm:pt-0">
                        {dashSection === "overview" && (
                          <div className="h-full overflow-y-auto">
                            <OverviewPanel files={files} messages={messages} buildMode={buildMode} model={model} walletKit={walletKit} onJump={(s) => { setDashSection(s); }} />
                          </div>
                        )}
                        {dashSection === "code" && !loading && (
                          <div className="flex h-full min-h-0">
                            <FileExplorer
                              files={files}
                              activePath={activeFile?.path}
                              onSelect={setActivePath}
                              onCreate={createFile}
                              onDelete={deleteFile}
                            />
                            <FileEditor file={activeFile} onChange={updateFile} />
                          </div>
                        )}
                        {dashSection === "code" && loading && (
                          <div className="flex items-center justify-center h-full text-white/30 text-xs">Loading files…</div>
                        )}
                        {dashSection === "live" && <E2BLivePanel files={files} onUrlChange={setLiveUrl} onFixBuild={fixBuild} onOpenOnboarding={() => window.dispatchEvent(new Event("ttt-open-onboarding"))} />}
                        {dashSection === "agents" && (
                          <div className="h-full overflow-y-auto">
                            <AgentsPanel onGenerate={generate} loading={loading} files={files} />
                          </div>
                        )}
                        {dashSection === "database" && (
                          <div className="h-full overflow-y-auto">
                            <DatabasePanel files={files} />
                          </div>
                        )}
                        {dashSection === "memory" && (
                          <div className="h-full overflow-y-auto">
                            <MemoryPanel />
                          </div>
                        )}
                        {dashSection === "security" && (
                          <div className="h-full overflow-y-auto">
                            <SecurityPanel files={files} onFix={(p) => generate(p)} loading={loading} />
                          </div>
                        )}
                        {dashSection === "anchors" && (
                          <div className="h-full overflow-y-auto">
                            <AnchorsPanel files={files} projectId={projectId} />
                          </div>
                        )}
                        {dashSection === "settings" && (
                          <div className="h-full overflow-y-auto">
                            <SettingsPanel
                              buildMode={buildMode}
                              onChangeBuildMode={changeBuildMode}
                              model={model}
                              onChangeModel={changeModel}
                              walletKit={walletKit}
                              onChangeWalletKit={changeWalletKit}
                              loading={loading}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Publish to GitHub Modal */}
      <AnimatePresence>
        {showPublishModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={(e) => e.target === e.currentTarget && setShowPublishModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161b22] border border-white/10 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center gap-2 mb-5">
                <GitBranch className="w-5 h-5 text-[#70C7BA]" />
                <h2 className="font-bold text-white text-base">Publish to GitHub</h2>
              </div>

              {!publishResult ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block">Site name <span className="text-white/30">(used as folder name)</span></label>
                    <input
                      value={publishForm.siteName}
                      onChange={e => setPublishForm(f => ({ ...f, siteName: e.target.value }))}
                      placeholder="my-kaspa-site"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block">GitHub repo <span className="text-white/30">(owner/repo-name)</span></label>
                    <input
                      value={publishForm.repo || OUR_REPO}
                      onChange={e => setPublishForm(f => ({ ...f, repo: e.target.value }))}
                      placeholder={OUR_REPO}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#70C7BA]/50"
                    />
                  </div>
                  <p className="text-[11px] text-white/30">
                    The HTML will be pushed to <code className="text-[#70C7BA]/70">sites/[sitename]/index.html</code> in <code className="text-[#70C7BA]/70">{OUR_REPO}</code>. Enable GitHub Pages to get a live URL.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowPublishModal(false)}
                      className="flex-1 h-10 rounded-xl bg-white/5 text-white/60 hover:text-white text-sm font-bold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={publishToGitHub}
                      disabled={publishing || !publishForm.siteName.trim()}
                      className="flex-1 h-10 rounded-xl bg-[#70C7BA] text-black text-sm font-bold hover:bg-[#70C7BA]/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                    >
                      {publishing ? <><Loader2 className="w-4 h-4 animate-spin" /> Pushing…</> : <><GitBranch className="w-4 h-4" /> Push to GitHub</>}
                    </button>
                  </div>
                </div>
              ) : publishResult.success ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-10 h-10 text-[#70C7BA] mx-auto mb-3" />
                  <p className="font-bold text-white mb-1">Published successfully!</p>
                  <p className="text-xs text-white/40 mb-4">Your site has been pushed to GitHub.</p>
                  <div className="space-y-2 text-left">
                    <a href={publishResult.htmlUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-[#70C7BA] hover:underline">
                      <GitBranch className="w-3.5 h-3.5" /> View on GitHub
                    </a>
                    <a href={publishResult.pagesUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-[#70C7BA] hover:underline">
                      <Globe className="w-3.5 h-3.5" /> GitHub Pages URL
                    </a>
                  </div>
                  <button onClick={() => setShowPublishModal(false)} className="mt-5 w-full h-9 rounded-xl bg-white/5 text-white/60 hover:text-white text-sm font-bold transition-colors">
                    Close
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-red-400 font-bold mb-2">Push failed</p>
                  <p className="text-xs text-white/40 mb-4">{publishResult.error}</p>
                  <button onClick={() => setPublishResult(null)} className="w-full h-9 rounded-xl bg-white/5 text-white/60 hover:text-white text-sm font-bold transition-colors">
                    Try again
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProjectsPanel
        open={showProjects}
        onClose={() => setShowProjects(false)}
        current={{ id: projectId, name: prompt, files, messages, phase, buildMode, model, walletKit }}
        onLoad={loadProject}
      />

      <PushToStoreModal
        open={showPushStoreModal}
        onClose={() => setShowPushStoreModal(false)}
        html={html}
        liveUrl={liveUrl}
        defaultName={prompt || (messages.find(m => m.role === "user")?.content?.slice(0, 40))}
        defaultDesc={prompt}
      />

      <PushToGitHubModal
        open={showPushGithubModal}
        onClose={() => setShowPushGithubModal(false)}
        files={files}
        defaultName={prompt || (messages.find(m => m.role === "user")?.content?.slice(0, 40))}
      />

      <CloneBuilderRepoModal open={showCloneModal} onClose={() => setShowCloneModal(false)} />

      {STANDALONE && <OnboardingModal />}

      {showFullscreen && (html || liveUrl) && (
        <FullscreenPreview
          html={html}
          url={isRealProject ? liveUrl : null}
          onClose={() => setShowFullscreen(false)}
        />
      )}
    </div>
  );
}