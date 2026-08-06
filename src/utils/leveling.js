import { XP_THRESHOLDS } from "../constants/leveling.js";
import { CLASSES } from "../constants/classes.js";

export function levelForXp(xp) {
  let lvl = 1;
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) { lvl = i + 1; break; }
  }
  return Math.min(lvl, 20);
}
export function proficiencyForLevel(level) {
  return 2 + Math.floor((level - 1) / 4);
}
export function bonusHpForLevel(charClass, level, conMod) {
  if (level <= 1) return 0;
  const hitDie = CLASSES[charClass].hitDie;
  const avgPerLevel = Math.floor(hitDie / 2) + 1; // standard 5e "take the average" rule
  return (level - 1) * (avgPerLevel + conMod);
}

