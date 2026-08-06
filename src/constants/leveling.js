// Leveling (2024 D&D rules, simplified where our engine doesn't track a full spell list)
export const XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
export const ASI_LEVELS = [4, 8, 12, 16, 19];
export const EXTRA_ATTACK_CLASSES = ["Fighter", "Barbarian", "Paladin", "Ranger"];
export const EXTRA_ATTACK_LEVEL = 5;
// Rough total spell-slot-count approximation per level (we don't track individual spell levels,
// just a pool of "casts" that scales the way a full caster's total slots roughly would).
export const SPELL_SLOTS_BY_LEVEL = [0, 2, 3, 4, 4, 6, 7, 8, 8, 9, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15];
