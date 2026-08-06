import { WEAPON_DICE, PRIMARY_ABILITY, SPELL_ABILITY } from "../constants/classes.js";
import { BACKGROUND_CANTRIP_ABILITY } from "../constants/backgrounds.js";
import { mod } from "./modifiers.js";

export function getPlayerAttackProfile(character, equippedWeaponName) {
  const weaponName = (equippedWeaponName && WEAPON_DICE[equippedWeaponName])
    ? equippedWeaponName
    : character.gear.find((g) => WEAPON_DICE[g]);
  const w = weaponName ? WEAPON_DICE[weaponName] : { dice: "1d6", ability: PRIMARY_ABILITY[character.class] || "str" };
  const abilityMod = mod(character.abilityScores[w.ability]);
  return { weaponName: weaponName || "improvised weapon", attackBonus: character.proficiencyBonus + abilityMod, damageDice: w.dice, damageMod: abilityMod };
}
export function getCantripAbility(character) {
  return SPELL_ABILITY[character.class] || BACKGROUND_CANTRIP_ABILITY[character.background] || null;
}
export function getPlayerCantripProfile(character) {
  const ability = getCantripAbility(character);
  if (!ability) return null;
  return { attackBonus: character.proficiencyBonus + mod(character.abilityScores[ability]), damageDice: "1d10", damageMod: 0 };
}

