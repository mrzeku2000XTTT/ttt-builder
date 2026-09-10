import React from "react";
import { Wallet } from "lucide-react";

export default function WalletKitToggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      disabled={disabled}
      title="Ship every generated app with the Kaspa wallet protocol (connect, balance, send, receive)"
      className={`flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-full text-[11px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-40 w-full ${
        value
          ? "bg-[#7CFF9A] text-[#062014]"
          : "bg-[#f4f6f3] text-[#5a6b64] hover:text-[#10231c]"
      }`}
    >
      <Wallet className="w-3.5 h-3.5" />
      Wallet
    </button>
  );
}