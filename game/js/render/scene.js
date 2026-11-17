// Composes one frame of the bay in layers: sky, sea, the leviathan, ships, creatures, the island and tower,
// then the darkness with the light cut out of it, then everything that glows above the dark.

import { W, H } from '../world/layout.js';
import { drawSky } from './sky.js';
import { drawSea, drawShoreFoam } from './sea.js';
import { drawIsland, drawTower, drawLampBlaze } from './tower.js';
import { drawDarkness, drawBeamGlow } from './lightmap.js';
import { drawLightningBolt, drawRain, drawFog } from '../world/weather.js';
import { drawCrates, drawCrateSignals } from '../world/flotsam.js';
import { drawShips, drawShipSignals } from '../world/ships.js';
import { drawWraithBodies, drawWraithEyes } from '../world/wraiths.js';
import { drawUndertowBody, drawUndertowRim, drawUndertowEye } from '../world/undertow.js';
import { drawParticles, drawRings, drawFloatingTexts } from '../world/particles.js';
import { hash01 } from '../core/mathx.js';

export function drawWorld(ctx, session) {
  ctx.save();
  if (session.shake > 0) {
    const s = session.shake;
    ctx.translate((hash01(session.time * 91) - 0.5) * s, (hash01(session.time * 57 + 3) - 0.5) * s);
  }
  drawSky(ctx, session);
  drawLightningBolt(ctx, session);
  drawSea(ctx, session);
  drawUndertowBody(ctx, session);
  drawShips(ctx, session);
  drawCrates(ctx, session);
  drawWraithBodies(ctx, session);
  drawIsland(ctx);
  drawShoreFoam(ctx, session);
  drawTower(ctx, session);
  drawParticles(ctx, session, false);

  drawDarkness(ctx, session);
  drawFog(ctx, session);
  drawRain(ctx, session, null);
  drawBeamGlow(ctx, session);
  drawLampBlaze(ctx, session);
  drawUndertowRim(ctx, session);
  drawUndertowEye(ctx, session);
  drawWraithEyes(ctx, session);
  if (!session.attract) {
    drawShipSignals(ctx, session);
    drawCrateSignals(ctx, session);
  }
  ctx.globalCompositeOperation = 'lighter';
  drawParticles(ctx, session, true);
  ctx.globalCompositeOperation = 'source-over';
  // the title screen's living background keeps only the scene: no score text or markers under the logo
  if (!session.attract) {
    drawRings(ctx, session);
    drawFloatingTexts(ctx, session);
  }
  ctx.restore();

  // a film of grain-free vignette to hold the eye on the bay
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,8,0.5)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}
