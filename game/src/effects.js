// Effects: the small visual payoffs — loot sparkles, footstep dust,
// floating score text, EMP rings and a win confetti burst. Cosmetic
// only: nothing here changes the simulation, so a run plays the same
// with the effects on or off. Particles use their own seeded generator
// so a seed always draws the same burst.

import { makeRng, range } from './random.js';

const TAU = Math.PI * 2;
const MAX_PARTS = 140;

export function buildFx(seed = 1) {
  return {
    rng: makeRng(seed * 104729 + 7),
    parts: [],
    floats: [],
    stepAt: 0,
    eventAt: 0,
  };
}

function pushPart(fx, part) {
  if (fx.parts.length >= MAX_PARTS) fx.parts.shift();
  fx.parts.push(part);
}

function burst(fx, x, y, count, color, speed, life, size) {
  for (let i = 0; i < count; i++) {
    const a = fx.rng() * TAU;
    const v = speed * (0.4 + fx.rng() * 0.8);
    pushPart(fx, {
      kind: 'dot',
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 30,
      life: life * (0.6 + fx.rng() * 0.6),
      maxLife: life,
      size: size * (0.7 + fx.rng() * 0.6),
      color,
    });
  }
}

function ring(fx, x, y, color, maxR) {
  pushPart(fx, { kind: 'ring', x, y, life: 0.6, maxLife: 0.6, size: maxR, color });
}

// Turn the world's event strings into particles. Called from stepWorld
// before the main loop drains the queue for sounds. Each event is
// consumed once, by index: the queue may be drained between steps, so
// an index past the end means the queue was emptied and we start over.
export function spawnFxFromEvents(world) {
  const fx = world.fx;
  if (!fx) return;
  if (fx.eventAt > world.events.length) fx.eventAt = 0;
  const t = world.thief;
  for (let i = fx.eventAt; i < world.events.length; i++) {
    const event = world.events[i];
    if (event === 'loot') {
      burst(fx, t.x, t.y, 14, '#e8b64c', 90, 0.9, 3.5);
      fx.floats.push({ x: t.x, y: t.y - 24, text: '+250', life: 1.1, maxLife: 1.1 });
    } else if (event === 'sapphire') {
      burst(fx, t.x, t.y, 26, '#7fd4ff', 130, 1.2, 4);
      fx.floats.push({ x: t.x, y: t.y - 24, text: '+1000', life: 1.4, maxLife: 1.4 });
    } else if (event === 'smoke') {
      burst(fx, t.x, t.y, 10, 'rgba(200,200,210,0.8)', 40, 1.0, 6);
    } else if (event === 'emp') {
      ring(fx, t.x, t.y, '#7fd4ff', 120);
    } else if (event === 'decoy') {
      ring(fx, t.x, t.y, '#59d6ff', 90);
      burst(fx, t.x, t.y, 8, '#59d6ff', 60, 0.7, 3);
    } else if (event === 'won') {
      const e = world.level.exit;
      burst(fx, e.x, e.y, 40, '#e8b64c', 160, 1.6, 4);
      burst(fx, e.x, e.y, 20, '#35c759', 120, 1.4, 3.5);
    } else if (event === 'caught') {
      pushPart(fx, { kind: 'flash', x: 0, y: 0, life: 0.35, maxLife: 0.35, size: 0, color: '#e5484d' });
    }
  }
  fx.eventAt = world.events.length;
}

// Advance particles and leave a fading dust dot behind a moving thief.
export function updateFx(world, dt) {
  const fx = world.fx;
  if (!fx) return;
  for (const p of fx.parts) {
    p.life -= dt;
    if (p.kind === 'dot') {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
    }
  }
  fx.parts = fx.parts.filter((p) => p.life > 0);
  for (const f of fx.floats) {
    f.life -= dt;
    f.y -= 26 * dt;
  }
  fx.floats = fx.floats.filter((f) => f.life > 0);

  const t = world.thief;
  if (t.moving && world.time - fx.stepAt > 0.16) {
    fx.stepAt = world.time;
    pushPart(fx, {
      kind: 'dot',
      x: t.x + range(fx.rng, -6, 6),
      y: t.y + range(fx.rng, -6, 6),
      vx: 0,
      vy: 0,
      life: 0.8,
      maxLife: 0.8,
      size: 2.5,
      color: 'rgba(232,228,216,0.28)',
    });
  }
}

export function drawFx(ctx, world) {
  const fx = world.fx;
  if (!fx) return;
  for (const p of fx.parts) {
    const frac = Math.max(0, p.life / p.maxLife);
    if (p.kind === 'dot') {
      ctx.globalAlpha = frac;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + frac * 0.5), 0, TAU);
      ctx.fill();
    } else if (p.kind === 'ring') {
      const grown = p.size * (1 - frac);
      ctx.globalAlpha = frac * 0.8;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, grown, 0, TAU);
      ctx.stroke();
    } else if (p.kind === 'flash') {
      ctx.globalAlpha = frac * 0.16;
      ctx.fillStyle = p.color;
      ctx.fillRect(0, 0, 1280, 720);
    }
  }
  ctx.globalAlpha = 1;
  for (const f of fx.floats) {
    const frac = Math.max(0, f.life / f.maxLife);
    ctx.globalAlpha = frac;
    ctx.fillStyle = '#f2efe6';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
