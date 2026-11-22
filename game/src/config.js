// The Midnight Vault — shared tuning numbers for the whole game.
// Every value here is a design choice: speeds in pixels per second,
// radii in pixels, alarm in points from 0 to 100.

export const VIEW = { width: 1280, height: 720 };

export const THIEF = {
  radius: 13,
  walkSpeed: 148,
  sneakSpeed: 84,
  pickupRadius: 38,
  startX: 64,
  startY: 656,
};

export const GUARD = {
  radius: 15,
  catchRadius: 27,
  patrolSpeed: 58,
  huntSpeed: 118,
  sightRange: 225,
  // Half of the vision cone, in radians: about 29 degrees each side.
  sightHalfAngle: 0.51,
  // Alertness gained per second while the thief is inside the cone.
  spotRate: 0.55,
  spotRateSneak: 0.28,
  calmRate: 0.22,
};

export const CAMERA = {
  range: 235,
  halfAngle: 0.46,
  spotRate: 0.7,
  calmRate: 0.25,
};

export const ALARM = {
  max: 100,
  // Points per second added while a watcher has eyes on the thief.
  guardRate: 16,
  guardRateSneak: 8,
  cameraRate: 20,
  decayRate: 5,
  lockdownSeconds: 12,
  // Alarm level the lockdown falls back to when it ends.
  lockdownFallback: 55,
  // Peak alarm under this earns the quiet bonus.
  quietCeiling: 50,
};

export const TOOLS = {
  smokeCharges: 3,
  smokeRadius: 112,
  smokeSeconds: 4,
  empCharges: 2,
  empRadius: 285,
  empSeconds: 8,
  decoyCharges: 1,
  decoySeconds: 6,
  // A guard further than this will not bother walking over to look.
  decoyLureRange: 420,
};

export const SCORE = {
  sapphire: 1000,
  artifact: 250,
  crown: 500,
  // Time bonus starts here and falls 12 points a second.
  timeBase: 900,
  timeRate: 12,
  quietBonus: 400,
};

export const VENT = {
  // How close Wren must stand to a grate to climb in.
  grateRadius: 46,
  crawlSpeed: 85,
  // Alarm added when Wren climbs out: the grate rattles.
  noiseAlarm: 10,
  // Guards inside this radius of the exit grate hear the rattle.
  noiseRadius: 260,
  heardAlert: 0.5,
};

export const COLORS = {
  floor: '#1b1d26',
  floorAlt: '#20222e',
  wall: '#3a3f52',
  wallTrim: '#c9a24b',
  vaultFloor: '#2a2417',
  cone: 'rgba(232, 182, 76, 0.20)',
  coneAlert: 'rgba(229, 72, 77, 0.30)',
  cameraCone: 'rgba(240, 140, 60, 0.16)',
  thief: '#e8e4d8',
  guard: '#d64545',
  camera: '#e07b39',
  loot: '#e8b64c',
  exit: '#35c759',
  decoy: '#59d6ff',
  smoke: 'rgba(200, 200, 210, 0.55)',
  text: '#f2efe6',
  dim: '#9aa0b4',
};
