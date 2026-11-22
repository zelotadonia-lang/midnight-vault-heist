// The getaway grade: what the run is called when it ends. A grade is
// earned, not given — it reads the alarm peak, the loot, how often a
// guard actually spotted Wren, and whether the museum ever locked down.
// Pure function of the finished world, so the self-test can grade a
// made-up run without playing one.

export function gradeRun(world) {
  const stats = world.stats || {};
  const spotted = stats.spotted || 0;
  const toolsUsed = stats.toolsUsed || 0;
  const lockdowns = stats.lockdowns || 0;
  const distance = Math.round((stats.distance || 0) / 50);
  const peak = world.alarm ? Math.round(world.alarm.peak) : 0;
  const elapsed = Math.round(world.wonAt > 0 ? world.wonAt : world.time);
  const loot = world.lootTaken || 0;
  const totalLoot = world.level ? world.level.loot.length : 4;

  if (world.screen === 'caught') {
    return {
      title: 'BUSTED',
      stars: 0,
      lines: [
        `Spotted ${spotted} time${spotted === 1 ? '' : 's'} · alarm peaked at ${peak}`,
        `Loot ${loot}/${totalLoot} · walked ${distance} m in ${elapsed}s`,
        'The gallery keeps the sapphire. Try a quieter route.',
      ],
    };
  }

  let title;
  let stars;
  if (peak < 10 && loot === totalLoot && spotted === 0) {
    title = 'GHOST';
    stars = 3;
  } else if (peak < 50) {
    title = 'SHADOW';
    stars = loot === totalLoot ? 3 : 2;
  } else if (peak < 80 && lockdowns === 0) {
    title = 'PROFESSIONAL';
    stars = 2;
  } else {
    title = 'LOUD';
    stars = 1;
  }
  const starRow = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  return {
    title,
    stars,
    lines: [
      `Grade ${title}  ${starRow}`,
      `Spotted ${spotted} time${spotted === 1 ? '' : 's'} · tools used ${toolsUsed} · alarm peaked at ${peak}`,
      `Loot ${loot}/${totalLoot} · walked ${distance} m in ${elapsed}s${lockdowns > 0 ? ` · lockdowns ${lockdowns}` : ''}`,
    ],
  };
}
