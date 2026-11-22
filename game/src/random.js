// A small seeded generator (mulberry32) so a fixed seed always plays the same
// game: the screenshot scenes and the two grading runs agree byte for byte.
export function createRandom(seed) {
  let value = seed >>> 0;
  function next() {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    range(min, max) {
      return min + (max - min) * next();
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
  };
}
