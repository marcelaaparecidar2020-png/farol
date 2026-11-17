// Rule tests for the watch: newcomers, omens, gifts and determinism. Plain Node, no dependencies.
// Usage: node --test tools/test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, updateSession, advanceNight, startNight, STEP } from '../game/js/game/session.js';
import { createAutopilot, autopilotControls } from '../game/js/game/autopilot.js';
import { offerUpgrades, applyUpgrade, UPGRADES } from '../game/js/game/upgrades.js';
import { offerOmens, planWatch, NEWCOMERS, OMENS } from '../game/js/game/omens.js';
import { spawnWraith } from '../game/js/world/wraiths.js';
import { beamHit, lampDark } from '../game/js/world/light.js';
import { fireFlare } from '../game/js/world/keeper.js';
import { strike } from '../game/js/world/weather.js';
import { spawnCrate } from '../game/js/world/flotsam.js';
import { LAMP } from '../game/js/world/layout.js';

const IDLE = { aimX: 640, aimY: 300, focus: false, flare: false, foghorn: false };
const aimAt = (x, y, extra = {}) => ({ ...IDLE, aimX: x, aimY: y, ...extra });
const gift = (id) => UPGRADES.find((u) => u.id === id);

/** A quiet night to test one creature at a time: no spawns, no ships, no lightning. */
function quietSession(opts = {}) {
  const s = createSession({ seed: 7, ...opts });
  s.spawner = null;
  s.ships = [];
  s.weather.nextStrike = 1e9;
  return s;
}

function run(s, controls, seconds) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) updateSession(s, typeof controls === 'function' ? controls(s) : controls, STEP);
}

/** Plays a full watch with the autopilot, charting omens by index, and returns a fingerprint of the end. */
function playWatch(seed, omenIndex = 0) {
  const s = createSession({ seed });
  const pilot = createAutopilot();
  for (let i = 0; i < 60 * 60 * 15; i++) {
    updateSession(s, autopilotControls(s, pilot, STEP), STEP);
    s.sfx.length = 0;
    if (s.phase === 'cleared') {
      applyUpgrade(s, offerUpgrades(s)[0]);
      const omens = offerOmens(s.plan);
      advanceNight(s, omens[omenIndex % omens.length].id);
    }
    if (s.phase === 'won' || s.phase === 'fallen') break;
  }
  const k = s.keeper;
  return JSON.stringify({ phase: s.phase, night: s.night, stats: s.stats, omens: s.omenLog, gifts: s.upgrades, k: [k.integrity, k.oil, k.flares], time: s.time });
}

test('a watch replays exactly from its seed and choices', () => {
  for (const seed of [3, 101, 4242]) {
    assert.equal(playWatch(seed, 0), playWatch(seed, 0));
    assert.equal(playWatch(seed, 1), playWatch(seed, 1));
  }
});

test('different seeds bring the newcomers in different orders', () => {
  const orders = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const plan = planWatch(seed);
    assert.deepEqual([...plan.featured].sort(), [...NEWCOMERS].sort());
    orders.add(plan.featured.join('>'));
  }
  assert.equal(orders.size, 6, 'all six orders appear across forty watches');
});

test('omens: two distinct offers, never one already weathered', () => {
  const plan = planWatch(9);
  for (let night = 2; night <= 5; night++) {
    const offer = offerOmens(plan);
    assert.equal(offer.length, 2);
    assert.notEqual(offer[0].id, offer[1].id);
    for (const o of offer) assert.ok(!plan.chosen.includes(o.id));
    plan.chosen.push(offer[0].id);
  }
});

test('oaths are exclusive and at most one is offered at a dawn', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const s = createSession({ seed });
    for (let i = 0; i < 6; i++) {
      const offer = offerUpgrades(s);
      assert.ok(offer.filter((u) => u.oath).length <= 1);
      const oath = offer.find((u) => u.oath);
      applyUpgrade(s, oath ?? offer[0]);
    }
    const sworn = UPGRADES.filter((u) => u.oath && s.upgrades[u.id]);
    assert.ok(sworn.length <= 1, `seed ${seed} swore ${sworn.length} oaths`);
  }
});

test('gifts with a cost really pay it', () => {
  const s = createSession({ seed: 1 });
  const k = s.keeper;
  const turn = k.turn;
  applyUpgrade(s, gift('mortar'));
  assert.equal(k.integrityMax, 140);
  assert.ok(k.turn < turn);
  const drain = k.oilDrain;
  applyUpgrade(s, gift('burning'));
  assert.ok(k.focusMul > 1 && k.oilDrain > drain);
  applyUpgrade(s, gift('starshell'));
  assert.equal(k.flaresMax, 1);
  assert.equal(k.flarePower, 2);
  // Star Shells is never offered to a rack that cannot lose a flare
  for (let i = 0; i < 40; i++) assert.ok(!offerUpgrades(s).some((u) => u.id === 'starshell'));
});

test('wickmoth: drawn up the wide beam, it smothers the lamp; focus burns it', () => {
  const s = quietSession();
  const m = spawnWraith(s, 'wickmoth', 640, 240);
  m.age = 1;
  run(s, aimAt(640, 240), 3);
  assert.ok(lampDark(s.keeper), 'the lamp is smothered');
  assert.equal(beamHit(s, 640, 300), 0, 'no light while smothered');
  run(s, aimAt(640, 240), 2.6);
  assert.ok(!lampDark(s.keeper), 'the wick catches again');

  const t = quietSession();
  const m2 = spawnWraith(t, 'wickmoth', 640, 240);
  m2.age = 1;
  run(t, aimAt(640, 240, { focus: true }), 1);
  assert.ok(m2.dead && !lampDark(t.keeper), 'focus burns it before it reaches the glass');
});

