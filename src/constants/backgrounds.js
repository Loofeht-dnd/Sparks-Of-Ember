export const BACKGROUNDS = {
  Soldier: { skills: ["Athletics", "Intimidation"], abilityOptions: ["str", "con"], feat: { name: "Savage Attacker", desc: "Once per attack, roll weapon damage twice and keep the higher result." }, feature: "Military Rank — soldiers defer to your command." },
  Sage: { skills: ["Arcana", "History"], abilityOptions: ["int", "wis"], feat: { name: "Magic Initiate", desc: "You've picked up a minor cantrip regardless of class (Intelligence-based)." }, feature: "Researcher — you know where to find nearly any lore." },
  Criminal: { skills: ["Deception", "Stealth"], abilityOptions: ["dex", "int"], feat: { name: "Alert", desc: "Your proficiency bonus is added to initiative rolls." }, feature: "Criminal Contact — a fixer owes you a favor." },
  Noble: { skills: ["History", "Persuasion", "Insight"], abilityOptions: ["cha", "int"], feat: { name: "Skilled", desc: "An extra skill proficiency, reflecting a well-rounded upbringing." }, feature: "Position of Privilege — doors open for your name." },
  "Folk Hero": { skills: ["Animal Handling", "Survival"], abilityOptions: ["str", "con"], feat: { name: "Tough", desc: "Your hit point maximum increases by 2." }, feature: "Rustic Hospitality — common folk shelter you." },
  Acolyte: { skills: ["Insight", "Religion"], abilityOptions: ["wis", "cha"], feat: { name: "Magic Initiate", desc: "You've picked up a minor cantrip regardless of class (Wisdom-based)." }, feature: "Shelter of the Faithful — temples aid you freely." },
  Hermit: { skills: ["Medicine", "Religion"], abilityOptions: ["wis", "con"], feat: { name: "Healer", desc: "In combat you may use a Healer's Kit action to mend your own wounds." }, feature: "Discovery — you carry a secret of great importance." },
  Entertainer: { skills: ["Acrobatics", "Performance"], abilityOptions: ["cha", "dex"], feat: { name: "Musician", desc: "Advantage on Performance checks tied to your art — a roleplay perk." }, feature: "By Popular Demand — a welcome performer, everywhere." },
};
export const BACKGROUND_CANTRIP_ABILITY = { Sage: "int", Acolyte: "wis" };
