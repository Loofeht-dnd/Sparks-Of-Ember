import React, { useState, useMemo } from "react";
import { Sword, Shield, Scroll, Sparkles, Dices, ChevronLeft, ChevronRight, Check, Flame, Pencil, Copy, ClipboardCheck, Lightbulb } from "lucide-react";
import { RACES } from "../constants/races.js";
import { CLASSES } from "../constants/classes.js";
import { BACKGROUNDS } from "../constants/backgrounds.js";
import { ABILITIES, ABILITY_NAMES, POINT_BUY_COST, TOTAL_POINTS, STANDARD_ARRAY } from "../constants/abilityScores.js";
import { MISSING_MESSAGE, STEPS, TIPS } from "../constants/characterCreation.js";
import { GLOBAL_STYLE } from "../styles/globalStyle.js";
import { mod, fmtMod } from "../utils/modifiers.js";
import Atmosphere from "./Atmosphere.jsx";

export default function CharacterCreator({ onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [race, setRace] = useState(null);
  const [charClass, setCharClass] = useState(null);
  const [background, setBackground] = useState(null);
  const [bgBonusPrimary, setBgBonusPrimary] = useState(null);
  const [customStory, setCustomStory] = useState("");
  const [scores, setScores] = useState({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
  const [buildMethod, setBuildMethod] = useState("pointbuy");
  const [standardAssign, setStandardAssign] = useState({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 });
  const [traits, setTraits] = useState({ ideal: "", bond: "", flaw: "", personality: "" });
  const [locked, setLocked] = useState(false);
  const [maxStep, setMaxStep] = useState(0);
  const [shake, setShake] = useState(false);
  const [copied, setCopied] = useState(false);
  const [direction, setDirection] = useState(1);
  const [tipOpen, setTipOpen] = useState(false);

  const spent = useMemo(() => ABILITIES.reduce((sum, a) => sum + (POINT_BUY_COST[scores[a]] ?? 0), 0), [scores]);
  const remaining = TOTAL_POINTS - spent;
  const baseScores = buildMethod === "standard" ? standardAssign : scores;

  const bgOptions = background ? BACKGROUNDS[background].abilityOptions : null;
  const bgPrimary = bgOptions ? (bgOptions.includes(bgBonusPrimary) ? bgBonusPrimary : bgOptions[0]) : null;
  const bgSecondary = bgOptions ? bgOptions.find((a) => a !== bgPrimary) : null;

  const finalScores = useMemo(() => {
    const out = {};
    ABILITIES.forEach((a) => (out[a] = baseScores[a]));
    if (bgPrimary) out[bgPrimary] += 2;
    if (bgSecondary) out[bgSecondary] += 1;
    return out;
  }, [baseScores, bgPrimary, bgSecondary]);

  const handleStandardChange = (ability, value) => {
    setStandardAssign((prev) => {
      const swapWith = Object.keys(prev).find((k) => prev[k] === value);
      const next = { ...prev };
      next[swapWith] = prev[ability];
      next[ability] = value;
      return next;
    });
  };

  const selectBackground = (b) => {
    setBackground(b);
    setBgBonusPrimary(BACKGROUNDS[b].abilityOptions[0]);
  };

  const hp = charClass ? CLASSES[charClass].hitDie + mod(finalScores.con) + (background === "Folk Hero" ? 2 : 0) : null;
  const ac = 10 + mod(finalScores.dex);

  const canAdvance = [
    name.trim().length > 0,
    !!race,
    !!charClass,
    !!background,
    buildMethod === "standard" ? true : remaining === 0,
    true,
  ];

  const adjustScore = (ability, dir) => {
    setScores((prev) => {
      const cur = prev[ability];
      const next = cur + dir;
      if (next < 8 || next > 15) return prev;
      const nextCost = POINT_BUY_COST[next] - POINT_BUY_COST[cur];
      if (dir > 0 && nextCost > remaining) return prev;
      return { ...prev, [ability]: next };
    });
  };

  const goNext = () => {
    if (!canAdvance[step]) { setShake(true); setTimeout(() => setShake(false), 500); return; }
    if (step < STEPS.length - 1) { setDirection(1); const next = step + 1; setStep(next); setMaxStep((m) => Math.max(m, next)); setTipOpen(false); }
  };
  const goBack = () => { if (step > 0) { setDirection(-1); setStep(step - 1); setTipOpen(false); } };
  const jumpTo = (i) => { if (i <= maxStep) { setDirection(i > step ? 1 : -1); setStep(i); setTipOpen(false); } };

  const characterSheet = useMemo(() => ({
    name, race, class: charClass, background,
    abilityScores: finalScores, hp, ac,
    proficiencyBonus: 2,
    skills: background ? BACKGROUNDS[background].skills : [],
    gear: charClass ? CLASSES[charClass].gear : [],
    feat: background ? BACKGROUNDS[background].feat : null,
    customStory,
    traits,
  }), [name, race, charClass, background, finalScores, hp, ac, customStory, traits]);

  const copyJSON = () => {
    const text = JSON.stringify(characterSheet, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
    }
  };

  const beginAdventure = () => {
    setLocked(true);
    setTimeout(() => onComplete(characterSheet), 900);
  };

  return (
    <div className="min-h-screen w-full tx-cream relative overflow-x-hidden scene-bg screen-transition" style={{ fontFamily: "'EB Garamond', serif" }}>
      <style>{GLOBAL_STYLE}</style>
      <Atmosphere />
      <div className="vignette-layer" />

      <div className="px-5 pt-8 pb-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Flame size={18} className="tx-gold-mid flicker-border" />
          <h1 className="display-font text-2xl font-bold tracking-widest gold-engraved">FORGE THY LEGEND</h1>
          <Flame size={18} className="tx-gold-mid flicker-border" />
        </div>
        <p className="text-sm tx-cream-95 italic">A character sheet, written by your own hand</p>
        <div className="ornate-divider max-w-[220px] mx-auto mt-3" />
      </div>

      <div className="flex justify-center gap-1 px-4 mb-3 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <button
              onClick={() => jumpTo(i)}
              disabled={i > maxStep}
              title={s}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs mono-font border transition-all ${i > maxStep ? "cursor-default" : "cursor-pointer hover:scale-110"} ${i === step ? "bg-gold tx-ink bd-gold" : i < step ? "bg-crimson-40 bd-crimson tx-cream" : "bd-brown tx-cream-90"}`}
            >
              {i < step ? <Check size={13} /> : i + 1}
            </button>
            {i < STEPS.length - 1 && <div className={`w-4 h-px ${i < step ? "bg-crimson" : "bg-brown"}`} />}
          </div>
        ))}
      </div>

      {(name || race || charClass) && !locked && (
        <div className="text-center text-xs tx-cream-92 mb-4 px-4">
          <span className={name ? "tx-gold" : ""}>{name || "your hero"}</span>
          {race && <span> · <span className="tx-gold">{race}</span></span>}
          {charClass && <span> · <span className="tx-gold">{charClass}</span></span>}
          {background && <span> · <span className="tx-gold">{background}</span></span>}
        </div>
      )}

      {!locked && TIPS[step] && (
        <div className="max-w-xl mx-auto px-4 mb-3">
          <button onClick={() => setTipOpen((t) => !t)} className="text-xs tx-cream-90 hover-tx-gold flex items-center gap-1">
            <Lightbulb size={12}/> {tipOpen ? "Hide tip" : "New to D&D? Tap for a tip"}
          </button>
          {tipOpen && <p className="text-xs tx-gold-lt italic mt-2 fade-up">{TIPS[step]}</p>}
        </div>
      )}

      <div key={step} className={`max-w-xl mx-auto px-4 pb-32 ${direction > 0 ? "slide-in-r" : "slide-in-l"}`}>
        {step === 0 && (
          <div className="parchment-card rounded-2xl p-6">
            <h2 className="display-font text-lg tx-gold mb-4 flex items-center gap-2"><Scroll size={18}/> Who are you?</h2>
            <label className="text-sm tx-cream block mb-2">Character name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Elandra Thorn, Kael Ironbrand..." className="w-full bg-ink-60 border bd-brown focus-bd-gold rounded-xl px-4 py-3 outline-none tx-cream ph-cream" />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <h2 className="display-font text-lg tx-gold mb-2 flex items-center gap-2"><Sparkles size={18}/> Choose your species</h2>
            {Object.entries(RACES).map(([r, data]) => (
              <button key={r} onClick={() => setRace(r)} className={`w-full text-left parchment-card rounded-2xl p-4 transition-all ${race === r ? "sel-ring" : ""}`}>
                <div className="flex justify-between items-start">
                  <span className="display-font text-base tx-cream">{r}</span>
                  <span className="text-xs mono-font tx-gold">Speed {data.speed}ft</span>
                </div>
                <p className="text-sm tx-cream-95 italic mt-1">{data.blurb}</p>
                <ul className="text-xs tx-cream mt-2 space-y-0.5">{data.traits.map((t) => <li key={t}>• {t}</li>)}</ul>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="display-font text-lg tx-gold mb-2 flex items-center gap-2"><Sword size={18}/> Choose your class</h2>
            {Object.entries(CLASSES).map(([c, data]) => (
              <button key={c} onClick={() => setCharClass(c)} className={`w-full text-left parchment-card rounded-2xl p-4 transition-all ${charClass === c ? "sel-ring" : ""}`}>
                <div className="flex justify-between items-start">
                  <span className="display-font text-base tx-cream">{c}</span>
                  <span className="text-xs mono-font tx-gold">d{data.hitDie} Hit Die</span>
                </div>
                <p className="text-sm tx-cream-95 italic mt-1">{data.blurb}</p>
                <p className="text-xs tx-cream mt-2">Gear: {data.gear.join(", ")}</p>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h2 className="display-font text-lg tx-gold mb-2 flex items-center gap-2"><Scroll size={18}/> Choose your background</h2>
            {Object.entries(BACKGROUNDS).map(([b, data]) => (
              <button key={b} onClick={() => selectBackground(b)} className={`w-full text-left parchment-card rounded-2xl p-3 transition-all ${background === b ? "sel-ring" : ""}`}>
                <div className="flex justify-between">
                  <span className="tx-cream">{b}</span>
                  <span className="text-xs tx-gold-lt">{data.skills.join(", ")}</span>
                </div>
                <p className="text-xs tx-cream-95 italic mt-1">{data.feature}</p>
                <p className="text-xs tx-cream-92 mt-1">Origin Feat — <span className="tx-gold-lt">{data.feat.name}</span>: {data.feat.desc}</p>
              </button>
            ))}

            {background && (
              <div className="parchment-card rounded-2xl p-4 space-y-2">
                <p className="text-xs tx-cream-92 mb-1">Your background grants an ability bonus — choose the split:</p>
                <div className="flex gap-2">
                  <button onClick={() => setBgBonusPrimary(bgOptions[0])} className={`flex-1 text-xs py-2 rounded-xl border transition-all ${bgPrimary === bgOptions[0] ? "bg-gold tx-ink bd-gold" : "bd-brown tx-cream"}`}>
                    {ABILITY_NAMES[bgOptions[0]]} +2 / {ABILITY_NAMES[bgOptions[1]]} +1
                  </button>
                  <button onClick={() => setBgBonusPrimary(bgOptions[1])} className={`flex-1 text-xs py-2 rounded-xl border transition-all ${bgPrimary === bgOptions[1] ? "bg-gold tx-ink bd-gold" : "bd-brown tx-cream"}`}>
                    {ABILITY_NAMES[bgOptions[1]]} +2 / {ABILITY_NAMES[bgOptions[0]]} +1
                  </button>
                </div>
              </div>
            )}

            <div className="parchment-card rounded-2xl p-4 space-y-2">
              <p className="text-sm tx-gold display-font tracking-wide">Your Story</p>
              <p className="text-xs tx-cream-92 mb-1">Write it however you like — a paragraph or a few lines. Your past, your home, why you picked up this life. The Dungeon Master will build the opening around it and keep weaving it in as the story goes, not just at the start.</p>
              <textarea
                value={customStory}
                onChange={(e) => setCustomStory(e.target.value)}
                placeholder="I grew up on the docks of a city I no longer speak the name of. My mother sold charms to sailors, and I learned to read people before I learned to read words..."
                rows={5}
                className="w-full bg-ink-60 border bd-brown focus-bd-gold rounded-xl px-3 py-2 text-sm outline-none tx-cream ph-cream resize-none"
              />
            </div>

            <div className="parchment-card rounded-2xl p-4 space-y-3">
              <p className="text-xs tx-cream-92 mb-1">Optional structured prompts, if you'd rather fill in the blanks:</p>
              {[
                { key: "personality", label: "Personality trait", ph: "Quick to laugh, slower to trust..." },
                { key: "ideal", label: "Ideal", ph: "Freedom above all else." },
                { key: "bond", label: "Bond", ph: "I owe my life to the village that raised me." },
                { key: "flaw", label: "Flaw", ph: "I can't resist a wager I know I'll lose." },
              ].map(({ key, label, ph }) => (
                <div key={key}>
                  <label className="text-xs tx-cream block mb-1">{label}</label>
                  <input value={traits[key]} onChange={(e) => setTraits({ ...traits, [key]: e.target.value })} placeholder={ph} className="w-full bg-ink-60 border bd-brown focus-bd-gold rounded-xl px-3 py-2 text-sm outline-none tx-cream ph-cream" />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="parchment-card rounded-2xl p-5">
            <h2 className="display-font text-lg tx-gold mb-1 flex items-center gap-2"><Dices size={18}/> Ability scores</h2>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setBuildMethod("pointbuy")} className={`flex-1 text-xs py-2 rounded-xl border transition-all ${buildMethod === "pointbuy" ? "bg-gold tx-ink bd-gold" : "bd-brown tx-cream"}`}>Point Buy (custom)</button>
              <button onClick={() => setBuildMethod("standard")} className={`flex-1 text-xs py-2 rounded-xl border transition-all ${buildMethod === "standard" ? "bg-gold tx-ink bd-gold" : "bd-brown tx-cream"}`}>Standard Array (quick)</button>
            </div>

            {buildMethod === "pointbuy" ? (
              <>
                <p className="text-sm tx-cream-95 mb-4">Spend {TOTAL_POINTS} points across your scores. <span className={remaining === 0 ? "tx-gold" : "tx-red"}>{remaining} remaining</span></p>
                <div className="space-y-3">
                  {ABILITIES.map((a) => {
                    const bgBonus = a === bgPrimary ? 2 : a === bgSecondary ? 1 : 0;
                    const total = scores[a] + bgBonus;
                    return (
                      <div key={a} className="flex items-center justify-between bg-ink-40 rounded-xl px-4 py-2">
                        <div>
                          <div className="text-sm tx-cream">{ABILITY_NAMES[a]}</div>
                          {bgBonus > 0 && <div className="text-xs tx-gold-lt">+{bgBonus} background</div>}
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => adjustScore(a, -1)} className="w-7 h-7 rounded-full border bd-brown tx-cream hover-bd-gold">-</button>
                          <div className="text-center w-14">
                            <div className="mono-font text-lg tx-cream">{total}</div>
                            <div className="text-xs tx-gold">{fmtMod(mod(total))}</div>
                          </div>
                          <button onClick={() => adjustScore(a, 1)} className="w-7 h-7 rounded-full border bd-brown tx-cream hover-bd-gold">+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm tx-cream-95 mb-4">Assign {STANDARD_ARRAY.join(" / ")} to your abilities — swap freely.</p>
                <div className="space-y-3">
                  {ABILITIES.map((a) => {
                    const bgBonus = a === bgPrimary ? 2 : a === bgSecondary ? 1 : 0;
                    const total = standardAssign[a] + bgBonus;
                    return (
                      <div key={a} className="flex items-center justify-between bg-ink-40 rounded-xl px-4 py-2">
                        <div>
                          <div className="text-sm tx-cream">{ABILITY_NAMES[a]}</div>
                          {bgBonus > 0 && <div className="text-xs tx-gold-lt">+{bgBonus} background</div>}
                        </div>
                        <div className="flex items-center gap-3">
                          <select value={standardAssign[a]} onChange={(e) => handleStandardChange(a, Number(e.target.value))} className="bg-ink border bd-brown rounded-xl px-2 py-1 mono-font tx-cream outline-none">
                            {STANDARD_ARRAY.map((v) => <option key={v} value={v}>{v}</option>)}
                          </select>
                          <div className="text-center w-10">
                            <div className="mono-font text-lg tx-cream">{total}</div>
                            <div className="text-xs tx-gold">{fmtMod(mod(total))}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="parchment-card corner-brackets rounded-2xl p-6">
            <div className="flex justify-between items-start mb-1">
              <h2 className="display-font text-xl gold-engraved font-bold">{name || "Unnamed Hero"}</h2>
              {!locked && <button onClick={() => jumpTo(0)} className="tx-cream-90 hover-tx-gold"><Pencil size={14}/></button>}
            </div>
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm tx-cream-95 italic">{race} {charClass} — {background}</p>
              {!locked && <button onClick={() => jumpTo(1)} className="tx-cream-90 hover-tx-gold"><Pencil size={12}/></button>}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {ABILITIES.map((a) => (
                <div key={a} className="bg-ink-40 rounded-xl text-center py-2">
                  <div className="text-[10px] tx-cream-92 uppercase">{a}</div>
                  <div className="mono-font text-lg">{finalScores[a]}</div>
                  <div className="text-xs tx-gold">{fmtMod(mod(finalScores[a]))}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 mb-2 text-sm items-center">
              <div className="flex items-center gap-1"><Shield size={14} className="tx-gold"/> AC {ac}</div>
              <div className="flex items-center gap-1"><Sword size={14} className="tx-gold"/> HP {hp}</div>
              <div className="flex items-center gap-1"><Dices size={14} className="tx-gold"/> Prof. +2</div>
              {!locked && <button onClick={() => jumpTo(4)} className="tx-cream-90 hover-tx-gold ml-auto"><Pencil size={12}/></button>}
            </div>

            <div className="text-sm space-y-1 mb-2">
              <p><span className="tx-gold-lt">Skills:</span> {BACKGROUNDS[background]?.skills.join(", ")}</p>
              <p><span className="tx-gold-lt">Gear:</span> {CLASSES[charClass]?.gear.join(", ")}</p>
              <p><span className="tx-gold-lt">Origin Feat:</span> {BACKGROUNDS[background]?.feat.name} — <span className="tx-cream-95 italic">{BACKGROUNDS[background]?.feat.desc}</span></p>
              {traits.personality && <p><span className="tx-gold-lt">Personality:</span> {traits.personality}</p>}
              {traits.ideal && <p><span className="tx-gold-lt">Ideal:</span> {traits.ideal}</p>}
              {traits.bond && <p><span className="tx-gold-lt">Bond:</span> {traits.bond}</p>}
              {traits.flaw && <p><span className="tx-gold-lt">Flaw:</span> {traits.flaw}</p>}
              {customStory && <p><span className="tx-gold-lt">Your Story:</span> <span className="italic">{customStory.length > 160 ? customStory.slice(0, 160) + "…" : customStory}</span></p>}
              {!locked && <button onClick={() => jumpTo(3)} className="text-xs tx-cream-90 hover-tx-gold flex items-center gap-1 pt-1"><Pencil size={11}/> edit background & story</button>}
            </div>

            {!locked && (
              <button onClick={copyJSON} className="w-full flex items-center justify-center gap-2 text-xs border bd-brown hover-bd-gold rounded-xl py-2 mb-3 tx-cream transition-colors">
                {copied ? <><ClipboardCheck size={14} className="tx-gold"/> Copied</> : <><Copy size={14}/> Copy character sheet as JSON</>}
              </button>
            )}

            {!locked ? (
              <button onClick={beginAdventure} className="w-full btn-crimson transition-colors rounded-xl py-3 display-font tracking-wider tx-cream-lt flicker-border">SEAL THY FATE</button>
            ) : (
              <div className="text-center text-sm tx-gold italic py-2 fade-up">The Dungeon Master stirs. Your story begins...</div>
            )}
          </div>
        )}
      </div>

      {!locked && (
        <div className="fixed bottom-0 left-0 right-0 bg-ink-85 glass-panel border-t bd-brown px-4 py-3 max-w-xl mx-auto">
          {shake && <p className="text-xs tx-red text-center mb-2 shake">{MISSING_MESSAGE[step]}</p>}
          <div className="flex justify-between">
            <button onClick={goBack} disabled={step === 0} className="flex items-center gap-1 text-sm tx-cream disabled:opacity-30 px-3 py-2"><ChevronLeft size={16}/> Back</button>
            {step < STEPS.length - 1 && (
              <button onClick={goNext} className={`flex items-center gap-1 text-sm rounded-xl px-4 py-2 transition-colors ${canAdvance[step] ? "btn-gold tx-ink2" : "bg-brown tx-cream-92"}`}>Next <ChevronRight size={16}/></button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
