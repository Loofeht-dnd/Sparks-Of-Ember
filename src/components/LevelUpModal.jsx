import React, { useState } from "react";
import { ASI_LEVELS } from "../constants/leveling.js";
import { ABILITIES, ABILITY_NAMES } from "../constants/abilityScores.js";
import { mod } from "../utils/modifiers.js";

export default function LevelUpModal({ character, fromLevel, toLevel, currentAbilityScores, onConfirm }) {
  const isAsi = ASI_LEVELS.includes(toLevel);
  const [mode, setMode] = useState("two");
  const [choiceA, setChoiceA] = useState("str");
  const [choiceB, setChoiceB] = useState("dex");
  const [choiceOne, setChoiceOne] = useState("str");

  const conMod = mod(currentAbilityScores.con);
  const hitDie = CLASSES[character.class].hitDie;
  const hpPerLevel = Math.floor(hitDie / 2) + 1 + conMod;
  const newMaxHp = character.hp + bonusHpForLevel(character.class, toLevel, conMod);
  const oldProf = proficiencyForLevel(fromLevel);
  const newProf = proficiencyForLevel(toLevel);
  const unlocksExtraAttack = toLevel === EXTRA_ATTACK_LEVEL && EXTRA_ATTACK_CLASSES.includes(character.class);
  const isCaster = !!getCantripAbility(character);
  const oldSlots = SPELL_SLOTS_BY_LEVEL[fromLevel] || 0;
  const newSlots = SPELL_SLOTS_BY_LEVEL[toLevel] || 0;

  function handleConfirm() {
    if (!isAsi) { onConfirm(null); return; }
    if (mode === "one") onConfirm({ [choiceOne]: 2 });
    else onConfirm({ [choiceA]: 1, [choiceB]: 1 });
  }

  return (
    <div className="fixed inset-0 z-30 overlay-dark glass-panel overlay-transition flex items-center justify-center px-6">
      <div className="parchment-card corner-brackets drawer-transition rounded-2xl p-6 max-w-sm w-full max-h-[85vh] overflow-y-auto">
        <div className="text-center mb-4">
          <p className="text-[10px] tx-gold uppercase tracking-widest mb-1">✦ Level Up ✦</p>
          <h3 className="display-font text-2xl gold-engraved">Level {toLevel}</h3>
        </div>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between bg-ink border bd-brown rounded-xl px-3 py-2">
            <span className="tx-cream-90">Hit Points</span>
            <span className="tx-gold">+{hpPerLevel} → {newMaxHp} max</span>
          </div>
          {newProf !== oldProf && (
            <div className="flex justify-between bg-ink border bd-brown rounded-xl px-3 py-2">
              <span className="tx-cream-90">Proficiency Bonus</span>
              <span className="tx-gold">+{oldProf} → +{newProf}</span>
            </div>
          )}
          {unlocksExtraAttack && (
            <div className="bg-gold-5 border bd-gold rounded-xl px-3 py-2">
              <span className="tx-gold">⚔ Extra Attack unlocked — attack twice per turn in combat</span>
            </div>
          )}
          {isCaster && newSlots !== oldSlots && (
            <div className="flex justify-between bg-ink border bd-brown rounded-xl px-3 py-2">
              <span className="tx-cream-90">Spell Slots</span>
              <span className="tx-gold">{oldSlots} → {newSlots}</span>
            </div>
          )}
        </div>

        {isAsi && (
          <div className="mb-4">
            <p className="text-sm tx-gold display-font tracking-wide mb-2">Ability Score Improvement</p>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setMode("two")} className={`flex-1 text-xs py-2 rounded-xl border ${mode === "two" ? "bg-gold-5 bd-gold tx-gold" : "bd-brown tx-cream-90"}`}>+1 to two abilities</button>
              <button onClick={() => setMode("one")} className={`flex-1 text-xs py-2 rounded-xl border ${mode === "one" ? "bg-gold-5 bd-gold tx-gold" : "bd-brown tx-cream-90"}`}>+2 to one ability</button>
            </div>
            {mode === "two" ? (
              <div className="grid grid-cols-2 gap-2">
                <select value={choiceA} onChange={(e) => setChoiceA(e.target.value)} className="bg-ink-60 border bd-brown rounded-xl px-2 py-2 text-sm tx-cream outline-none">
                  {ABILITIES.map((a) => <option key={a} value={a}>{ABILITY_NAMES[a]}</option>)}
                </select>
                <select value={choiceB} onChange={(e) => setChoiceB(e.target.value)} className="bg-ink-60 border bd-brown rounded-xl px-2 py-2 text-sm tx-cream outline-none">
                  {ABILITIES.map((a) => <option key={a} value={a}>{ABILITY_NAMES[a]}</option>)}
                </select>
              </div>
            ) : (
              <select value={choiceOne} onChange={(e) => setChoiceOne(e.target.value)} className="w-full bg-ink-60 border bd-brown rounded-xl px-2 py-2 text-sm tx-cream outline-none">
                {ABILITIES.map((a) => <option key={a} value={a}>{ABILITY_NAMES[a]}</option>)}
              </select>
            )}
          </div>
        )}

        <button onClick={handleConfirm} className="w-full btn-crimson rounded-xl py-3 display-font tracking-wider tx-cream-lt flicker-border">
          CONTINUE
        </button>
      </div>
    </div>
  );
}
