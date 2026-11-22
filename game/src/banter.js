// Guard banter: the guards talk. A guard who thinks he saw something
// says so, one who lost the trail grumbles, and on a slow night they
// mutter to themselves on a fixed schedule. Lines are picked by the
// clock, never at random, so the same run always says the same thing.
// Each guard has a voice: Marco the gruff veteran, Iris the bored
// regular, Dario the nervous rookie on his first month.

const LINES = {
  Marco: {
    suspicious: [
      'Movement. Eyes open.',
      'Someone is in the hall.',
      'I heard that. Show yourself.',
    ],
    lost: [
      'Nothing. Must be the old pipes.',
      'Clear. Back to the round.',
      'Ghosts. This place is full of them.',
    ],
    lockdown: ['Lockdown! Nobody leaves.', 'Seal the doors. Now.'],
    idle: [
      'Same round, same paintings.',
      "Coffee's gone cold again.",
      'Quiet night. Too quiet, maybe.',
    ],
  },
  Iris: {
    suspicious: [
      'Did that statue just move?',
      'Hey. Who is there?',
      'I saw something by the pillar.',
    ],
    lost: [
      'False alarm. Again.',
      'Probably a rat. A rich rat.',
      'Back to the round.',
    ],
    lockdown: ['All doors sealed. Great.', 'Lockdown. There goes my break.'],
    idle: [
      'I count the paintings when bored.',
      'Forty-seven steps, every round.',
      'If the sapphire could talk, it would snore.',
    ],
  },
  Dario: {
    suspicious: [
      'Was that — did you hear that?',
      'Hello? Security here. I mean — stop!',
      'My heart is doing the thing again.',
    ],
    lost: [
      'Okay. It was nothing.',
      'Phew. Just the wind. Inside. Sure.',
      'Note to self: shadows are not thieves.',
    ],
    lockdown: [
      'Lockdown! I knew tonight was the night!',
      'Everyone stay calm! I am calm!',
    ],
    idle: [
      'First month, already the night shift.',
      'Marco says the vault was never robbed. Yet.',
      'I practiced my stern face all week.',
    ],
  },
};

export function buildBanter() {
  return { byGuard: {} };
}

function setBubble(banter, name, kind, lines, now, seconds) {
  const line = lines[Math.floor(now / 19) % lines.length];
  banter.byGuard[name] = { text: line, kind, until: now + seconds };
}

export function updateBanter(world) {
  const banter = world.banter;
  if (!banter) return;
  const lockdown = world.time < world.lockdownUntil;
  world.guards.forEach((guard, index) => {
    const lines = LINES[guard.name];
    if (!lines) return;
    const slot = banter.byGuard[guard.name] || {};
    const prevAlert = slot.prevAlert || 0;
    const prevLockdown = slot.lockdownSeen || false;

    if (lockdown && !prevLockdown) {
      setBubble(banter, guard.name, 'lockdown', lines.lockdown, world.time, 3.5);
    } else if (!lockdown && prevAlert < 0.6 && guard.alert >= 0.6) {
      setBubble(banter, guard.name, 'suspicious', lines.suspicious, world.time, 3);
    } else if (prevAlert >= 0.6 && guard.alert < 0.15) {
      setBubble(banter, guard.name, 'lost', lines.lost, world.time, 3);
    } else if (world.time >= (slot.chatterAt || 8 + index * 7)) {
      const current = banter.byGuard[guard.name];
      if (!current || world.time >= current.until) {
        setBubble(banter, guard.name, 'idle', lines.idle, world.time, 3.5);
      }
      slot.chatterAt = world.time + 19;
    }

    const after = banter.byGuard[guard.name] || {};
    after.prevAlert = guard.alert;
    after.lockdownSeen = lockdown;
    if (slot.chatterAt) after.chatterAt = slot.chatterAt;
    banter.byGuard[guard.name] = after;
  });
}

export function drawBanter(ctx, world) {
  const banter = world.banter;
  if (!banter) return;
  for (const guard of world.guards) {
    const bubble = banter.byGuard[guard.name];
    if (!bubble || !bubble.text || world.time >= bubble.until) continue;
    ctx.font = '600 12px system-ui, sans-serif';
    const w = ctx.measureText(bubble.text).width + 18;
    const x = guard.pos.x - w / 2;
    const y = guard.pos.y - 62;
    ctx.fillStyle = 'rgba(10,11,16,0.88)';
    ctx.strokeStyle =
      bubble.kind === 'lockdown' || bubble.kind === 'suspicious' ? '#e5484d' : '#9aa0b4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 22, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f2efe6';
    ctx.textAlign = 'center';
    ctx.fillText(bubble.text, guard.pos.x, y + 15);
  }
}
