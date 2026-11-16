// Embers, sparks, spray, shock rings and floating score text. Cosmetic only, with their own seeded stream.

import { TAU } from '../core/mathx.js';
import { getGlowSprite } from '../render/glow.js';

const MAX_PARTICLES = 900;

export function emitBurst(session, x, y, { count = 10, speed = 120, life = 0.7, size = 2.5, color = '#fff', gravity = 0, drag = 1.2, glow = false, spread = TAU, angle = 0, rise = 0 }) {
  const rng = session.fxRng;
  for (let i = 0; i < count && session.particles.length < MAX_PARTICLES; i++) {
    const a = angle + (rng.next() - 0.5) * spread;
    const s = speed * (0.35 + rng.next() * 0.65);
    session.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - rise,
      life: life * (0.6 + rng.next() * 0.4),
      age: 0,
      size: size * (0.6 + rng.next() * 0.8),
      color,
      gravity,
      drag,
      glow,
    });
  }
}

export function addRing(session, x, y, radius, color, life = 0.8) {
  session.rings.push({ x, y, radius, color, life, age: 0 });
}

export function addText(session, x, y, text, color = '#fff', size = 18) {
  session.texts.push({ x, y, text, color, size, age: 0, life: 1.3 });
}

export function updateParticles(session, dt) {
  for (const p of session.particles) {
    p.age += dt;
    p.vx -= p.vx * p.drag * dt;
    p.vy -= p.vy * p.drag * dt;
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  session.particles = session.particles.filter((p) => p.age < p.life);
  for (const r of session.rings) r.age += dt;
  session.rings = session.rings.filter((r) => r.age < r.life);
  for (const t of session.texts) {
    t.age += dt;
    t.y -= 34 * dt;
  }
  session.texts = session.texts.filter((t) => t.age < t.life);
}

export function drawParticles(ctx, session, glowPass) {
  for (const p of session.particles) {
    if (p.glow !== glowPass) continue;
    const fade = 1 - p.age / p.life;
    if (glowPass) {
      const s = p.size * 5 * (0.5 + fade * 0.5);
      ctx.globalAlpha = fade;
      ctx.drawImage(getGlowSprite(p.color), p.x - s, p.y - s, s * 2, s * 2);
    } else {
      ctx.globalAlpha = fade * 0.9;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;
}

export function drawRings(ctx, session) {
  for (const r of session.rings) {
    const t = r.age / r.life;
    ctx.globalAlpha = (1 - t) * 0.8;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 3 + 6 * (1 - t);
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius * (0.2 + 0.8 * Math.sqrt(t)), 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawFloatingTexts(ctx, session) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of session.texts) {
    const fade = 1 - Math.max(0, (t.age - 0.7) / (t.life - 0.7));
    const pop = t.age < 0.12 ? 0.6 + t.age / 0.3 : 1;
    ctx.globalAlpha = fade;
    ctx.font = `800 ${Math.round(t.size * pop)}px "Trebuchet MS", "Segoe UI", sans-serif`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(3, 5, 16, 0.85)';
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
