// Par time and tiered bonuses: the clock is a score, not wallpaper.
//
// Finish the heist inside the par time and the getaway pays extra;
// finish it fast and it pays more. Staying quiet pays in tiers too:
// a run nobody ever spots is worth more than one that only stayed
// under the lockdown line. All three numbers are pure functions of
// the finished run, so the self-test can price a made-up run.

export const PAR = {
  // Par for the full heist: sapphire, three artifacts, out the door.
  seconds: 45,
  fastSeconds: 30,
  parBonus: 200,
  fastBonus: 400,
  // Quiet tiers: unseen beats merely quiet.
  ghostQuiet: 400,
  quietBonus: 200,
};

// Bonus for the finishing time. Only a finished run earns it.
export function parBonusFor(elapsedSeconds) {
  if (elapsedSeconds <= PAR.fastSeconds) return PAR.fastBonus;
  if (elapsedSeconds <= PAR.seconds) return PAR.parBonus;
  return 0;
}

// Bonus for how quiet the run stayed, from its alarm peak.
export function quietBonusFor(peakAlarm) {
  if (peakAlarm < 10) return PAR.ghostQuiet;
  if (peakAlarm < 50) return PAR.quietBonus;
  return 0;
}
