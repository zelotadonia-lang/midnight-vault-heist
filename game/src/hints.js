// Contextual hints: one short line of guidance the first time a
// situation comes up, then never again that run. A new player learns
// the cone, the camera, the alarm and the vault by meeting them, not
// by reading a manual before the first step.

const HINTS = [
  {
    id: 'cone',
    text: 'That cone is a guard’s eyes — wait for it to sweep past.',
    test: (world) =>
      world.guards.some((g) => {
        const dx = g.pos.x - world.thief.x;
        const dy = g.pos.y - world.thief.y;
        return dx * dx + dy * dy < 260 * 260;
      }),
  },
  {
    id: 'loot',
    text: 'Artifacts pay 250 each — the sapphire is the real job.',
    test: (world) => world.lootTaken === 1,
  },
  {
    id: 'camera',
    text: 'Cameras feed the alarm fast — press 2 for an EMP pulse.',
    test: (world) => world.cameras.some((c) => c.seen),
  },
  {
    id: 'alarm',
    text: 'Alarm climbing — break line of sight and it drains back down.',
    test: (world) => world.alarm.level >= 40,
  },
  {
    id: 'vault',
    text: 'The Star Sapphire waits behind this door.',
    test: (world) => world.thief.x > 900 && world.thief.y < 330,
  },
  {
    id: 'decoy',
    text: 'Cornered? Press 3 — the decoy pulls the nearest guard away.',
    test: (world) =>
      world.guards.some((g) => g.alert >= 0.6) && world.thief.decoyCharges > 0,
  },
  {
    id: 'vent',
    text: 'A vent grate — press E to crawl through to the vault, but it rattles.',
    test: (world) =>
      world.vents.grates.some((g) => {
        const dx = g.x - world.thief.x;
        const dy = g.y - world.thief.y;
        return dx * dx + dy * dy < 90 * 90;
      }),
  },
  {
    id: 'crown',
    text: 'The Crown Jewels pay 500 — but their own camera watches the door.',
    test: (world) => world.thief.x > 960 && world.thief.y > 620 && world.thief.x < 1140,
  },
];

export function buildHints() {
  return { shown: {}, current: null, until: 0 };
}

export function updateHints(world) {
  const hints = world.hints;
  if (!hints) return;
  if (world.time < hints.until) return;
  hints.current = null;
  for (const hint of HINTS) {
    if (hints.shown[hint.id]) continue;
    if (hint.test(world)) {
      hints.shown[hint.id] = true;
      hints.current = hint.text;
      hints.until = world.time + 4.5;
      return;
    }
  }
}

export function drawHint(ctx, world) {
  const hints = world.hints;
  if (!hints || !hints.current || world.time >= hints.until) return;
  ctx.fillStyle = 'rgba(232,182,76,0.95)';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(hints.current, 640, 684);
}
