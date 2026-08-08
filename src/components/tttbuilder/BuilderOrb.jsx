import React from "react";

const ORB_VIDEO = "https://media.base44.com/videos/public/6901295fa9bcfaa0f5ba2c2a/6e804c6dc_Floating_Orb.mp4";

export default function BuilderOrb({ size = 34 }) {
  return (
    <video
      src={ORB_VIDEO}
      autoPlay
      loop
      muted
      playsInline
      aria-label="TTT Builder orb"
      className="rounded-full object-cover pointer-events-none"
      style={{
        width: size,
        height: size,
        mixBlendMode: "screen",
        filter: "drop-shadow(0 6px 14px rgba(112,199,186,0.35))",
      }}
    />
  );
}