test('broodmaw: the beam bursts it into three broodlings, a flare burns the brood whole', () => {
  const s = quietSession();
  const maw = spawnWraith(s, 'broodmaw', 640, 300);
  maw.age = 1;
  s.damageWraith(maw, 999, 'beam');
  assert.equal(s.wraiths.filter((w) => w.type === 'broodling').length, 3);

  const t = quietSession();
  const maw2 = spawnWraith(t, 'broodmaw', 640, 300);
  maw2.age = 1;
  maw2.hp = 30;
  const score = t.stats.score;
  fireFlare(t, 640, 300);
  run(t, IDLE, 0.4);
  assert.ok(maw2.dead);
  assert.equal(t.wraiths.filter((w) => w.type === 'broodling').length, 0);
  assert.ok(t.stats.score >= score + 150);
});

test('veilfin: slips out of the beam until winded, and shrugs off the focused beam', () => {
  const s = quietSession();
  const fin = spawnWraith(s, 'veilfin', 700, 260);
  fin.age = 1;
  // the beam held still, dead on the fin
  s.keeper.aim = Math.atan2(260 - LAMP.y, 700 - LAMP.x);
  run(s, aimAt(700, 260), 0.3);
  const off = Math.abs(Math.atan2(fin.y - LAMP.y, fin.x - LAMP.x) - s.keeper.aim);
  assert.ok(off > 0.1, `it slid ${off.toFixed(2)} rad off the beam axis`);
  assert.ok(fin.stamina < 1.1, 'dodging costs breath');

  // the same heat lands less when focused
  const a = quietSession();
  const b = quietSession();
  const fa = spawnWraith(a, 'veilfin', 640, 300);
  const fb = spawnWraith(b, 'veilfin', 640, 300);
  fa.stamina = fb.stamina = 0;
  fa.age = fb.age = 1;
  for (const [sess, focus] of [[a, false], [b, true]]) {
    sess.keeper.aim = -Math.PI / 2;
    sess.keeper.focusLevel = focus ? 1 : 0;
  }
  updateSession(a, aimAt(640, 300), STEP);
  updateSession(b, aimAt(640, 300, { focus: true }), STEP);
  const wideDps = (fa.maxHp - fa.hp) / STEP;
  const focusDps = (fb.maxHp - fb.hp) / STEP;
  assert.ok(focusDps < wideDps * 1.6, `focus ${focusDps.toFixed(1)} vs wide ${wideDps.toFixed(1)}: focus is no answer`);
});

test('Fog Bank shortens the beam for that night only', () => {
  const s = createSession({ seed: 2 });
  startNight(s, 2, 'fog');
  assert.equal(s.keeper.range, OMENS.fog.range);
  assert.equal(beamHit(s, LAMP.x, LAMP.y - 700), 0);
  startNight(s, 3, 'calm');
  assert.equal(s.keeper.range, s.keeper.baseRange);
});

test('The Convoy sails three gold-pennant ships at once', () => {
  const s = createSession({ seed: 4 });
  startNight(s, 2, 'convoy');
  s.weather.nextStrike = 1e9;
  run(s, IDLE, 58 * OMENS.convoy.convoyAt + 0.5);
  assert.equal(s.ships.filter((sh) => sh.convoy).length, 3);
});

test('Red Tide doubles the score of a kill', () => {
  const a = quietSession();
  const b = quietSession();
  b.omen = OMENS.redtide;
  for (const s of [a, b]) {
    const w = spawnWraith(s, 'murkling', 640, 300);
    s.damageWraith(w, 999, 'beam');
  }
  assert.equal(b.stats.score, a.stats.score * 2);
});

test('Thunderhead bolts scorch and stun every creature and blind the lamp', () => {
  const s = quietSession();
  s.omen = OMENS.thunder;
  const w = spawnWraith(s, 'brinehulk', 300, 400);
  const hp = w.hp;
  strike(s);
  assert.ok(w.hp < hp && w.stun > 0);
  assert.ok(lampDark(s.keeper));
});

test('Flotsam: holding the beam on a crate hauls it in', () => {
  const s = quietSession();
  spawnCrate(s);
  const c = s.crates[0];
  c.x = 640;
  c.speed = 0;
  run(s, aimAt(640, c.y, { focus: true }), 1.2);
  assert.equal(s.stats.salvaged, 1);
  assert.equal(s.crates.length, 0);
});

test('Still Water: the next dawn offers only two gifts', () => {
  const s = createSession({ seed: 5 });
  startNight(s, 2, 'still');
  advanceNight(s, 'calm');
  assert.equal(offerUpgrades(s).length, 2);
  advanceNight(s, 'calm');
  assert.equal(offerUpgrades(s).length, 3);
});

test('every omen and every newcomer survives a full watch without a fault', () => {
  for (let seed = 1; seed <= 12; seed++) for (const idx of [0, 1]) assert.match(playWatch(seed * 37, idx), /"phase":"(won|fallen)"/);
});
