// The numbers the whole game shares: field size, movement, sight rules,
// the alarm, the tools and the score. Tuning lives here and nowhere else.
export const FIELD = { width: 1280, height: 720 };
export const HUD_HEIGHT = 72;
export const STEP = 1 / 60;

export const THIEF = {
  radius: 13,
  walkSpeed: 178,
  sneakSpeed: 102,
  sneakFactor: 0.45,
  grabRadius: 34,
  exitRadius: 38,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 72,
  chaseSpeed: 158,
  visionRange: 265,
  visionHalfAngle: (38 * Math.PI) / 180,
  catchRadius: 26,
  spotGrace: 0.55,
};

export const CAMERA = {
  visionRange: 250,
  visionHalfAngle: (34 * Math.PI) / 180,
  sweepHalfAngle: (52 * Math.PI) / 180,
  sweepSeconds: 5.5,
  disabledSeconds: 8,
};

export const ALARM = {
  risePerSecond: 30,
  decayPerSecond: 7,
  lockdownAt: 100,
  lockdownSeconds: 12,
  lockdownReset: 42,
  cameraWeight: 0.7,
};

export const TOOLS = {
  smokeCount: 3,
  smokeRadius: 95,
  smokeSeconds: 6,
  empCount: 2,
  empRadius: 330,
};

export const SCORE = {
  vault: 1000,
  artifact: 250,
  timeBonusMax: 600,
  parSeconds: 150,
  cleanBonus: 400,
  cleanAlarmBelow: 50,
  caughtPenalty: 0,
};

export const BEST_KEY = 'midnight-vault-best';
