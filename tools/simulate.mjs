// Headless balance check: plays full watches with the autopilot (no rendering) and reports how far each got.
// Usage: node tools/simulate.mjs [runs] [omen policy: alt | first | second | <omen id>] [gift policy: first | <gift id,...>]
// At each dawn the autopilot takes a gift and charts an omen by the given policies, so balance can be
// read per omen and per gift as well as overall.

import { createSession, updateSession, advanceNight, STEP } from '../game/js/game/session.js';
import { createAutopilot, autopilotControls } from '../game/js/game/autopilot.js';
import { offerUpgrades, applyUpgrade } from '../game/js/game/upgrades.js';
import { offerOmens } from '../game/js/game/omens.js';

const runs = Number(process.argv[2] ?? 6);
const omenPolicy = process.argv[3] ?? 'alt';
const giftPolicy = (process.argv[4] ?? 'first').split(',');

function chooseOmen(omens, r, night) {
  if (omenPolicy === 'first') return omens[0];
  if (omenPolicy === 'second') return omens[1] ?? omens[0];
  if (omenPolicy === 'alt') return omens[(r + night) % omens.length];
  return omens.find((o) => o.id === omenPolicy) ?? omens[0];
}

function chooseGift(gifts) {
  for (const id of giftPolicy) {
    const g = gifts.find((u) => u.id === id);
    if (g) return g;
  }
  return gifts[0];
}

let wins = 0;
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
      log.push(`N${session.night}[${session.omen.id}]:${Math.ceil(session.keeper.integrity)}hp/${session.stats.shipsSaved}s`);
      applyUpgrade(session, chooseGift(offerUpgrades(session)));
      advanceNight(session, chooseOmen(offerOmens(session.plan), r, session.night).id);
    }
    if (session.phase === 'won' || session.phase === 'fallen') break;
  }
  if (session.phase === 'won') wins++;
  const st = session.stats;
  const boss = session.boss ? ` bossHp=${Math.round(session.boss.hp)}` : '';
  const gifts = Object.entries(session.upgrades).map(([id, n]) => (n > 1 ? `${id}×${n}` : id)).join(',');
  console.log(
    `run ${r}: ${session.phase} night=${session.night} score=${st.score} kills=${st.kills} saved=${st.shipsSaved} lost=${st.shipsLost} salvaged=${st.salvaged} t=${(steps * STEP).toFixed(0)}s` +
      ` new=${session.plan.featured.join('>')} ${log.join(' ')} N${session.night}[${session.omen.id}]${boss} gifts=${gifts}`,
  );
}
console.log(`won ${wins}/${runs} (omens: ${omenPolicy}, gifts: ${giftPolicy.join(',')})`);
