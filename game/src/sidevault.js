// The side vault: an optional high-risk room in the south-east wing.
//
// Behind its own door sits the Crown Jewels, worth twice an artifact.
// The catch is the vault camera inside, watching the door, and the
// room is a dead end: one way in, one way out, with the camera's cone
// between Wren and the door. The sapphire run never needs it, so it is
// a real choice — 500 points against a camera that feeds the alarm
// fast and a room with nowhere to hide.

export const SIDEVAULT_ROOM = { x: 980, y: 480, w: 140, h: 160 };

// Walls of the side vault. The only door is a gap in the south wall,
// x 1044..1104, so a thief slipping out heads straight for the EXIT
// while the camera watches her back. The east wall stops at x 1120 so
// the pearl walk past it keeps a full thief's width of clearance.
export const SIDEVAULT_WALLS = [
  // North wall.
  { x: 980, y: 480, w: 140, h: 16 },
  // West wall.
  { x: 980, y: 480, w: 16, h: 160 },
  // South wall, door gap x 1044..1104.
  { x: 980, y: 624, w: 64, h: 16 },
  { x: 1104, y: 624, w: 16, h: 16 },
  // East wall.
  { x: 1104, y: 480, w: 16, h: 160 },
];

export const SIDEVAULT_LOOT = {
  id: 'crown',
  name: 'Crown Jewels',
  x: 1060,
  y: 560,
  value: 500,
  taken: false,
  kind: 'crown',
};

// The vault camera hangs inside the room, sweeping down toward the
// door. Its cone cannot reach the pearl path or the exit walk: the
// room's own walls cut it off, so it only punishes a thief who walks
// in to take the crown.
export const SIDEVAULT_CAMERA = {
  name: 'Vault camera',
  x: 1060,
  y: 512,
  baseAngle: Math.PI / 2,
  sweep: 0.55,
  period: 5,
  phase: 0.7,
  range: 210,
  disabledUntil: 0,
  alert: 0,
  angle: Math.PI / 2,
  seen: false,
};
