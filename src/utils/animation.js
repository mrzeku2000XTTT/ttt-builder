// Easing functions for smooth keyframe interpolation
export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function easeOutElastic(t) {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t - 1) * (2 * Math.PI) / 0.3) + 1;
}

const EASINGS = {
  "ease-in-out": easeInOutCubic,
  "ease-out-back": easeOutBack,
  "ease-out-elastic": easeOutElastic,
};

// Interpolate a single value between a and b with easing
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Get interpolated layer properties at a given frame
export function interpolateLayer(layer, frame, fps) {
  const timeMs = (frame / fps) * 1000;
  const kfs = (layer.keyframes || []).slice().sort((a, b) => a.time - b.time);

  if (kfs.length === 0) {
    return {
      x: layer.x, y: layer.y,
      scale: layer.scale, opacity: layer.opacity, rotation: layer.rotation,
    };
  }

  // Single keyframe — hold
  if (kfs.length === 1) return { x: kfs[0].x, y: kfs[0].y, scale: kfs[0].scale, opacity: kfs[0].opacity, rotation: kfs[0].rotation };
  // Before first
  if (timeMs <= kfs[0].time) return { x: kfs[0].x, y: kfs[0].y, scale: kfs[0].scale, opacity: kfs[0].opacity, rotation: kfs[0].rotation };
  // After last
  if (timeMs >= kfs[kfs.length - 1].time) {
    const l = kfs[kfs.length - 1];
    return { x: l.x, y: l.y, scale: l.scale, opacity: l.opacity, rotation: l.rotation };
  }

  // Between two keyframes
  let a = kfs[0], b = kfs[kfs.length - 1];
  for (let i = 0; i < kfs.length - 1; i++) {
    if (timeMs >= kfs[i].time && timeMs <= kfs[i + 1].time) {
      a = kfs[i];
      b = kfs[i + 1];
      break;
    }
  }

  const range = b.time - a.time;
  const raw = range === 0 ? 1 : (timeMs - a.time) / range;
  const easeFn = EASINGS[a.easing || "ease-in-out"] || easeInOutCubic;
  const t = easeFn(raw);

  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    scale: lerp(a.scale, b.scale, t),
    opacity: lerp(a.opacity, b.opacity, t),
    rotation: lerp(a.rotation, b.rotation, t),
  };
}