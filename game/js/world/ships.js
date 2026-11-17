// Ships crossing the bay. Near a reef, a ship in darkness loses its way; the beam guides it home.
// A saved ship pays oil and score; a wreck feeds the night with the drowned.

import { TAU, clamp, approach } from '../core/mathx.js';
import { PALETTE } from '../core/palette.js';
import { SHIP_LANES, REEFS, REEF_DANGER_X, REEF_DANGER_Y, W } from './layout.js';
import { lightLevel } from './light.js';
import { emitBurst, addText, addRing } from './particles.js';
import { spawnWraith } from './wraiths.js';
import { hurtTower } from './keeper.js';
import { drawGlow } from '../render/glow.js';

const SHIP_NAMES = ['Maré Alta', 'Gull of Ys', 'Saltwren', 'Amber Vow', 'Old Anselm', 'Northern Kite', 'Quiet Mary', 'Brightwater', 'Tern', 'Second Chance'];

export function spawnShip(session, { lane: laneIndex = session.shipCount % SHIP_LANES.length, convoy = false } = {}) {
  const lane = SHIP_LANES[laneIndex];
  const name = SHIP_NAMES[(session.shipCount * 7 + session.night) % SHIP_NAMES.length];
  session.shipCount++;
  session.ships.push({
    name,
    convoy,
    x: lane.dir > 0 ? -70 : W + 70,
    y: lane.y,
    laneY: lane.y,
    dir: lane.dir,
    speed: (44 + session.night * 2) * (convoy ? 0.9 : 1),
    peril: 0,
    lit: 0,
    sirens: 0,
    danger: false,
    state: 'sailing',
    stateT: 0,
    bob: session.rng.range(0, TAU),
  });
}

function reefNear(ship) {
  for (const r of REEFS) {
    if (Math.abs(r.y - ship.laneY) < REEF_DANGER_Y && Math.abs(r.x - ship.x) < REEF_DANGER_X) return r;
  }
  return null;
}

export function updateShips(session, dt) {
  const keeper = session.keeper;
  for (const s of session.ships) {
    s.stateT += dt;
    if (s.state !== 'sailing') continue;
    s.x += s.dir * s.speed * dt;
    const light = lightLevel(session, s.x, s.y, 18);
    s.lit = approach(s.lit, light > 0.5 ? 1 : 0, 10, dt);
    const reef = reefNear(s);
    s.danger = !!reef;
    // a convoy keeps close order and a steadier helm: it drifts into danger more slowly
    const steady = s.convoy ? 0.6 : 1;
    if (reef && s.lit < 0.5) s.peril += 0.34 * steady * dt;
    if (s.sirens > 0) s.peril += 0.42 * s.sirens * steady * dt;
    if (s.lit > 0.5) s.peril -= 0.4 * dt;
    s.peril = clamp(s.peril, 0, 1);
    // A guided ship veers away from the reef it is passing.
    const dodge = reef && s.lit > 0.5 ? Math.sign(s.laneY - reef.y || 1) * 16 : 0;
    s.y = approach(s.y, s.laneY + dodge, 2, dt);
    s.sirens = 0;

    if (s.peril >= 1) {
      s.state = 'wrecked';
      s.stateT = 0;
      session.stats.shipsLost++;
      session.sfx.push('wreck');
      session.shake = Math.max(session.shake, 7);
      addText(session, s.x, s.y - 40, `${s.name.toUpperCase()} LOST`, PALETTE.danger, 20);
      emitBurst(session, s.x, s.y, { count: 40, speed: 140, life: 1.3, size: 3, color: '#cfe6ff', gravity: 260, rise: 120 });
      const drowned = 2 + Math.min(2, Math.floor(session.night / 2));
      for (let i = 0; i < drowned; i++) spawnWraith(session, 'murkling', s.x + (i - 1) * 22, s.y + 10);
      // the Harbourmaster's Oath: every wreck is the keeper's shame, and the tower feels it
      if (keeper.oath === 'harbour' && session.phase === 'night') {
        hurtTower(session, 15);
        addText(session, s.x, s.y - 64, 'THE OATH IS BROKEN  −15', PALETTE.danger, 16);
      }
    } else if ((s.dir > 0 && s.x > W + 60) || (s.dir < 0 && s.x < -60)) {
      guideHome(session, s);
    }
  }
  session.ships = session.ships.filter((s) => s.state === 'sailing' || s.stateT < 4);
}

