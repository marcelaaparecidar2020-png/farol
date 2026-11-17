// The darkness layer and the beam's visible light. Darkness is painted over the whole scene, then the
// beam, the lamp's halo, flares and ship lanterns are cut out of it, so only what is lit can be seen.

import { W, H, LAMP } from '../world/layout.js';
import { beamHalfAngle, HALO_RADIUS, lampDark } from '../world/light.js';
import { drawRain } from '../world/weather.js';
import { angleDiff, dist } from '../core/mathx.js';
import { rgba, PALETTE } from '../core/palette.js';
import { drawGlow } from './glow.js';

let layer = null;
let layerCtx = null;

function cone(g, k, spread, range) {
  g.beginPath();
  g.moveTo(LAMP.x, LAMP.y);
  g.arc(LAMP.x, LAMP.y, range, k.aim - spread, k.aim + spread);
  g.closePath();
}

export function drawDarkness(ctx, session) {
  if (!layer) {
    layer = document.createElement('canvas');
    layer.width = W;
    layer.height = H;
    layerCtx = layer.getContext('2d');
  }
  const g = layerCtx;
  const k = session.keeper;
  const darkness = session.darkness * (1 - session.dawn) * (1 - session.weather.flash * 0.8);
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, W, H);
  if (darkness <= 0.01) return;
  g.fillStyle = `rgba(3, 6, 24, ${darkness})`;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'destination-out';

  if (!lampDark(k)) {
    const spread = beamHalfAngle(k);
    const grad = g.createRadialGradient(LAMP.x, LAMP.y, 10, LAMP.x, LAMP.y, k.range);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.75, 'rgba(0,0,0,0.92)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    cone(g, k, spread, k.range);
    g.fill();
    g.globalAlpha = 0.45;
    cone(g, k, spread * 1.35 + 0.02, k.range);
    g.fill();
    g.globalAlpha = 1;

    const halo = g.createRadialGradient(LAMP.x, LAMP.y + 120, 0, LAMP.x, LAMP.y + 120, HALO_RADIUS * 1.6);
    halo.addColorStop(0, 'rgba(0,0,0,0.95)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = halo;
    g.fillRect(LAMP.x - 260, LAMP.y - 120, 520, 420);
  }
  for (const f of session.flares) {
    const r = f.radius * 1.3;
    const fg = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
    fg.addColorStop(0, `rgba(0,0,0,${f.glow})`);
    fg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fg;
    g.fillRect(f.x - r, f.y - r, r * 2, r * 2);
  }
  for (const s of session.ships) {
    if (s.state !== 'sailing') continue;
    const sg = g.createRadialGradient(s.x, s.y - 10, 0, s.x, s.y - 10, 58);
    sg.addColorStop(0, 'rgba(0,0,0,0.55)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sg;
    g.fillRect(s.x - 58, s.y - 68, 116, 116);
  }
  g.globalCompositeOperation = 'source-over';
  ctx.drawImage(layer, 0, 0);
}

/** Volumetric beam, rain caught in the light, and flare glow: additive, above the darkness. */
export function drawBeamGlow(ctx, session) {
  const k = session.keeper;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (!lampDark(k)) {
    const spread = beamHalfAngle(k);
    const strength = 0.19 + k.focusLevel * 0.12;
    const grad = ctx.createRadialGradient(LAMP.x, LAMP.y, 0, LAMP.x, LAMP.y, k.range);
    grad.addColorStop(0, rgba(PALETTE.beamCore, strength * 2.4));
    grad.addColorStop(0.25, rgba(PALETTE.beamCore, strength * 1.1));
    grad.addColorStop(0.6, rgba(PALETTE.beamEdge, strength * 0.5));
    grad.addColorStop(1, rgba(PALETTE.beamEdge, 0));
    ctx.fillStyle = grad;
    cone(ctx, k, spread, k.range);
    ctx.fill();
    // hot core line
    const core = ctx.createRadialGradient(LAMP.x, LAMP.y, 0, LAMP.x, LAMP.y, k.range * 0.9);
    core.addColorStop(0, rgba('255, 226, 160', 0.22 + k.focusLevel * 0.35));
    core.addColorStop(1, rgba('255, 200, 120', 0));
    ctx.fillStyle = core;
    cone(ctx, k, spread * 0.28, k.range * 0.9);
    ctx.fill();
  }
  ctx.restore();

  drawRain(ctx, session, (x, y) => {
    if (lampDark(k)) return false;
    if (dist(x, y, LAMP.x, LAMP.y) > k.range) return false;
    return Math.abs(angleDiff(k.aim, Math.atan2(y - LAMP.y, x - LAMP.x))) < beamHalfAngle(k);
  });

  ctx.globalCompositeOperation = 'lighter';
  for (const f of session.flares) {
    drawGlow(ctx, '#ff9a4a', f.x, f.y, f.radius * 1.1, f.glow * 0.55);
    if (!f.burst) {
      const rise = f.age / 0.28;
      drawGlow(ctx, '#fff0c0', f.x, f.y + (1 - rise) * 60, 18, 1);
    } else drawGlow(ctx, '#fff0c0', f.x, f.y, 26 * f.glow, f.glow);
  }
  ctx.globalCompositeOperation = 'source-over';
}
