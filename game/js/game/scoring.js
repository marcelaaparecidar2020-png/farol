// Score, kill combos and the local best score.

import { addText } from '../world/particles.js';
import { PALETTE } from '../core/palette.js';

const COMBO_WINDOW = 2.4;
const BEST_KEY = 'farol.best';

export function createStats() {
  return { score: 0, kills: 0, shipsSaved: 0, shipsLost: 0, salvaged: 0, combo: 0, comboTimer: 0, comboWindow: COMBO_WINDOW, bestCombo: 0, nightsSurvived: 0 };
}

export function comboMultiplier(stats) {
  return Math.min(4, 1 + Math.floor(stats.combo / 5) * 0.5);
}

export function scoreKill(session, wraith) {
  const st = session.stats;
  st.kills++;
  st.combo++;
  st.comboTimer = st.comboWindow;
  st.bestCombo = Math.max(st.bestCombo, st.combo);
  const mult = comboMultiplier(st);
  const points = Math.round(wraith.def.score * mult * (session.omen?.scoreMul ?? 1));
  st.score += points;
  const color = mult >= 3 ? '#ff8ad8' : mult >= 2 ? '#ffd36b' : PALETTE.hudText;
  addText(session, wraith.x, wraith.y - wraith.r - 10, mult > 1 ? `+${points} ×${mult}` : `+${points}`, color, mult > 1 ? 19 : 16);
}

export function updateCombo(stats, dt) {
  if (stats.comboTimer > 0) {
    stats.comboTimer -= dt;
    if (stats.comboTimer <= 0) stats.combo = 0;
  }
}

export function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  try {
    if (score > loadBest()) {
      localStorage.setItem(BEST_KEY, String(score));
      return true;
    }
  } catch {
    /* storage unavailable: the best score just isn't remembered */
  }
  return false;
}