/** A ship reaches open water (or dawn finds it still afloat): it pays oil and score. */
export function guideHome(session, s) {
  const keeper = session.keeper;
  s.state = 'saved';
  s.stateT = 0;
  session.stats.shipsSaved++;
  const harbour = keeper.oath === 'harbour';
  const oil = Math.round(25 * keeper.shipOil * (s.convoy ? 1.6 : 1));
  keeper.oil = Math.min(keeper.oilMax, keeper.oil + oil);
  if (harbour) keeper.flares = Math.min(keeper.flaresMax, keeper.flares + 1);
  const points = 300 + (s.convoy ? 600 : 0) + (harbour ? 400 : 0);
  session.addScore(points);
  session.sfx.push('shipSaved');
  const tx = clamp(s.x, 120, W - 120);
  addText(session, tx, s.y - 30, `${s.convoy ? 'CONVOY HOME' : 'SAFE PASSAGE'} +${points}`, PALETTE.good, 20);
  if (oil > 0) addText(session, tx, s.y - 6, `+${oil} OIL${harbour ? '  +1 FLARE' : ''}`, PALETTE.oil, 16);
  addRing(session, tx, s.y, 70, '#8dffb0', 0.8);
}

export function drawShips(ctx, session) {
  const t = session.time;
  for (const s of session.ships) {
    if (s.state === 'saved') continue;
    const sink = s.state === 'wrecked' ? clamp(s.stateT / 3, 0, 1) : 0;
    const bob = Math.sin(t * 1.8 + s.bob) * 2.5;
    ctx.save();
    ctx.translate(s.x, s.y + bob + sink * 30);
    ctx.rotate(Math.sin(t * 1.3 + s.bob) * 0.04 + sink * 0.6 * s.dir);
    ctx.scale(s.dir, 1);
    ctx.globalAlpha = 1 - sink;
    // wake
    ctx.strokeStyle = 'rgba(200, 230, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-36, 8);
    ctx.quadraticCurveTo(-60, 10, -84, 6 + Math.sin(t * 3 + s.bob) * 2);
    ctx.stroke();
    // hull
    ctx.fillStyle = '#2b1e1a';
    ctx.beginPath();
    ctx.moveTo(-34, -2);
    ctx.lineTo(36, -2);
    ctx.lineTo(26, 12);
    ctx.lineTo(-28, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7a3b2c';
    ctx.fillRect(-32, -2, 66, 3);
    // mast and sails
    ctx.strokeStyle = '#3a2a22';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(0, -58);
    ctx.stroke();
    ctx.fillStyle = s.lit > 0.5 ? '#f4ead2' : '#9aa0ad';
    ctx.beginPath();
    ctx.moveTo(3, -54);
    ctx.quadraticCurveTo(26, -32, 4, -8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-3, -50);
    ctx.quadraticCurveTo(-22, -30, -3, -10);
    ctx.lineTo(-30, -8);
    ctx.closePath();
    ctx.fill();
    // a convoy flies the harbour's gold pennant
    ctx.fillStyle = s.convoy ? '#ffcf5a' : '#b0383a';
    ctx.fillRect(1, -64, s.convoy ? 20 : 14, 7);
    ctx.restore();
  }
}

/** Lanterns and peril meters sit above the darkness, so the player can read every ship's danger. */
export function drawShipSignals(ctx, session) {
  if (session.phase !== 'night' && session.phase !== 'dawn') return;
  const t = session.time;
  for (const s of session.ships) {
    if (s.state !== 'sailing') continue;
    const bob = Math.sin(t * 1.8 + s.bob) * 2.5;
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, '#ffd27a', s.x + s.dir * 30, s.y - 6 + bob, 14, 0.9);
    if (s.lit > 0.5) drawGlow(ctx, '#ffe6a8', s.x, s.y - 26, 46, 0.18);
    ctx.globalCompositeOperation = 'source-over';
    if (s.peril > 0.02 || s.danger) {
      const cx = s.x;
      const cy = s.y - 86 + bob;
      const danger = s.peril;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = danger > 0.66 ? PALETTE.danger : danger > 0.33 ? '#ffb347' : '#e8f4ff';
      ctx.beginPath();
      ctx.arc(cx, cy, 13, -Math.PI / 2, -Math.PI / 2 + TAU * danger);
      ctx.stroke();
      const flash = danger > 0.5 && Math.sin(t * 14) > 0;
      ctx.fillStyle = s.lit > 0.5 ? PALETTE.good : flash ? PALETTE.danger : '#ffe9c4';
      ctx.font = '800 16px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.lit > 0.5 ? '✓' : '!', cx, cy + 1);
    }
  }
}
