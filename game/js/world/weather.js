// The storm: rain and lightning. A strike lights the whole bay for an instant and shows every shape in it.

import { HORIZON, W, H } from './layout.js';
import { hash01 } from '../core/mathx.js';
import { addText } from './particles.js';
import { gutterLamp } from './keeper.js';

export function createWeather() {
  return { flash: 0, nextStrike: 6, bolt: null, boltAge: 0, storm: 0.4 };
}

export function updateWeather(session, dt) {
  const wx = session.weather;
  wx.flash = Math.max(0, wx.flash - dt * 2.2);
  if (wx.bolt) {
    wx.boltAge += dt;
    if (wx.boltAge > 0.35) wx.bolt = null;
  }
  if (session.dawn > 0.2) return;
  wx.nextStrike -= dt * (0.5 + wx.storm) * (session.omen?.strikeRate ?? 1);
  if (wx.nextStrike <= 0) {
    wx.nextStrike = session.rng.range(7, 13);
    strike(session);
  }
}

export function strike(session) {
  const wx = session.weather;
  const rng = session.rng;
  const x = rng.range(120, W - 120);
  const points = [{ x, y: 0 }];
  let px = x;
  const end = HORIZON + rng.range(-10, 20);
  for (let y = 24; y < end; y += rng.range(16, 30)) {
    px += rng.range(-26, 26);
    points.push({ x: px, y });
  }
  points.push({ x: px, y: end });
  wx.bolt = points;
  wx.boltAge = 0;
  wx.flash = 1;
  session.sfx.push('lightning');
  if (session.omen?.strikeRate && session.phase === 'night') {
    // Thunderhead: every bolt scorches and stuns the bay, and leaves the keeper's lamp blind for a moment
    for (const w of session.wraiths) {
      session.damageWraith(w, 5, 'lightning');
      w.stun = Math.max(w.stun, 0.35);
    }
    gutterLamp(session, 0.8, null);
  }
  if (session.keeper.lightningRod > 0) {
    let struck = 0;
    for (const w of session.wraiths) {
      session.damageWraith(w, 26 * session.keeper.lightningRod, 'lightning');
      struck++;
    }
    if (struck > 0) addText(session, session.keeper.aimX ?? 640, HORIZON + 40, 'LIGHTNING ROD!', '#cfe8ff', 22);
  }
}

export function drawLightningBolt(ctx, session) {
  const wx = session.weather;
  if (!wx.bolt) return;
  const a = 1 - wx.boltAge / 0.35;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [width, alpha] of [[9, 0.15], [4, 0.45], [1.6, 1]]) {
    ctx.strokeStyle = `rgba(210, 225, 255, ${alpha * a})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    wx.bolt.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.restore();
}

/** Fog Bank: slow banks of pale mist drifting over the bay, above the dark so the night reads as fog. */
export function drawFog(ctx, session) {
  const amount = session.omen?.id === 'fog' ? 1 - session.dawn * 0.7 : 0;
  if (amount <= 0) return;
  const t = session.time;
  ctx.save();
  for (let i = 0; i < 9; i++) {
    const x = ((hash01(i * 4.7) * (W + 600) + t * (14 + 8 * hash01(i * 2.9))) % (W + 600)) - 300;
    const y = HORIZON + 30 + hash01(i * 8.3) * 330;
    const r = 220 + hash01(i * 1.7) * 160;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(150, 170, 195, ${0.3 * amount})`);
    g.addColorStop(1, 'rgba(150, 170, 195, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

/** Rain is a pure function of time, so it costs no state and renders the same in every replay. */
export function drawRain(ctx, session, litByBeam) {
  const t = session.time;
  const count = Math.round((140 + 220 * session.weather.storm) * (1 - session.dawn * 0.85));
  ctx.save();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = litByBeam ? 'rgba(255, 220, 150, 0.55)' : 'rgba(170, 200, 235, 0.22)';
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const speed = 900 + hash01(i * 3.1) * 500;
    const x0 = hash01(i * 7.7) * (W + 200) - 100;
    const y = ((hash01(i * 1.3) * (H + 80) + t * speed) % (H + 80)) - 40;
    const x = x0 - (y + 40) * 0.18;
    if (litByBeam && !litByBeam(x, y)) continue;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4, y + 18);
  }
  ctx.stroke();
  ctx.restore();
}
