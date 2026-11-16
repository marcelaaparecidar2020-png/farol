// Where the light falls. The simulation asks these questions; the light map draws the same shapes.

import { angleDiff, dist, lerp, clamp } from '../core/mathx.js';
import { LAMP } from './layout.js';

export const HALO_RADIUS = 120;

export function beamHalfAngle(keeper) {
  return lerp(keeper.wideHalf, keeper.focusHalf, keeper.focusLevel);
}

/** 0 outside the beam; otherwise how strongly the beam strikes a circle at (x, y). */
export function beamHit(session, x, y, radius = 0) {
  const k = session.keeper;
  if (k.outage > 0) return 0;
  const dx = x - LAMP.x;
  const dy = y - LAMP.y;
  const d = Math.hypot(dx, dy);
  if (d > k.range + radius || d < 1) return 0;
  const spread = beamHalfAngle(k) + Math.atan(radius / d);
  const off = Math.abs(angleDiff(k.aim, Math.atan2(dy, dx)));
  if (off > spread) return 0;
  const edge = clamp((spread - off) / 0.05, 0.35, 1);
  return edge * (1 - 0.4 * (d / k.range));
}

/** Overall brightness at a point (0 dark .. 1 bright), used for visibility and ship guidance. */
export function lightLevel(session, x, y, radius = 0) {
  let level = beamHit(session, x, y, radius) > 0 ? 1 : 0;
  const halo = 1 - dist(x, y, LAMP.x, LAMP.y + 120) / HALO_RADIUS;
  if (halo > level && session.keeper.outage <= 0) level = halo;
  for (const f of session.flares) {
    const l = (1 - dist(x, y, f.x, f.y) / f.radius) * f.glow;
    if (l > level) level = clamp(l * 1.6, 0, 1);
  }
  if (session.weather.flash > level) level = session.weather.flash;
  if (session.dawn > level) level = session.dawn;
  return level;
}
