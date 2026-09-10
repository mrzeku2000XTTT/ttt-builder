import React from "react";
import { Wallet, Boxes, LineChart, Pickaxe, Coins, ArrowLeftRight, Image, CreditCard, Lock, Globe, Bot } from "lucide-react";
import { KASPA_TEMPLATES } from "@/components/tttbuilder/kaspaTemplates";

const ICON_MAP = {
  wallet: Wallet,
  explorer: Boxes,
  dashboard: LineChart,
  mining: Pickaxe,
  krc20: Coins,
  dex: ArrowLeftRight,
  nft: Image,
  payments: CreditCard,
  staking: Lock,
  community: Globe,
  agents: Bot,
};

export default function TemplateGallery({ onPick, disabled }) {
  return (
    <div className="mt-20 max-w-5xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-medium text-[#6a6258] text-center">
          Or start from a template
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {KASPA_TEMPLATES.map((t) => {
          const Icon = ICON_MAP[t.id] || Wallet;
          return (
            <button
              key={t.id}
              onClick={() => onPick(t)}
              disabled={disabled}
              className="group text-left p-4 rounded-2xl bg-[#141210] border border-[#d4a017]/20 hover:border-[#d4a017]/50 hover:shadow-[0_4px_16px_rgba(212,160,23,0.12)] disabled:opacity-40 transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-xl bg-[#d4a017]/10 group-hover:bg-[#d4a017] group-hover:text-[#1a1408] flex items-center justify-center mb-3 transition-colors duration-200 text-[#d4a017]">
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </div>
              <div className="text-[13px] font-semibold text-[#f4ead8] leading-tight">{t.name}</div>
              <div className="text-[11px] text-[#9a9080] mt-1 leading-snug">{t.blurb}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}