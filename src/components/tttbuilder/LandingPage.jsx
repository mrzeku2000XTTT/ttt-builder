import React, { useRef } from "react";
import { ArrowRight, ArrowUpRight, Workflow, Landmark, Wallet, Gem, Shield, KeyRound } from "lucide-react";

const FEATURES = [
  { icon: Workflow, title: "Agentic Workflows", body: "Automate trades, payments, and onchain actions." },
  { icon: Landmark, title: "Kaspa DeFi", body: "Build AMMs, DEXs, lending, and yield strategies." },
  { icon: Wallet, title: "Onchain Payments", body: "Send, receive, tip, and power real economies." },
  { icon: Gem, title: "NFT & Creator Apps", body: "Mint, trade, and build digital economies." },
];

export const FEATURED = [
  {
    tag: "DeFi",
    name: "Agent Liquidity Bot",
    blurb: "AI agent that monitors markets, manages liquidity and rebalances across Kaspa DEX.",
    img: "/landing/feat-liquidity.jpg",
    prompt: "Build an agentic Kaspa DeFi app: a liquidity bot desk with planner, researcher, and executor agents. Live KAS price from CoinCap, a rebalance workflow panel (idle/running/done), pool cards, and Run workflow. Dark mint UI. Kaspa wallet kit in the header.",
  },
  {
    tag: "Payments",
    name: "Kaspa Pay Agent",
    blurb: "Send, receive and automate payments using natural language.",
    img: "/landing/feat-pay.jpg",
    prompt: "Build an agentic Kaspa payments app: natural-language send ('Pay 100 KAS to @user'), QR receive, history, and an executor agent that builds the transfer. Mobile-first dark mint UI. Kaspa wallet kit in the header.",
  },
  {
    tag: "NFT",
    name: "Ryxen NFT Studio",
    blurb: "Agent-powered NFT collection creator with onchain minting and marketplace tools.",
    img: "/landing/feat-nft.jpg",
    prompt: "Build an agentic Kaspa NFT studio: collection hero, mint form, gallery grid, and a creator agent that drafts traits and metadata. Dark gallery, mint-green accents. Kaspa wallet kit in the header.",
  },
  {
    tag: "Social",
    name: "KSocial Agent",
    blurb: "Post, engage, and grow your community with AI agents.",
    img: "/landing/feat-social.jpg",
    prompt: "Build an agentic Kaspa social app: feed, compose, tips in KAS, and a community agent that drafts posts from live Kaspa news. Dark mint UI. Kaspa wallet kit in the header.",
  },
];

