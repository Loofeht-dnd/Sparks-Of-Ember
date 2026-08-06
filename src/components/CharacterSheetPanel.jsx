import React from "react";
import { Dices, Image as ImageIcon, Loader2, ScrollText, Shield, Sparkles, Sword, Swords, Users } from "lucide-react";
import { ABILITIES } from "../constants/abilityScores.js";
import { XP_THRESHOLDS } from "../constants/leveling.js";
import { mod, fmtMod } from "../utils/modifiers.js";

export default function CharacterSheetPanel({ character, currentHp, portrait, portraitLoading, portraitError, onGeneratePortrait, portraitImage, portraitImageLoading, portraitImageError, onGeneratePortraitImage, spellSlotsUsed, companions = [], quests = [], availableWeapons = [], equippedWeapon, onEquipWeapon }) {
  const xpForCurrent = XP_THRESHOLDS[character.level - 1] || 0;
  const xpForNext = character.level < 20 ? XP_THRESHOLDS[character.level] : null;
  const xpPct = xpForNext ? Math.min(100, Math.round(((character.xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100)) : 100;
  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="display-font text-lg tx-gold">{character.name}</h3>
          <span className="text-xs tx-cream-90 mono-font">Lvl {character.level}</span>
        </div>
        <p className="text-sm tx-cream-95 italic">{character.race} {character.class} — {character.background}</p>
        <div className="w-full h-1.5 bg-ink rounded-full mt-2 overflow-hidden border bd-brown">
          <div className="h-full bg-gold hp-fill" style={{ width: `${xpPct}%` }} />
        </div>
        <p className="text-[10px] tx-cream-90 mt-1">{xpForNext ? `${character.xp} / ${xpForNext} XP` : "Max level"}</p>
      </div>

      <div className="parchment-card corner-brackets rounded-2xl p-3">
        {portraitImage ? (
          <img src={portraitImage} alt={`Portrait of ${character.name}`} className="w-full rounded-xl" />
        ) : portraitImageLoading ? (
          <div className="aspect-square rounded-xl bg-ink flex items-center justify-center">
            <Loader2 size={22} className="tx-gold animate-spin" />
          </div>
        ) : (
          <div className="aspect-square rounded-xl bg-ink flex flex-col items-center justify-center gap-2 p-4 text-center">
            {portraitImageError && <p className="text-xs tx-red">{portraitImageError}</p>}
            <ImageIcon size={22} className="tx-cream-90" />
            <button onClick={onGeneratePortraitImage} className="text-xs btn-gold tx-ink2 rounded-xl px-3 py-2 display-font">Illustrate Me</button>
          </div>
        )}
        {portraitImage && (
          <button onClick={onGeneratePortraitImage} disabled={portraitImageLoading} className="w-full text-xs tx-cream-90 hover-tx-gold mt-2 disabled:opacity-40">
            {portraitImageLoading ? "Redrawing..." : "Regenerate image"}
          </button>
        )}
      </div>

      <div className="parchment-card rounded-2xl p-4">
        {portraitLoading ? (
          <div className="flex items-center gap-2 text-xs tx-cream-92">
            <span className="w-1.5 h-1.5 rounded-full bg-gold pulse-dot" />
            <span className="w-1.5 h-1.5 rounded-full bg-gold pulse-dot" style={{ animationDelay: "0.2s" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-gold pulse-dot" style={{ animationDelay: "0.4s" }} />
            <span className="italic ml-1">picturing {character.name}...</span>
          </div>
        ) : portrait ? (
          <p className="text-sm tx-cream-95 italic leading-relaxed">{portrait}</p>
        ) : (
          <div className="text-center">
            <p className="text-xs tx-cream-90 mb-2">No portrait generated yet.</p>
            {portraitError && <p className="text-xs tx-red mb-2">{portraitError}</p>}
            <button onClick={onGeneratePortrait} className="text-xs btn-gold tx-ink2 rounded-xl px-4 py-2 display-font">Generate Portrait</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {ABILITIES.map((a) => (
          <div key={a} className="bg-ink border bd-brown rounded-xl text-center py-2">
            <div className="text-[10px] tx-cream-92 uppercase">{a}</div>
            <div className="mono-font text-lg">{character.abilityScores[a]}</div>
            <div className="text-xs tx-gold">{fmtMod(mod(character.abilityScores[a]))}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-sm flex-wrap">
        <div className="flex items-center gap-1"><Shield size={14} className="tx-gold"/> AC {character.ac}</div>
        <div className="flex items-center gap-1"><Sword size={14} className="tx-gold"/> HP {currentHp}/{character.hp}</div>
        <div className="flex items-center gap-1"><Dices size={14} className="tx-gold"/> Prof. +{character.proficiencyBonus}</div>
        {character.hasExtraAttack && <div className="flex items-center gap-1 tx-gold"><Swords size={14}/> Extra Attack</div>}
        {character.spellSlotsMax > 0 && <div className="flex items-center gap-1"><Sparkles size={14} className="tx-gold"/> Slots {Math.max(0, character.spellSlotsMax - (spellSlotsUsed || 0))}/{character.spellSlotsMax}</div>}
      </div>
      {availableWeapons.length > 1 && (
        <div>
          <p className="text-xs tx-gold-lt uppercase tracking-wide mb-1">Wielding</p>
          <div className="flex gap-2 flex-wrap">
            {availableWeapons.map((w) => (
              <button
                key={w}
                onClick={() => onEquipWeapon?.(w)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${w === equippedWeapon ? "bg-gold-5 bd-gold tx-gold" : "bd-brown tx-cream-90"}`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="text-sm space-y-1">
        <p><span className="tx-gold-lt">Skills:</span> {character.skills.join(", ")}</p>
        {character.feat && <p><span className="tx-gold-lt">Origin Feat:</span> {character.feat.name} — <span className="tx-cream-95 italic">{character.feat.desc}</span></p>}
        {character.traits.personality && <p><span className="tx-gold-lt">Personality:</span> {character.traits.personality}</p>}
        {character.traits.ideal && <p><span className="tx-gold-lt">Ideal:</span> {character.traits.ideal}</p>}
        {character.traits.bond && <p><span className="tx-gold-lt">Bond:</span> {character.traits.bond}</p>}
        {character.traits.flaw && <p><span className="tx-gold-lt">Flaw:</span> {character.traits.flaw}</p>}
        {character.customStory && <p className="pt-1"><span className="tx-gold-lt">Your Story:</span> <span className="italic">{character.customStory}</span></p>}
      </div>
      {quests.length > 0 && (
        <div>
          <h4 className="text-xs tx-gold-lt uppercase tracking-wide flex items-center gap-1 mb-2"><ScrollText size={12}/> Active Quests</h4>
          <ul className="space-y-1">
            {quests.map((q) => (
              <li key={q.id} className="text-xs tx-cream-95 flex items-start gap-1.5">
                <span className="tx-gold-mid mt-0.5">✦</span> {q.title}
              </li>
            ))}
          </ul>
        </div>
      )}
      {companions.length > 0 && (
        <div>
          <h4 className="text-xs tx-gold-lt uppercase tracking-wide flex items-center gap-1 mb-2"><Users size={12}/> Companions</h4>
          <div className="space-y-2">
            {companions.map((c) => (
              <div key={c.id} className="flex items-center gap-2 border bd-brown rounded-xl px-2 py-1.5">
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-ink-60 border bd-brown flex items-center justify-center">
                  {c.portraitUrl ? <img src={c.portraitUrl} alt="" className="w-full h-full object-cover" /> : <Users size={12} className="tx-gold-mid" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs tx-cream truncate">{c.name}</p>
                  <p className="text-[10px] tx-cream-90">{c.companionStats.hp}/{c.companionStats.maxHp} HP</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
