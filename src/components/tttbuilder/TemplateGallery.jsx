import React from "react";
import { Wallet, Boxes, LineChart, Pickaxe, Coins, ArrowLeftRight, Image, CreditCard, Lock, Globe } from "lucide-react";
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
};

export default function TemplateGallery({ onPick, disabled }) {
  return (
    <div className="mt-20 max-w-5xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-medium text-[#8a8580] text-center">
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
              className="group text-left p-4 rounded-2xl bg-white border border-[#e0dcd7] hover:border-[#c8c4be] hover:shadow-[0_4px_16px_rgba(26,22,20,0.08)] disabled:opacity-40 transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-xl bg-[#f5f2ed] group-hover:bg-[#1a1614] group-hover:text-white flex items-center justify-center mb-3 transition-colors duration-200 text-[#1a1614]">
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </div>
              <div className="text-[13px] font-semibold text-[#1a1614] leading-tight">{t.name}</div>
              <div className="text-[11px] text-[#8a8580] mt-1 leading-snug">{t.blurb}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}