export default function LandingPage({
  onStart,
  onExplore,
  onPickFeatured,
  onOpenSettings,
  canContinue,
  onContinue,
}) {
  const templatesRef = useRef(null);

  const explore = () => {
    templatesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    onExplore?.();
  };

  return (
    <div className="bg-[#f4f6f3] text-[#10231c]">
      {/* HERO */}
      <section className="relative max-w-6xl mx-auto px-5 pt-10 sm:pt-16 pb-8">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-[#5a6b64] mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3DDC84]" />
              VIBE CODING / KASPA L1
            </div>
            <h1
              className="text-[2.35rem] sm:text-5xl lg:text-[3.35rem] font-semibold leading-[1.05] tracking-tight"
              style={{ letterSpacing: "-0.03em" }}
            >
              Build the next
              <br />
              generation of
              <br />
              <span className="text-[#2ee37a]">Kaspa economic</span>
              <br />
              agentic applications.
            </h1>
            <p className="mt-5 text-[#5a6b64] text-[15px] sm:text-base max-w-md leading-relaxed">
              Use natural language. Ship real apps. Every onchain command is a Kaspa Layer 1 transaction — network fee only, typically under a cent. No gas token. No platform cut.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                onClick={onStart}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[#7CFF9A] text-[#062014] text-sm font-bold hover:bg-[#6af08b] transition-colors"
              >
                Start Vibe Coding <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={explore}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white border border-black/10 text-sm font-semibold hover:border-black/25 transition-colors"
              >
                Explore Templates
              </button>
              {canContinue && (
                <button
                  onClick={onContinue}
                  className="inline-flex items-center gap-2 h-11 px-4 text-sm font-semibold text-[#2aa05a] hover:underline"
                >
                  Continue last build
                </button>
              )}
            </div>
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-xl">
              {[
                ["L1 Speed", "1 Sec", "Block Time"],
                ["Every command", "Kaspa fee", "Usually < $0.01"],
                ["Scalable", "∞", "BlockDAG"],
                ["Full Control", "Your Keys", "BYO & Secure"],
              ].map(([k, v, s]) => (
                <div key={k}>
                  <div className="text-[10px] font-bold tracking-wide text-[#7a8a83]">{k}</div>
                  <div className="text-xl font-semibold tracking-tight mt-0.5">{v}</div>
                  <div className="text-[11px] text-[#7a8a83]">{s}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-start gap-3">
            <div className="relative flex-1 min-w-0 rounded-[28px] overflow-hidden bg-[#f4f6f3]">
              <img src="/landing/hero.jpg" alt="" className="w-full h-auto object-cover select-none" />
              <button
                type="button"
                onClick={onStart}
                aria-label="Start vibe coding"
                className="absolute top-4 right-4 w-11 h-11 rounded-full bg-[#7CFF9A] text-[#062014] flex items-center justify-center shadow-[0_8px_24px_rgba(16,35,28,0.18)] hover:bg-[#6af08b]"
              >
                <ArrowUpRight className="w-5 h-5" strokeWidth={2.5} />
              </button>
              <div className="absolute left-4 bottom-[4.5rem] rounded-xl bg-[#10231c]/90 text-[#7CFF9A] font-mono text-[11px] px-3 py-2 leading-5 pointer-events-none">
                {">"} build()<br />{">"} deploy()<br />{">"} earn()_
              </div>
              <div className="absolute left-4 bottom-4 rounded-lg bg-white px-3 py-2 text-[10px] font-bold tracking-[0.14em] shadow-sm pointer-events-none">
                KASPA L1
                <div className="text-[9px] font-semibold tracking-wide text-[#5a6b64] mt-0.5">FAST. FAIR. SECURE.</div>
              </div>
            </div>
            <div className="hidden lg:flex flex-col gap-3 pt-16 shrink-0 w-[5.5rem] text-[10px] font-bold tracking-[0.16em] text-[#7a8a83] text-right leading-none">
              {["AGENTS", "PAYMENTS", "DEFI", "NFTs", "SOCIAL", "ONCHAIN"].map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AGENTS */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="grid lg:grid-cols-[0.7fr_1.3fr] gap-10 items-start">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight" style={{ letterSpacing: "-0.03em" }}>
              Build With AI Agents
            </h2>
            <p className="mt-3 text-[#5a6b64] text-sm max-w-sm leading-relaxed">
              Let AI agents handle the heavy lifting. Each onchain command they run is a Kaspa transaction — you pay the network fee, nothing else.
            </p>
            <button
              onClick={onStart}
              className="mt-6 inline-flex items-center gap-2 h-10 px-4 rounded-full border border-black/10 bg-white text-sm font-semibold hover:border-black/25"
            >
              See How It Works <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-2xl bg-white border border-black/[0.06] p-5">
                  <div className="w-9 h-9 rounded-xl bg-[#E9FFF2] text-[#1aa85a] flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="font-semibold text-sm">{f.title}</div>
                  <div className="text-[13px] text-[#5a6b64] mt-1 leading-snug">{f.body}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section ref={templatesRef} id="templates" className="max-w-6xl mx-auto px-5 pb-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight" style={{ letterSpacing: "-0.03em" }}>
              Featured Builds
            </h2>
            <p className="text-sm text-[#5a6b64] mt-1">Real apps. Real utility. Built on Kaspa.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURED.map((c) => (
            <button
              key={c.name}
              onClick={() => onPickFeatured(c)}
              className="group text-left rounded-2xl bg-white border border-black/[0.06] overflow-hidden hover:border-black/20 hover:shadow-[0_12px_40px_rgba(16,35,28,0.08)] transition-all"
            >
              <div className="relative h-36 overflow-hidden bg-[#0d1b16]">
                <img src={c.img} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#7CFF9A] text-[#062014] flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="p-4">
                <div className="text-[10px] font-bold tracking-wide text-[#2aa05a]">{c.tag}</div>
                <div className="font-semibold mt-1">{c.name}</div>
                <div className="text-[12px] text-[#5a6b64] mt-1 leading-snug">{c.blurb}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* BANNER */}
      <section className="max-w-6xl mx-auto px-5 pb-16">
        <div className="relative overflow-hidden rounded-[28px] min-h-[280px] text-white">
          <img src="/landing/banner.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
          <div className="relative p-8 sm:p-12 max-w-lg">
            <div className="text-[10px] font-bold tracking-[0.18em] text-[#7CFF9A]">THE KASPA ECONOMY</div>
            <h3 className="mt-3 text-3xl sm:text-4xl font-semibold leading-tight" style={{ letterSpacing: "-0.03em" }}>
              More than a wallet.
              <br />
              <span className="text-[#7CFF9A]">A full economic layer.</span>
            </h3>
            <p className="mt-3 text-sm text-white/75 leading-relaxed">
              From DeFi to AI agents, NFTs to real-world apps — every command settles as a Kaspa transaction. Network fee only. Built by builders, for builders.
            </p>
            <button
              onClick={onStart}
              className="mt-6 inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#7CFF9A] text-[#062014] text-sm font-bold"
            >
              Explore the Ecosystem <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-6xl mx-auto px-5 pb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="font-semibold">Join the builders</div>
          <div className="text-sm text-[#5a6b64]">Vibe code. Build. Earn. On Kaspa.</div>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-[11px] text-[#5a6b64]">
          <span className="inline-flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Open Source</span>
          <span className="inline-flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> BYO Keys</span>
          <span>Kaspa L1 · Network fee per command</span>
        </div>
        <button
          onClick={onOpenSettings}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white border border-black/10 text-sm font-semibold"
        >
          Get Started <ArrowRight className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );
}
