import React from "react";
import { Wallet } from "lucide-react";

export default function WalletKitToggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      disabled={disabled}
      title="Ship every generated app with the Kaspa wallet protocol (connect, balance, send, receive)"
      className={`flex items-center gap-1.5 h-7 px-3 rounded-lg border text-[11px] font-bold transition-colors disabled:opacity-40 ${
        value
          ? "bg-[#70C7BA]/20 border-[#70C7BA]/40 text-[#70C7BA]"
          : "bg-white/5 border-white/10 text-white/50 hover:text-white"
      }`}
    >
      <Wallet className="w-3 h-3" />
      Kaspa Wallet
    </button>
  );
}