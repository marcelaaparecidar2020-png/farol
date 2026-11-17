// A keeper that plays itself: it runs the title screen's living background and stages the screenshot scenes.
// It reads only what a player could see and answers with the same controls a player sends.

import { dist } from '../core/mathx.js';
import { TOWER_TARGET, W } from '../world/layout.js';

const THREAT = { murkling: 1, gloomray: 1.4, brinehulk: 1.8, sirenwisp: 1.6, wickmoth: 2.2, broodmaw: 1.5, broodling: 0.9, veilfin: 1.4 };
// the beam each kind asks for: focus for the armoured and the moths, wide for the veilfins
const WANTS_FOCUS = new Set(['boss', 'brinehulk', 'gloomray', 'wickmoth']);

export function createAutopilot() {
  return { target: null, aimX: 640, aimY: 300, flareCd: 2, hornCd: 0, focusHold: 0 };
}

export function autopilotControls(session, pilot, dt) {
  pilot.flareCd = Math.max(0, pilot.flareCd - dt);
  pilot.hornCd = Math.max(0, pilot.hornCd - dt);
  const k = session.keeper;
  let best = null;
  let bestScore = -Infinity;

  const b = session.boss;
  if (b && b.rise >= 1 && b.dying <= 0 && b.eyeOpen > 0.4) {
    best = { x: b.x, y: b.eyeY, kind: 'boss' };
    bestScore = 99;
  }
  for (const s of session.ships) {
    if (s.state !== 'sailing' || s.x < 0 || s.x > W) continue;
    const urgency = s.peril * 4 + (s.danger ? 1.2 : 0);
    if (urgency > 1.6 && urgency > bestScore) {
      best = { x: s.x, y: s.y - 10, kind: 'ship' };
      bestScore = urgency;
    }
  }
  for (const w of session.wraiths) {
    const near = 1 - Math.min(1, dist(w.x, w.y, TOWER_TARGET.x, TOWER_TARGET.y) / 900);
    const score = near * 3 * THREAT[w.type] + (w.ship ? 1.5 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = { x: w.x, y: w.y, kind: w.type };
    }
  }
  // with nothing pressing, haul the cargo in
  if (bestScore < 1.3) {
    for (const c of session.crates) {
      if (c.x < 20 || c.x > W - 20) continue;
      best = { x: c.x, y: c.y, kind: 'crate' };
      bestScore = 1.3;
      break;
    }
  }

  let focus = false;
  if (best) {
    pilot.aimX += (best.x - pilot.aimX) * Math.min(1, dt * 9);
    pilot.aimY += (best.y - pilot.aimY) * Math.min(1, dt * 9);
    focus = WANTS_FOCUS.has(best.kind) && k.oil > 12;
  } else {
    // idle sweep across the bay, like a real keeper scanning the dark
    const sweep = Math.sin(session.time * 0.6);
    pilot.aimX += (640 + sweep * 520 - pilot.aimX) * Math.min(1, dt * 2);
    pilot.aimY += (300 - pilot.aimY) * Math.min(1, dt * 2);
  }

  let flare = false;
  if (pilot.flareCd <= 0 && k.flares > 0) {
    // a broodmaw is worth a flare before it gets close: fire takes the whole brood
    const maw = session.wraiths.find((w) => w.type === 'broodmaw' && w.age > 1 && dist(w.x, w.y, TOWER_TARGET.x, TOWER_TARGET.y) < 560);
    if (maw) {
      pilot.aimX = maw.x;
      pilot.aimY = maw.y;
      pilot.flareCd = 4;
      return { aimX: pilot.aimX, aimY: pilot.aimY, focus: false, flare: true, foghorn: false };
    }
    for (const w of session.wraiths) {
      let crowd = 0;
      for (const o of session.wraiths) if (dist(w.x, w.y, o.x, o.y) < 140) crowd++;
      if (crowd >= 4) {
        pilot.aimX = w.x;
        pilot.aimY = w.y;
        flare = true;
        pilot.flareCd = 4;
        break;
      }
    }
  }
  let foghorn = false;
  if (pilot.hornCd <= 0 && k.foghornCd <= 0) {
    let close = 0;
    for (const w of session.wraiths) if (dist(w.x, w.y, TOWER_TARGET.x, TOWER_TARGET.y) < 190) close++;
    if (close >= 3) {
      foghorn = true;
      pilot.hornCd = 2;
    }
  }
  return { aimX: pilot.aimX, aimY: pilot.aimY, focus, flare, foghorn };
}
