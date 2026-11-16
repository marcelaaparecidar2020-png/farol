// Headless balance check: plays full watches with the autopilot (no rendering) and reports how far each got.
// Usage: node tools/simulate.mjs [runs]

import { createSession, updateSession, advanceNight, STEP } from '../game/js/game/session.js';
import { createAutopilot, autopilotControls } from '../game/js/game/autopilot.js';
import { offerUpgrades, applyUpgrade } from '../game/js/game/upgrades.js';

const runs = Number(process.argv[2] ?? 6);
for (let r = 1; r <= runs; r++) {
  const session = createSession({ seed: r * 101 });
  const pilot = createAutopilot();
  const log = [];
  let steps = 0;
  while (steps < 60 * 60 * 15) {
    updateSession(session, autopilotControls(session, pilot, STEP), STEP);
    session.sfx.length = 0;
    steps++;
    if (session.phase === 'cleared') {
      log.push(`N${session.night}:${Math.ceil(session.keeper.integrity)}hp/${session.stats.shipsSaved}s`);
      const offer = offerUpgrades(session);
      applyUpgrade(session, offer[0]);
      advanceNight(session);
    }
    if (session.phase === 'won' || session.phase === 'fallen') break;
  }
  const st = session.stats;
  const boss = session.boss ? ` bossHp=${Math.round(session.boss.hp)}` : '';
  console.log(`run ${r}: ${session.phase} night=${session.night} score=${st.score} kills=${st.kills} saved=${st.shipsSaved} lost=${st.shipsLost} bestCombo=${st.bestCombo} t=${(steps * STEP).toFixed(0)}s ${log.join(' ')}${boss}`);
}
