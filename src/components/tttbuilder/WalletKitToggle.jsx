import React from "react";
import { Wallet } from "lucide-react";

export default function WalletKitToggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      disabled={disabled}
      title="Ship every generated app with the Kaspa wallet protocol (connect, balance, send, receive)"
      className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[11px] font-bold transition-colors disabled:opacity-40 w-full justify-start ${
        value
          ? "bg-[#E8FFF4] border-[#7CFF9A] text-[#062014]"
          : "bg-white border-black/10 text-[#5a6b64] hover:border-black/25"
      }`}
    >
      <Wallet className="w-3 h-3" />
      Kaspa Wallet
    </button>
  );
}