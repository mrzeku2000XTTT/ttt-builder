import React from "react";

export default function BuilderOrb({ size = 34 }) {
  return (
    <div
      aria-label="TTT Builder"
      className="rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 32% 28%, #e9ffe8 0%, #7CFF9A 48%, #1aa85a 100%)",
        boxShadow: "0 0 14px rgba(124,255,154,0.45)",
      }}
    />
  );
}
