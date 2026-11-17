// Reproducible scenes for the screenshots (?shot=<name>&seed=<n>). Each one runs the real game for a while
// with the autopilot at the helm, using the same fixed steps as play, and then holds the frame.

import { createSession, updateSession, advanceNight, STEP } from './session.js';
import { createAutopilot, autopilotControls } from './autopilot.js';
import { offerUpgrades, applyUpgrade } from './upgrades.js';
import { offerOmens } from './omens.js';

function run(session, pilot, seconds, until = null) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    updateSession(session, autopilotControls(session, pilot, STEP), STEP);
    if (until && until(session)) break;
  }
  session.sfx.length = 0;
}

export const SCENES = {
  title(seed, at = 24) {
    const session = createSession({ seed, night: 5, attract: true, upgrades: ['lens', 'ember', 'cistern'] });
    const pilot = createAutopilot();
    run(session, pilot, at);
    return { screen: 'title', session, pilot };
  },
  play(seed, at = 31) {
    const session = createSession({ seed, night: 3, upgrades: ['lens', 'ember'] });
    const pilot = createAutopilot();
    run(session, pilot, at);
    return { screen: 'play', session, pilot, pointer: { x: pilot.aimX, y: pilot.aimY } };
  },
  storm(seed, at = 39, omen = 'calm') {
    const session = createSession({ seed, night: 4, upgrades: ['lens', 'ember', 'flares'], omen });
    const pilot = createAutopilot();
    run(session, pilot, at);
    return { screen: 'play', session, pilot, pointer: { x: pilot.aimX, y: pilot.aimY } };
  },
  boss(seed, at = 40, omen = 'calm') {
    const session = createSession({ seed, night: 5, upgrades: ['lens', 'ember', 'cistern', 'flares'], omen });
    const pilot = createAutopilot();
    run(session, pilot, at);
    return { screen: 'play', session, pilot, pointer: { x: pilot.aimX, y: pilot.aimY } };
  },
  upgrade(seed) {
    const session = createSession({ seed, night: 2, upgrades: ['cistern'] });
    const pilot = createAutopilot();
    run(session, pilot, 120, (s) => s.phase === 'cleared' || s.phase === 'fallen');
    return { screen: 'upgrade', session, pilot, offers: offerUpgrades(session), hoverCard: 1 };
  },
  /** The dawn after a gift: the keeper reads the sky for the next night. */
  omen(seed) {
    const session = createSession({ seed, night: 2, upgrades: ['cistern'] });
    const pilot = createAutopilot();
    run(session, pilot, 120, (s) => s.phase === 'cleared' || s.phase === 'fallen');
    applyUpgrade(session, offerUpgrades(session)[0]);
    return { screen: 'omen', session, pilot, omens: offerOmens(session.plan), hoverCard: 0 };
  },
  end(seed, at, omen = 'redtide') {
    const session = createSession({ seed, night: 4, upgrades: ['lens', 'lens', 'ember', 'mortar', 'harbour'], omen });
    const pilot = createAutopilot();
    run(session, pilot, 160, (s) => s.phase === 'cleared' || s.phase === 'fallen');
    if (session.phase === 'cleared') {
      advanceNight(session, offerOmens(session.plan)[0].id);
      run(session, pilot, 400, (s) => s.phase === 'won' || s.phase === 'fallen');
      run(session, pilot, 1.5);
    }
    return { screen: 'results', session, pilot };
  },
};
