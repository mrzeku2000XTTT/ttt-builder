import React from "react";

export default function BuilderOrb({ size = 34 }) {
  return (
    <div
      aria-label="TTT Builder"
      className="rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 32% 28%, #f6e7b0 0%, #d4a017 48%, #6b4e08 100%)",
        boxShadow: "0 0 16px rgba(212,160,23,0.45), inset 0 -5px 10px rgba(0,0,0,0.35)",
      }}
    />
  );
}
