// 2024-style rules: your Species gives you traits, but the Ability Score bonus and
// Origin Feat come from your Background instead of your Species.
export const CLASSES = {
  Fighter: { hitDie: 10, primary: "Strength or Dexterity", saves: ["str", "con"], gear: ["Longsword", "Shield", "Chain mail"], blurb: "A master of martial combat, unmatched with any weapon." },
  Wizard: { hitDie: 6, primary: "Intelligence", saves: ["int", "wis"], gear: ["Quarterstaff", "Spellbook", "Component pouch"], blurb: "A scholar of the arcane who bends reality through study." },
  Rogue: { hitDie: 8, primary: "Dexterity", saves: ["dex", "int"], gear: ["Rapier", "Shortbow", "Thieves' tools"], blurb: "Quick, cunning, and always one step ahead." },
  Cleric: { hitDie: 8, primary: "Wisdom", saves: ["wis", "cha"], gear: ["Mace", "Scale mail", "Holy symbol"], blurb: "A conduit for divine power, healer and smiter alike." },
  Barbarian: { hitDie: 12, primary: "Strength", saves: ["str", "con"], gear: ["Greataxe", "Handaxes"], blurb: "Fury given form — strikes first, asks never." },
  Bard: { hitDie: 8, primary: "Charisma", saves: ["dex", "cha"], gear: ["Rapier", "Lute", "Leather armor"], blurb: "A storyteller whose words carry real magic." },
  Ranger: { hitDie: 10, primary: "Dexterity & Wisdom", saves: ["str", "dex"], gear: ["Longbow", "Shortswords", "Studded leather"], blurb: "Hunter of the wilds, tracker of the untrackable." },
  Paladin: { hitDie: 10, primary: "Strength & Charisma", saves: ["wis", "cha"], gear: ["Longsword", "Shield", "Holy symbol"], blurb: "An oath made flesh, sworn to a cause greater than self." },
};


export const WEAPON_DICE = {
  Longsword: { dice: "1d8", ability: "str" },
  Rapier: { dice: "1d8", ability: "dex" },
  Quarterstaff: { dice: "1d6", ability: "str" },
  Mace: { dice: "1d6", ability: "str" },
  Greataxe: { dice: "1d12", ability: "str" },
  Longbow: { dice: "1d8", ability: "dex" },
  Shortswords: { dice: "1d6", ability: "dex" },
  Handaxes: { dice: "1d6", ability: "str" },
  Shortbow: { dice: "1d6", ability: "dex" },
};

export const PRIMARY_ABILITY = { Fighter: "str", Wizard: "int", Rogue: "dex", Cleric: "wis", Barbarian: "str", Bard: "cha", Ranger: "dex", Paladin: "str" };
export const SPELL_ABILITY = { Wizard: "int", Cleric: "wis", Bard: "cha" };
