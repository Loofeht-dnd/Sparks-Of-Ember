import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Sword, Shield, Scroll, Sparkles, Dices, Send, Loader2, AlertTriangle, X, Swords, Wind,
  LogOut, Lightbulb, Heart, User, Package, Plus, Feather, MapPin, Download, Volume2, VolumeX, Mic,
} from "lucide-react";

import { ABILITIES, ABILITY_NAMES } from "../constants/abilityScores.js";
import { WEAPON_DICE } from "../constants/classes.js";
import { EXTRA_ATTACK_CLASSES, EXTRA_ATTACK_LEVEL, SPELL_SLOTS_BY_LEVEL } from "../constants/leveling.js";
import { KNOWN_DIRECTIONS_DISPLAY } from "../constants/map.js";
import { GLOBAL_STYLE } from "../styles/globalStyle.js";

import { mod, fmtMod } from "../utils/modifiers.js";
import { genId } from "../utils/id.js";
import { rollD20, rollDiceExpr } from "../utils/dice.js";
import { levelForXp, proficiencyForLevel, bonusHpForLevel } from "../utils/leveling.js";
import { getPlayerAttackProfile, getCantripAbility, getPlayerCantripProfile } from "../utils/combatMath.js";
import { applyWorldTheme } from "../utils/theme.js";
import { buildSystemPrompt } from "../utils/promptBuilder.js";
import { extractNote, extractXp, extractItem, extractMap, extractEnding, extractRoll, extractCombat, extractNPC, extractSpeaker, extractCompanion, extractDisposition, extractQuest } from "../utils/parser.js";

import { generateNarration, generateJSON, generateImage, summarizeHistory } from "../services/aiService.js";
import { saveGame } from "../services/saveManager.js";
import { buildRecapMarkdown, downloadTextFile } from "../utils/recap.js";
import { isAudioEnabled, setAudioEnabled, playSfx, speakNarration } from "../services/audio.js";
import { isVoiceInputSupported, startVoiceInput } from "../services/voiceInput.js";

import Atmosphere from "./Atmosphere.jsx";
import CharacterSheetPanel from "./CharacterSheetPanel.jsx";
import MapPanel from "./MapPanel.jsx";
import LevelUpModal from "./LevelUpModal.jsx";
import SpeakerAvatar from "./SpeakerAvatar.jsx";

export default function GameScreen({ character, storyPref, initialState, slotId, onExit }) {
  const [log, setLog] = useState(initialState?.log || []);
  const [history, setHistory] = useState(initialState?.history || []);
  // A rolling, condensed summary of older turns, so very long sessions don't
  // keep growing the full history sent on every request — see the effect
  // below. Only ever fed from the oldest chunk of `history`; recent turns
  // stay verbatim.
  const [historySummary, setHistorySummary] = useState(initialState?.historySummary || "");
  const summarizingRef = useRef(false);
  const [input, setInput] = useState("");
  const [audioOn, setAudioOn] = useState(isAudioEnabled());
  const [listening, setListening] = useState(false);
  const voiceStopRef = useRef(null);
  const lastSpokenLogIdRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [pendingRoll, setPendingRoll] = useState(null);
  const [rollingValue, setRollingValue] = useState(null);
  const [error, setError] = useState(null);
  const [showJournal, setShowJournal] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [journal, setJournal] = useState(initialState?.journal || []);
  const [inventory, setInventory] = useState(initialState?.inventory || character.gear.map((g) => ({ name: g, desc: "" })));
  const [worldTheme, setWorldTheme] = useState(initialState?.worldTheme || null);
  // NPCs the AI has introduced by name, keyed by the id it assigned them —
  // fed back into the system prompt so the AI stays consistent about who they
  // are, and used to generate + show a small portrait next to their dialogue.
  const [npcRegistry, setNpcRegistry] = useState(initialState?.npcRegistry || {});
  // Structured objective tracker — separate from the freeform journal so
  // "what am I supposed to be doing" has a real answer.
  const [questLog, setQuestLog] = useState(initialState?.questLog || {});
  // Which starting weapon (if the class has more than one) is actively
  // wielded — only affects combat math, doesn't touch the inventory list.
  const availableWeapons = useMemo(() => character.gear.filter((g) => WEAPON_DICE[g]), [character.gear]);
  const [equippedWeapon, setEquippedWeapon] = useState(initialState?.equippedWeapon || availableWeapons[0] || null);

  // --- Leveling ---
  const [level, setLevel] = useState(initialState?.level || 1);
  const [xp, setXp] = useState(initialState?.xp || 0);
  const [abilityBonuses, setAbilityBonuses] = useState(initialState?.abilityBonuses || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });
  const [spellSlotsUsed, setSpellSlotsUsed] = useState(0); // resets each new combat — see startCombat
  const [levelUpQueue, setLevelUpQueue] = useState([]); // levels still waiting to be acknowledged/resolved
  const pendingLevelUp = levelUpQueue[0] || null;
  useEffect(() => {
    const targetLevel = levelForXp(xp);
    if (targetLevel > level) {
      setLevelUpQueue(Array.from({ length: targetLevel - level }, (_, i) => level + 1 + i));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const charLevel = useMemo(() => {
    const abilityScores = {};
    ABILITIES.forEach((a) => (abilityScores[a] = character.abilityScores[a] + (abilityBonuses[a] || 0)));
    const proficiencyBonus = proficiencyForLevel(level);
    const hp = character.hp + bonusHpForLevel(character.class, level, mod(abilityScores.con));
    const hasExtraAttack = EXTRA_ATTACK_CLASSES.includes(character.class) && level >= EXTRA_ATTACK_LEVEL;
    const spellSlotsMax = getCantripAbility(character) ? SPELL_SLOTS_BY_LEVEL[level] : 0;
    return { ...character, abilityScores, proficiencyBonus, hp, level, xp, hasExtraAttack, spellSlotsMax };
  }, [character, level, xp, abilityBonuses]);

  useEffect(() => {
    applyWorldTheme(worldTheme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldTheme]);
  const [manualNote, setManualNote] = useState("");
  const [portrait, setPortrait] = useState(initialState?.portrait || null);
  const [portraitLoading, setPortraitLoading] = useState(false);
  const [portraitError, setPortraitError] = useState(null);
  const [portraitImage, setPortraitImage] = useState(initialState?.portraitImage || null);
  const [portraitImageLoading, setPortraitImageLoading] = useState(false);
  const [portraitImageError, setPortraitImageError] = useState(null);
  const [sceneImage, setSceneImage] = useState(null); // ephemeral — tied to current location, not persisted
  const [sceneImageLoading, setSceneImageLoading] = useState(false);
  const [sceneImageError, setSceneImageError] = useState(null);
  const [campaignEnded, setCampaignEnded] = useState(initialState?.campaignEnded || false);
  const [mapData, setMapData] = useState(initialState?.mapData || null);
  const [autoIllustrate, setAutoIllustrateState] = useState(() => localStorage.getItem("dnd-auto-illustrate") !== "off");
  function setAutoIllustrate(on) {
    setAutoIllustrateState(on);
    localStorage.setItem("dnd-auto-illustrate", on ? "on" : "off");
  }
  useEffect(() => {
    setSceneImage(null);
    setSceneImageError(null);
    if (mapData && autoIllustrate) ensureSceneImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapData?.current?.name]);
  const [activeTab, setActiveTab] = useState("story"); // mobile-only: 'story' | 'map' | 'sheet'
  const [currentHp, setCurrentHp] = useState(initialState?.currentHp ?? character.hp);
  useEffect(() => {
    if (initialState?.currentHp == null) setCurrentHp(charLevel.hp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [combat, setCombat] = useState(null); // {round, order:[...], turnIndex, ended}
  const [diceAnim, setDiceAnim] = useState(null); // { actor: 'player'|'enemy', label, value }
  const bottomRef = useRef(null);
  const startedRef = useRef(!!initialState);

  const knownNpcList = useMemo(() => Object.values(npcRegistry), [npcRegistry]);
  const companions = useMemo(() => knownNpcList.filter((n) => n.isCompanion), [knownNpcList]);
  const activeQuestList = useMemo(() => Object.values(questLog).filter((q) => q.status === "active"), [questLog]);
  const systemPrompt = useMemo(() => buildSystemPrompt(charLevel, storyPref, knownNpcList, activeQuestList, historySummary), [charLevel, storyPref, knownNpcList, activeQuestList, historySummary]);

  function registerQuest(quest) {
    setQuestLog((log) => ({ ...log, [quest.id]: quest }));
  }

  function exportRecap() {
    const markdown = buildRecapMarkdown({ character: charLevel, log, journal, questLog, npcRegistry });
    const safeName = (character.name || "adventure").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    downloadTextFile(`${safeName || "adventure"}-recap.md`, markdown);
  }

  function registerNpc(npc) {
    setNpcRegistry((reg) => (reg[npc.id] ? reg : { ...reg, [npc.id]: { ...npc, disposition: "neutral", portraitUrl: null, portraitLoading: false, portraitError: false } }));
  }

  function registerDisposition({ id, value }) {
    setNpcRegistry((reg) => (reg[id] ? { ...reg, [id]: { ...reg[id], disposition: value } } : reg));
  }

  // Marks a known NPC as a traveling companion with combat stats. NOTE: this is
  // a data-model-only addition — companions are tracked and shown in the UI,
  // but are NOT wired into automatic combat turns (see docs/COMPANIONS.md for
  // why, and what a safe next step looks like).
  function registerCompanion(companion) {
    setNpcRegistry((reg) => (reg[companion.id] ? { ...reg, [companion.id]: { ...reg[companion.id], isCompanion: true, companionStats: { maxHp: companion.maxHp, hp: companion.hp, ac: companion.ac, attackBonus: companion.attackBonus, damage: companion.damage } } } : reg));
  }

  // Generate a small portrait for any newly-registered NPC that doesn't have one yet.
  useEffect(() => {
    const pending = Object.values(npcRegistry).filter((n) => !n.portraitUrl && !n.portraitLoading && !n.portraitError);
    if (pending.length === 0) return;
    pending.forEach((npc) => {
      setNpcRegistry((reg) => (reg[npc.id] ? { ...reg, [npc.id]: { ...reg[npc.id], portraitLoading: true } } : reg));
      const prompt = `Small character portrait icon, painterly fantasy art style, head and shoulders, plain dark background, no text. ${npc.name}: ${npc.appearance || npc.role || "a person the player just met"}.`;
      generateImage(prompt)
        .then((dataUrl) => {
          setNpcRegistry((reg) => (reg[npc.id] ? { ...reg, [npc.id]: { ...reg[npc.id], portraitUrl: dataUrl, portraitLoading: false } } : reg));
        })
        .catch(() => {
          setNpcRegistry((reg) => (reg[npc.id] ? { ...reg, [npc.id]: { ...reg[npc.id], portraitLoading: false, portraitError: true } } : reg));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npcRegistry]);

  // Same pattern as the NPC portrait effect above, but for combat enemies —
  // turns a text-only fight into something visual without touching any turn
  // resolution logic (uses the existing updateCombatant() mutator).
  useEffect(() => {
    if (!combat) return;
    const pending = combat.order.filter((c) => !c.isPlayer && !c.isCompanion && !c.portraitUrl && !c.portraitLoading && !c.portraitError);
    if (pending.length === 0) return;
    pending.forEach((enemy) => {
      updateCombatant(enemy.id, { portraitLoading: true });
      const prompt = `Small character portrait icon, painterly dark fantasy art style, head and shoulders, plain dark background, no text. A menacing ${enemy.name} ready for battle.`;
      generateImage(prompt)
        .then((dataUrl) => updateCombatant(enemy.id, { portraitUrl: dataUrl, portraitLoading: false }))
        .catch(() => updateCombatant(enemy.id, { portraitLoading: false, portraitError: true }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat]);

  // Apply the stored audio preference once on mount — actually starting the
  // AudioContext here (rather than at module load) means it happens after
  // the many clicks it took to reach this screen, which browsers' autoplay
  // policies require.
  useEffect(() => {
    setAudioEnabled(audioOn);
    return () => setAudioEnabled(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleAudio() {
    const next = !audioOn;
    setAudioOn(next);
    setAudioEnabled(next);
  }

  useEffect(() => {
    if (diceAnim) playSfx("diceRoll");
  }, [diceAnim]);

  useEffect(() => {
    if (pendingLevelUp) playSfx("levelUp");
  }, [pendingLevelUp]);

  // Once conversation history gets long, compress the oldest chunk into the
  // rolling summary (fed back via buildSystemPrompt) and drop it from what
  // gets sent on future requests — keeps token usage/latency bounded on long
  // sessions without losing the older context, and never touches `log`
  // (the on-screen story), only `history` (what's sent to the AI).
  useEffect(() => {
    const SUMMARIZE_THRESHOLD = 40;
    const CHUNK_SIZE = 16;
    if (history.length <= SUMMARIZE_THRESHOLD || summarizingRef.current) return;
    summarizingRef.current = true;
    const chunk = history.slice(0, CHUNK_SIZE);
    const transcript = chunk.map((m) => `${m.role === "user" ? character.name : "DM"}: ${m.content}`).join("\n");
    summarizeHistory(historySummary, transcript)
      .then((updated) => {
        setHistorySummary(updated);
        setHistory((h) => h.slice(CHUNK_SIZE));
      })
      .catch(() => {
        // best-effort — if summarizing fails, just try again once history
        // grows further; nothing is lost since `history` is untouched
      })
      .finally(() => { summarizingRef.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  // Read the newest narration line aloud (once) when narration read-aloud is on.
  useEffect(() => {
    const lastNarration = [...log].reverse().find((m) => m.kind === "narration" || m.kind === "ending");
    if (!lastNarration || lastNarration.id === lastSpokenLogIdRef.current) return;
    lastSpokenLogIdRef.current = lastNarration.id;
    speakNarration(lastNarration.text);
  }, [log]);

  function handleMicClick() {
    if (listening) {
      voiceStopRef.current?.();
      voiceStopRef.current = null;
      setListening(false);
      return;
    }
    const stop = startVoiceInput({
      onResult: (transcript) => setInput((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript)),
      onEnd: () => { setListening(false); voiceStopRef.current = null; },
      onError: () => { setListening(false); voiceStopRef.current = null; },
    });
    if (stop) {
      voiceStopRef.current = stop;
      setListening(true);
    }
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    beginOpening();
    if (!initialState) {
      reflavorGear(); // fire-and-forget; falls back silently to plain D&D names on failure
      ensureWorldTheme(); // fire-and-forget; falls back silently to the default palette on failure
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log, loading, pendingRoll, combat]);

  // Autosave whenever the story or HP changes (skipped while mid-combat to avoid a half-resolved save)
  useEffect(() => {
    if (log.length === 0 || combat) return;
    (async () => {
      await saveGame({ character, storyPref, log, history, currentHp, journal, inventory, portrait, portraitImage, campaignEnded, mapData, worldTheme, level, xp, abilityBonuses, npcRegistry, questLog, equippedWeapon, historySummary }, slotId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log, currentHp, combat, journal, inventory, portrait, portraitImage, campaignEnded, mapData, worldTheme, level, xp, abilityBonuses, npcRegistry, questLog, equippedWeapon, historySummary]);

  // Drives enemy turns and checks win/loss whenever combat state changes
  useEffect(() => {
    if (!combat || combat.ended) return;
    const enemiesAlive = combat.order.some((c) => !c.isPlayer && !c.isCompanion && c.alive);
    const player = combat.order.find((c) => c.isPlayer);
    if (player && player.hp <= 0) { endCombat("defeat"); return; }
    if (!enemiesAlive) { endCombat("victory"); return; }
    const current = combat.order[combat.turnIndex];
    if (current && !current.isPlayer && current.alive) {
      const t = setTimeout(() => (current.isCompanion ? companionTurn(current.id) : enemyTurn(current.id)), 900);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat]);

  function resolveLevelUp(deltaBonuses) {
    if (deltaBonuses) {
      setAbilityBonuses((prev) => {
        const next = { ...prev };
        Object.entries(deltaBonuses).forEach(([k, v]) => { next[k] = (next[k] || 0) + v; });
        return next;
      });
    }
    setLevel(pendingLevelUp);
    setCurrentHp((hp) => hp + (bonusHpForLevel(character.class, pendingLevelUp, mod(character.abilityScores.con + (abilityBonuses.con || 0))) - bonusHpForLevel(character.class, level, mod(character.abilityScores.con + (abilityBonuses.con || 0)))));
    setLevelUpQueue((q) => q.slice(1));
  }

  function awardXp(amount, reason) {
    if (!amount) return;
    setLog((l) => [...l, { id: genId(), kind: "xp", text: `+${amount} XP${reason ? ` — ${reason}` : ""}` }]);
    setXp((prev) => {
      const newXp = prev + amount;
      const newLevel = levelForXp(newXp);
      if (newLevel > level) {
        setLevelUpQueue((q) => [...q, ...Array.from({ length: newLevel - level }, (_, i) => level + 1 + i)]);
      }
      return newXp;
    });
  }

  function pushDMResult(rawText) {
    let text = rawText;

    const noteParse = extractNote(text);
    text = noteParse.text;
    if (noteParse.note) {
      setJournal((j) => [...j, { id: genId(), text: noteParse.note, turn: j.length + 1 }]);
    }

    const itemParse = extractItem(text);
    text = itemParse.text;
    if (itemParse.item) {
      setInventory((inv) => {
        let next = inv;
        if (Array.isArray(itemParse.item.remove)) {
          const removeSet = new Set(itemParse.item.remove.map((n) => n.toLowerCase()));
          next = next.filter((it) => !removeSet.has(it.name.toLowerCase()));
        }
        if (Array.isArray(itemParse.item.add)) {
          next = [...next, ...itemParse.item.add.map((it) => ({ name: it.name, desc: it.desc || "" }))];
        }
        return next;
      });
    }

    const xpParse = extractXp(text);
    text = xpParse.text;
    if (xpParse.xp) { awardXp(xpParse.xp); playSfx("xp"); }

    const mapParse = extractMap(text);
    text = mapParse.text;
    if (mapParse.map) setMapData(mapParse.map);

    const npcParse = extractNPC(text);
    text = npcParse.text;
    if (npcParse.npc) registerNpc(npcParse.npc);

    const companionParse = extractCompanion(text);
    text = companionParse.text;
    if (companionParse.companion) registerCompanion(companionParse.companion);

    const dispositionParse = extractDisposition(text);
    text = dispositionParse.text;
    if (dispositionParse.disposition) registerDisposition(dispositionParse.disposition);

    const questParse = extractQuest(text);
    text = questParse.text;
    if (questParse.quest) registerQuest(questParse.quest);

    const speakerParse = extractSpeaker(text);
    text = speakerParse.text;
    const speakerId = speakerParse.speakerId;

    const endingParse = extractEnding(text);
    text = endingParse.text;
    if (endingParse.ended) {
      setLog((l) => [...l, { id: genId(), role: "assistant", kind: "ending", text, speakerId }]);
      setCampaignEnded(true);
      return;
    }

    const combatParse = extractCombat(text);
    if (combatParse.combat) {
      setLog((l) => [...l, { id: genId(), role: "assistant", kind: "narration", text: combatParse.narration, speakerId }]);
      startCombat(combatParse.combat.enemies);
      return;
    }
    const { narration, roll } = extractRoll(text);
    setLog((l) => [...l, { id: genId(), role: "assistant", kind: "narration", text: narration, speakerId }]);
    if (roll) setPendingRoll(roll);
  }

  async function retryLastCall() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const text = await generateNarration(systemPrompt, history);
      setHistory((h) => [...h, { role: "assistant", content: text }]);
      pushDMResult(text);
    } catch (e) {
      setError(e.message || "The Dungeon Master stumbled again — try once more.");
    } finally {
      setLoading(false);
    }
  }

  async function beginOpening() {
    setLoading(true);
    setError(null);
    const openingMsg = "[Begin the story now with a short, vivid opening scene. Include a MAP tag for the starting location. No ROLL or COMBAT tag yet.]";
    setHistory([{ role: "user", content: openingMsg }]);
    try {
      const text = await generateNarration(systemPrompt, [{ role: "user", content: openingMsg }]);
      setHistory((h) => [...h, { role: "assistant", content: text }]);
      pushDMResult(text);
    } catch (e) {
      setError(e.message || "The connection to the Dungeon Master faltered.");
    } finally {
      setLoading(false);
    }
  }

  async function sendAction(actionText) {
    const trimmed = actionText.trim();
    if (!trimmed || loading || pendingRoll || combat || campaignEnded) return;
    const newHistory = [...history, { role: "user", content: trimmed }];
    setLog((l) => [...l, { id: genId(), role: "user", kind: "action", text: trimmed }]);
    setHistory(newHistory);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const text = await generateNarration(systemPrompt, newHistory);
      setHistory((h) => [...h, { role: "assistant", content: text }]);
      pushDMResult(text);
    } catch (e) {
      setError(e.message || "The connection to the Dungeon Master faltered.");
    } finally {
      setLoading(false);
    }
  }

  function travelTo(exit) {
    if (loading || pendingRoll || combat || campaignEnded) return;
    const phrase = exit.direction && KNOWN_DIRECTIONS_DISPLAY[exit.direction]
      ? `I head ${KNOWN_DIRECTIONS_DISPLAY[exit.direction]} to ${exit.name}.`
      : `I make my way to ${exit.name}.`;
    sendAction(phrase);
  }

  async function requestHint() {
    if (loading || pendingRoll || combat || campaignEnded) return;
    const hintMsg = "[The player wants a hint. Give 2-3 short, concrete suggestions for what they could try right now. No ROLL or COMBAT tag.]";
    const newHistory = [...history, { role: "user", content: hintMsg }];
    setHistory(newHistory);
    setLoading(true);
    setError(null);
    try {
      const text = await generateNarration(systemPrompt, newHistory);
      setHistory((h) => [...h, { role: "assistant", content: text }]);
      const { narration } = extractRoll(text);
      setLog((l) => [...l, { id: genId(), kind: "hint", text: narration }]);
    } catch (e) {
      setError(e.message || "The connection to the Dungeon Master faltered.");
    } finally {
      setLoading(false);
    }
  }

  async function ensureWorldTheme() {
    const worldLine = storyPref?.world?.trim();
    if (!worldLine) return; // no world described — keep the default palette
    const prompt = `World: ${worldLine}

Suggest a UI accent color palette (hex colors) that captures this world's mood — e.g. a grimdark sci-fi war might suggest blood-red and gunmetal, a vibrant creature-collecting adventure might suggest bright blue and gold, a pirate world might suggest teal and brass.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"accent":"#hexcolor","accentBright":"#hexcolor","accentMid":"#hexcolor","accentDark":"#hexcolor"}

"accent" is the primary UI color (used for text highlights, borders, buttons). "accentBright" is a lighter/brighter version, "accentMid" a middle tone, "accentDark" a darker/deeper version — think of them as one coherent color ramp, light to dark, not four different colors.`;
    try {
      const parsed = await generateJSON("You output only valid JSON, nothing else.", prompt, { maxTokens: 200 });
      const hexOk = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v.trim());
      if (!hexOk(parsed.accent) || !hexOk(parsed.accentBright) || !hexOk(parsed.accentMid) || !hexOk(parsed.accentDark)) return;
      setWorldTheme(parsed);
    } catch {
      // Theming is a nice-to-have — silently keep the default palette on any failure
    }
  }

  async function reflavorGear() {
    if (!character.gear.length) return;
    const worldLine = storyPref?.world?.trim();
    if (!worldLine) return; // nothing to reflavor against — keep plain D&D names
    const prompt = `World: ${worldLine}

Rename each item below to fit that world's flavor (weapons/gear from its aesthetic — e.g. a Longbow in a Warhammer 40k-style world might become a "Lasgun"). Keep the SAME item in the SAME order, just reflavored.

Items: ${character.gear.join(", ")}

Respond with ONLY a JSON array, no other text, in this exact shape:
[{"name":"World-flavored name","desc":"Functions as: original D&D name"}]`;
    try {
      const parsed = await generateJSON("You output only valid JSON, nothing else.", prompt, { maxTokens: 400, extractPattern: /\[[\s\S]*\]/ });
      if (!Array.isArray(parsed) || parsed.length !== character.gear.length) return;
      const cleaned = parsed.map((it, i) => ({ name: it.name || character.gear[i], desc: it.desc || "" }));
      setInventory(cleaned);
    } catch {
      // Reflavoring is a nice-to-have — silently keep the plain D&D names on any failure
    }
  }

  async function ensurePortrait() {
    if (portrait || portraitLoading) return;
    setPortraitLoading(true);
    setPortraitError(null);
    const prompt = `Write a vivid physical portrait of a Dungeons & Dragons character, 3-4 sentences, second person ("You..."). Cover their appearance, bearing, and one distinguishing feature or accessory. No meta-commentary, just the portrait itself.

Species: ${character.race}
Class: ${character.class}
Background: ${character.background}
Personality: ${character.traits.personality || "unspecified"}
${character.customStory ? `Backstory (in their own words): ${character.customStory}` : ""}`;
    try {
      const text = (await generateNarration("You write short, vivid D&D character portraits. Second person, 3-4 sentences, no meta-commentary.", [{ role: "user", content: prompt }], 250)).trim();
      if (!text) throw new Error("empty");
      setPortrait(text);
    } catch {
      setPortraitError("The Dungeon Master couldn't quite picture you this time — try again.");
    } finally {
      setPortraitLoading(false);
    }
  }

  async function ensurePortraitImage() {
    if (portraitImageLoading) return;
    setPortraitImageLoading(true);
    setPortraitImageError(null);
    const prompt = `Fantasy character portrait illustration, digital painting style, dramatic lighting, no text or watermarks. A ${character.race} ${character.class} with a ${character.background} background. ${character.traits.personality ? `Personality: ${character.traits.personality}.` : ""} ${portrait ? `Appearance notes: ${portrait}` : ""} ${character.customStory ? `Background story: ${character.customStory}` : ""}`.trim();
    try {
      // If we already have a portrait, use it as a reference so a re-roll
      // refines the same character instead of generating a different person.
      const dataUrl = await generateImage(prompt, portraitImage || null);
      setPortraitImage(dataUrl);
    } catch (e) {
      setPortraitImageError(e.message || "Couldn't generate an image that time — try again.");
    } finally {
      setPortraitImageLoading(false);
    }
  }

  async function ensureSceneImage() {
    if (!mapData || sceneImageLoading) return;
    setSceneImageLoading(true);
    setSceneImageError(null);
    const prompt = `Fantasy scene illustration, digital painting style, atmospheric, no text or watermarks. ${mapData.current.name}. ${mapData.current.desc || ""}`.trim();
    try {
      // Reference the character's own portrait (if generated) so they look
      // like the same person if/when they appear in scene illustrations.
      const dataUrl = await generateImage(prompt, portraitImage || null);
      setSceneImage(dataUrl);
    } catch (e) {
      setSceneImageError(e.message || "Couldn't generate an image that time — try again.");
    } finally {
      setSceneImageLoading(false);
    }
  }

  async function resolveRoll() {
    if (!pendingRoll || rollingValue !== null) return;
    const roll = pendingRoll;

    let ticks = 0;
    const anim = setInterval(() => {
      setRollingValue(1 + Math.floor(Math.random() * 20));
      ticks++;
      if (ticks > 10) clearInterval(anim);
    }, 55);
    await new Promise((r) => setTimeout(r, 650));
    clearInterval(anim);

    const raw = rollD20();
    setRollingValue(raw);
    await new Promise((r) => setTimeout(r, 400));

    const abilityMod = mod(charLevel.abilityScores[roll.ability]);
    const proficient = character.skills.some((s) => s.toLowerCase() === roll.skill.toLowerCase());
    const profBonus = proficient ? charLevel.proficiencyBonus : 0;
    const total = raw + abilityMod + profBonus;
    const outcome = roll.dc ? (total >= roll.dc ? "Success" : "Failure") : null;
    const crit = raw === 20 ? " — Natural 20!" : raw === 1 ? " — Natural 1..." : "";
    const resultText = `${roll.skill} (${ABILITY_NAMES[roll.ability]}): d20 ${raw} ${fmtMod(abilityMod)}${profBonus ? ` ${fmtMod(profBonus)} prof` : ""} = ${total}${roll.dc ? ` vs DC ${roll.dc} — ${outcome}` : ""}${crit}`;

    setLog((l) => [...l, { id: genId(), kind: "roll", text: resultText }]);
    setPendingRoll(null);
    setRollingValue(null);

    const followUp = `[Roll result — ${resultText}. Continue the story based on this outcome and narrate the consequence. Do not restate the numbers.]`;
    const newHistory = [...history, { role: "user", content: followUp }];
    setHistory(newHistory);
    setLoading(true);
    try {
      const text = await generateNarration(systemPrompt, newHistory);
      setHistory((h) => [...h, { role: "assistant", content: text }]);
      pushDMResult(text);
    } catch (e) {
      setError(e.message || "The connection to the Dungeon Master faltered.");
    } finally {
      setLoading(false);
    }
  }

  /* ----------------------------- Combat lifecycle ----------------------------- */

  async function animateDice(actor, label) {
    setDiceAnim({ actor, label, value: null });
    await new Promise((resolve) => {
      let ticks = 0;
      const iv = setInterval(() => {
        setDiceAnim({ actor, label, value: 1 + Math.floor(Math.random() * 20) });
        ticks++;
        if (ticks > 7) { clearInterval(iv); resolve(); }
      }, 60);
    });
  }

  function startCombat(enemiesData) {
    const enemies = enemiesData.map((e, i) => ({
      id: `enemy-${i}`,
      name: e.name || `Enemy ${i + 1}`,
      isPlayer: false,
      hp: Math.max(1, e.hp || 6),
      maxHp: Math.max(1, e.hp || 6),
      ac: e.ac || 12,
      attackBonus: typeof e.attackBonus === "number" ? e.attackBonus : 3,
      damageDice: e.damage || "1d6",
      alive: true,
      initiative: rollD20() + 2,
      portraitUrl: null,
      portraitLoading: false,
      portraitError: false,
    }));
    const profile = getPlayerAttackProfile(charLevel, equippedWeapon);
    const player = {
      id: "player", name: character.name, isPlayer: true,
      hp: currentHp, maxHp: charLevel.hp, ac: character.ac,
      attackBonus: profile.attackBonus, damageDice: profile.damageDice, damageMod: profile.damageMod,
      weaponName: profile.weaponName, alive: true,
      initiative: rollD20() + mod(charLevel.abilityScores.dex) + (character.background === "Criminal" ? charLevel.proficiencyBonus : 0),
    };
    // Recruited companions with HP remaining join the fight too — they act on
    // their own turn (see companionTurn) but, deliberately, enemies still only
    // ever target the player (see docs/COMPANIONS.md for why that's scoped
    // out for now rather than guessed at).
    const activeCompanions = companions
      .filter((n) => (n.companionStats?.hp ?? 0) > 0)
      .map((n) => ({
        id: `companion-${n.id}`, name: n.name, isPlayer: false, isCompanion: true,
        hp: n.companionStats.hp, maxHp: n.companionStats.maxHp, ac: n.companionStats.ac,
        attackBonus: n.companionStats.attackBonus, damageDice: n.companionStats.damage,
        alive: true, initiative: rollD20() + 1,
        portraitUrl: n.portraitUrl || null, portraitLoading: false, portraitError: false,
      }));
    const order = [player, ...enemies, ...activeCompanions].sort((a, b) => b.initiative - a.initiative);
    setLog((l) => [...l, { id: genId(), kind: "combat-start", text: order.map((c) => c.name).join(" → ") }]);
    setSpellSlotsUsed(0);
    setCombat({ round: 1, order, turnIndex: 0, ended: false });
  }

  function updateCombatant(id, patch) {
    setCombat((prev) => {
      if (!prev) return prev;
      const order = prev.order.map((c) => (c.id === id ? { ...c, ...patch } : c));
      return { ...prev, order };
    });
  }

  function advanceTurn() {
    setCombat((prev) => {
      if (!prev) return prev;
      let idx = prev.turnIndex;
      let round = prev.round;
      const alive = prev.order.filter((c) => c.alive);
      if (alive.length === 0) return prev;
      do {
        idx++;
        if (idx >= prev.order.length) { idx = 0; round++; }
      } while (!prev.order[idx].alive);
      return { ...prev, turnIndex: idx, round };
    });
  }

  const [extraAttackUsed, setExtraAttackUsed] = useState(false);
  useEffect(() => {
    if (combat && combat.order[combat.turnIndex]?.isPlayer) setExtraAttackUsed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat?.turnIndex]);

  async function playerAttack(targetId, useCantrip) {
    if (!combat || combat.ended || diceAnim) return;
    const current = combat.order[combat.turnIndex];
    if (!current || !current.isPlayer) return;
    const target = combat.order.find((c) => c.id === targetId);
    if (!target || !target.alive) return;

    const profile = useCantrip ? getPlayerCantripProfile(charLevel) : { attackBonus: current.attackBonus, damageDice: current.damageDice, damageMod: current.damageMod };
    await animateDice("player", `${current.name} ${useCantrip ? "casts a cantrip at" : "attacks"} ${target.name}`);
    const raw = rollD20();
    setDiceAnim({ actor: "player", label: `${current.name} ${useCantrip ? "casts a cantrip at" : "attacks"} ${target.name}`, value: raw });
    await new Promise((r) => setTimeout(r, 500));

    const total = raw + profile.attackBonus;
    const hit = total >= target.ac;
    let dmg = 0;
    let savageNote = "";
    if (hit) {
      let d = rollDiceExpr(profile.damageDice);
      if (!useCantrip && character.background === "Soldier") {
        const d2 = rollDiceExpr(profile.damageDice);
        if (d2.total > d.total) d = d2;
        savageNote = " (Savage Attacker)";
      }
      dmg = d.total + (profile.damageMod || 0);
    }
    const label = useCantrip ? "Cantrip" : "Attack";
    const crit = raw === 20 ? " — Natural 20!" : raw === 1 ? " — Natural 1..." : "";
    const grantsExtra = !useCantrip && charLevel.hasExtraAttack && !extraAttackUsed;
    const text = hit
      ? `${label} vs ${target.name}: d20 ${raw} ${fmtMod(profile.attackBonus)} = ${total} vs AC ${target.ac} — HIT for ${dmg} damage${savageNote}${crit}${grantsExtra ? " (Extra Attack — go again!)" : ""}`
      : `${label} vs ${target.name}: d20 ${raw} ${fmtMod(profile.attackBonus)} = ${total} vs AC ${target.ac} — MISS${crit}${grantsExtra ? " (Extra Attack — go again!)" : ""}`;
    setLog((l) => [...l, { id: genId(), kind: "combat", text }]);
    setDiceAnim(null);

    const newHp = Math.max(0, target.hp - dmg);
    updateCombatant(target.id, { hp: newHp, alive: newHp > 0 });
    if (grantsExtra) {
      setExtraAttackUsed(true);
    } else {
      advanceTurn();
    }
  }

  async function playerCastSpell(targetId) {
    if (!combat || combat.ended || diceAnim) return;
    const current = combat.order[combat.turnIndex];
    if (!current || !current.isPlayer) return;
    const target = combat.order.find((c) => c.id === targetId);
    if (!target || !target.alive) return;
    if (spellSlotsUsed >= charLevel.spellSlotsMax) return;

    const cantripProfile = getPlayerCantripProfile(charLevel);
    await animateDice("player", `${current.name} casts a spell at ${target.name}`);
    const raw = rollD20();
    setDiceAnim({ actor: "player", label: `${current.name} casts a spell at ${target.name}`, value: raw });
    await new Promise((r) => setTimeout(r, 500));

    const total = raw + cantripProfile.attackBonus;
    const hit = total >= target.ac;
    const dmg = hit ? rollDiceExpr(`${1 + Math.floor(level / 5)}d8`).total : 0;
    const crit = raw === 20 ? " — Natural 20!" : raw === 1 ? " — Natural 1..." : "";
    const text = hit
      ? `Spell vs ${target.name}: d20 ${raw} ${fmtMod(cantripProfile.attackBonus)} = ${total} vs AC ${target.ac} — HIT for ${dmg} damage${crit}`
      : `Spell vs ${target.name}: d20 ${raw} ${fmtMod(cantripProfile.attackBonus)} = ${total} vs AC ${target.ac} — MISS${crit}`;
    setLog((l) => [...l, { id: genId(), kind: "combat", text }]);
    setDiceAnim(null);

    setSpellSlotsUsed((u) => u + 1);
    const newHp = Math.max(0, target.hp - dmg);
    updateCombatant(target.id, { hp: newHp, alive: newHp > 0 });
    advanceTurn();
  }

  async function playerHeal() {
    if (!combat || combat.ended || diceAnim) return;
    const current = combat.order[combat.turnIndex];
    if (!current || !current.isPlayer) return;
    await animateDice("player", `${current.name} uses a Healer's Kit`);
    const heal = rollDiceExpr("1d6+2").total;
    setDiceAnim(null);
    const newHp = Math.min(current.maxHp, current.hp + heal);
    updateCombatant(current.id, { hp: newHp });
    setCurrentHp(newHp);
    setLog((l) => [...l, { id: genId(), kind: "combat", text: `Healer's Kit: restored ${heal} HP (${newHp}/${current.maxHp})` }]);
    advanceTurn();
  }

  async function enemyTurn(enemyId) {
    if (diceAnim) return;
    const enemySnapshot = combat?.order.find((c) => c.id === enemyId);
    const playerSnapshot = combat?.order.find((c) => c.isPlayer);
    if (!enemySnapshot || !playerSnapshot || !enemySnapshot.alive || !playerSnapshot.alive) return;

    await animateDice("enemy", `${enemySnapshot.name} attacks`);
    const raw = rollD20();
    setDiceAnim({ actor: "enemy", label: `${enemySnapshot.name} attacks`, value: raw });
    await new Promise((r) => setTimeout(r, 500));

    setCombat((prev) => {
      if (!prev) return prev;
      const enemy = prev.order.find((c) => c.id === enemyId);
      const player = prev.order.find((c) => c.isPlayer);
      if (!enemy || !player || !enemy.alive || !player.alive) return prev;

      const total = raw + enemy.attackBonus;
      const hit = total >= player.ac;
      let dmg = 0;
      if (hit) dmg = rollDiceExpr(enemy.damageDice).total;
      const crit = raw === 20 ? " — Natural 20!" : raw === 1 ? " — Natural 1..." : "";
      const text = hit
        ? `${enemy.name} attacks: d20 ${raw} ${fmtMod(enemy.attackBonus)} = ${total} vs AC ${player.ac} — HIT for ${dmg} damage${crit}`
        : `${enemy.name} attacks: d20 ${raw} ${fmtMod(enemy.attackBonus)} = ${total} vs AC ${player.ac} — MISS${crit}`;
      setLog((l) => [...l, { id: genId(), kind: "combat", text }]);

      const newHp = Math.max(0, player.hp - dmg);
      setCurrentHp(newHp);
      const order = prev.order.map((c) => (c.isPlayer ? { ...c, hp: newHp, alive: newHp > 0 } : c));
      return { ...prev, order };
    });
    setDiceAnim(null);
    advanceTurn();
  }

  // A companion's turn: attacks a random living enemy. Deliberately does NOT
  // change who enemies target (still always the player — see enemyTurn) or
  // touch the win/loss conditions beyond excluding companions from the
  // "enemies alive" check above. Mirrors enemyTurn's exact structure so it's
  // easy to compare the two side by side.
  async function companionTurn(companionId) {
    if (diceAnim) return;
    const companionSnapshot = combat?.order.find((c) => c.id === companionId);
    const aliveEnemies = combat?.order.filter((c) => !c.isPlayer && !c.isCompanion && c.alive) || [];
    if (!companionSnapshot || !companionSnapshot.alive || aliveEnemies.length === 0) {
      advanceTurn();
      return;
    }
    const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];

    await animateDice("enemy", `${companionSnapshot.name} attacks ${target.name}`);
    const raw = rollD20();
    setDiceAnim({ actor: "enemy", label: `${companionSnapshot.name} attacks ${target.name}`, value: raw });
    await new Promise((r) => setTimeout(r, 500));

    setCombat((prev) => {
      if (!prev) return prev;
      const companion = prev.order.find((c) => c.id === companionId);
      const tgt = prev.order.find((c) => c.id === target.id);
      if (!companion || !tgt || !companion.alive || !tgt.alive) return prev;

      const total = raw + companion.attackBonus;
      const hit = total >= tgt.ac;
      let dmg = 0;
      if (hit) dmg = rollDiceExpr(companion.damageDice).total;
      const crit = raw === 20 ? " — Natural 20!" : raw === 1 ? " — Natural 1..." : "";
      const text = hit
        ? `${companion.name} attacks ${tgt.name}: d20 ${raw} ${fmtMod(companion.attackBonus)} = ${total} vs AC ${tgt.ac} — HIT for ${dmg} damage${crit}`
        : `${companion.name} attacks ${tgt.name}: d20 ${raw} ${fmtMod(companion.attackBonus)} = ${total} vs AC ${tgt.ac} — MISS${crit}`;
      setLog((l) => [...l, { id: genId(), kind: "combat", text }]);

      const newHp = Math.max(0, tgt.hp - dmg);
      const order = prev.order.map((c) => (c.id === tgt.id ? { ...c, hp: newHp, alive: newHp > 0 } : c));
      return { ...prev, order };
    });
    setDiceAnim(null);
    advanceTurn();
  }

  async function playerFlee() {
    if (!combat || combat.ended || diceAnim) return;
    const current = combat.order[combat.turnIndex];
    if (!current || !current.isPlayer) return;
    await animateDice("player", `${current.name} attempts to flee`);
    const raw = rollD20();
    setDiceAnim({ actor: "player", label: `${current.name} attempts to flee`, value: raw });
    await new Promise((r) => setTimeout(r, 500));
    setDiceAnim(null);

    const dexMod = mod(charLevel.abilityScores.dex);
    const total = raw + dexMod;
    const success = total >= 10;
    setLog((l) => [...l, { id: genId(), kind: "combat", text: `Attempt to flee: d20 ${raw} ${fmtMod(dexMod)} = ${total} vs DC 10 — ${success ? "Escaped!" : "Failed to escape"}` }]);
    if (success) {
      endCombat("fled");
    } else {
      advanceTurn();
    }
  }

  async function endCombat(result) {
    setCombat((prev) => {
      if (!prev) return prev;
      const player = prev.order.find((c) => c.isPlayer);
      let finalHp = player ? player.hp : currentHp;
      if (result === "defeat") finalHp = 1; // stabilized, not permadeath
      setCurrentHp(finalHp);

      // Carry companion HP forward into the registry so damage taken this
      // fight persists (they don't full-heal between encounters), and so a
      // companion reduced to 0 sits out of the next fight instead of
      // silently reappearing at full health.
      const endedCompanions = prev.order.filter((c) => c.isCompanion);
      if (endedCompanions.length) {
        setNpcRegistry((reg) => {
          let next = reg;
          endedCompanions.forEach((c) => {
            const npcId = c.id.replace(/^companion-/, "");
            if (next[npcId]?.companionStats) {
              next = { ...next, [npcId]: { ...next[npcId], companionStats: { ...next[npcId].companionStats, hp: c.hp } } };
            }
          });
          return next;
        });
      }

      let summary;
      if (result === "victory") {
        summary = `Combat resolved — victory. All enemies defeated. Player HP remaining: ${finalHp}/${charLevel.hp}.`;
        const defeatedXp = prev.order
          .filter((c) => !c.isPlayer && !c.isCompanion)
          .reduce((sum, e) => sum + Math.round(e.maxHp * 4 + e.ac * 3 + e.attackBonus * 5), 0);
        if (defeatedXp > 0) awardXp(defeatedXp, "victory in battle");
      }
      else if (result === "defeat") summary = `Combat resolved — the player was knocked unconscious and has been stabilized at 1 HP by fortune or an ally.`;
      else summary = `Combat resolved — the player fled the fight successfully. Player HP remaining: ${finalHp}/${charLevel.hp}.`;

      (async () => {
        const followUp = `[${summary} Narrate the aftermath briefly. No COMBAT tag.]`;
        const newHistory = [...history, { role: "user", content: followUp }];
        setHistory(newHistory);
        setLoading(true);
        try {
          const text = await generateNarration(systemPrompt, newHistory);
          setHistory((h) => [...h, { role: "assistant", content: text }]);
          pushDMResult(text);
        } catch (e) {
          setError(e.message || "The connection to the Dungeon Master faltered.");
        } finally {
          setLoading(false);
        }
      })();

      return { ...prev, ended: true };
    });
    setTimeout(() => setCombat(null), 300);
  }

  return (
    <div className="min-h-screen w-full tx-cream relative flex flex-col scene-bg screen-transition" style={{ fontFamily: "'EB Garamond', serif" }}>
      <style>{GLOBAL_STYLE}</style>
      <Atmosphere />
      <div className="vignette-layer" />

      {/* Top bar */}
      <div className="relative z-10 border-b bd-brown bg-ink-75 glass-panel px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="display-font text-base tx-gold leading-tight">{character.name}</div>
            <div className="text-xs tx-cream-92">{character.race} {character.class}</div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className={`flex items-center gap-1 ${currentHp <= charLevel.hp * 0.25 ? "tx-red" : currentHp <= charLevel.hp * 0.5 ? "tx-gold" : "tx-cream"}`}><Sword size={13}/> {currentHp}/{charLevel.hp}</div>
            <div className="flex items-center gap-1"><Shield size={13} className="tx-gold"/> {character.ac}</div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => setShowItems(true)} title="Items" className="w-7 h-7 rounded-full border bd-brown hover-bd-gold flex items-center justify-center"><Package size={13}/></button>
          <button onClick={() => setShowJournal(true)} title="Journal" className="w-7 h-7 rounded-full border bd-brown hover-bd-gold flex items-center justify-center"><Scroll size={13}/></button>
          <button onClick={toggleAudio} title={audioOn ? "Mute ambience & narration" : "Enable ambience & narration read-aloud"} className="w-7 h-7 rounded-full border bd-brown hover-bd-gold flex items-center justify-center">
            {audioOn ? <Volume2 size={13}/> : <VolumeX size={13}/>}
          </button>
          <button onClick={exportRecap} title="Download adventure recap" className="w-7 h-7 rounded-full border bd-brown hover-bd-gold flex items-center justify-center"><Download size={13}/></button>
          {onExit && (
            <button
              onClick={() => !combat && onExit()}
              disabled={!!combat}
              title={combat ? "Finish or flee combat first" : "Save and return to title"}
              className="w-7 h-7 rounded-full border bd-brown hover-bd-gold flex items-center justify-center disabled:opacity-30"
            >
              <LogOut size={13}/>
            </button>
          )}
        </div>
      </div>

      {/* Mobile-only tab selector — desktop shows all three panels side by side instead */}
      <div className="lg:hidden relative z-10 flex border-b bd-brown bg-ink-75">
        {[{ id: "story", label: "Story", Icon: Feather }, { id: "map", label: "Map", Icon: MapPin }, { id: "sheet", label: "Sheet", Icon: User }].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); if (id === "sheet") ensurePortrait(); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs border-b-2 ${activeTab === id ? "tx-gold border-current" : "tx-cream-90 border-transparent"}`}
          >
            <Icon size={13}/> {label}
          </button>
        ))}
      </div>

      {/* Main content: story (left) / map (center) / character sheet (right) — stacked as tabs below lg */}
      <div className="relative z-10 flex-1 flex overflow-hidden">

      {/* Chat log */}
      <div className={`${activeTab === "story" ? "flex" : "hidden"} lg:flex flex-col flex-1 min-w-0 overflow-y-auto px-4 py-5 space-y-4 pb-40`}>
        {log.map((m) => {
          if (m.kind === "narration") {
            const speakerNpc = m.speakerId ? npcRegistry[m.speakerId] : null;
            return (
              <div key={m.id} className="parchment-card rounded-2xl p-4 fade-up flex gap-3">
                <SpeakerAvatar imageUrl={speakerNpc?.portraitUrl} loading={speakerNpc?.portraitLoading} fallback={<Scroll size={14} />} />
                <div className="min-w-0 flex-1">
                  {speakerNpc && (
                    <p className="text-xs tx-gold-lt mb-1 tracking-wide flex items-center gap-1.5">
                      {speakerNpc.name}
                      {speakerNpc.disposition && speakerNpc.disposition !== "neutral" && (
                        <span className={`text-[10px] normal-case tracking-normal px-1.5 py-0.5 rounded-full border ${
                          speakerNpc.disposition === "friendly" ? "tx-gold bd-gold" : speakerNpc.disposition === "hostile" ? "tx-red bd-crimson" : "tx-cream-90 bd-brown"
                        }`}>{speakerNpc.disposition}</span>
                      )}
                    </p>
                  )}
                  <p className="narration-text text-[15px] leading-relaxed italic whitespace-pre-line tx-cream">{m.text}</p>
                </div>
              </div>
            );
          }
          if (m.kind === "action") {
            return (
              <div key={m.id} className="flex justify-end items-end gap-3 fade-up">
                <div className="bg-crimson-30 border bd-crimson-60 rounded-2xl px-4 py-2 max-w-[85%]">
                  <p className="text-sm tx-cream">{m.text}</p>
                </div>
                <SpeakerAvatar imageUrl={portraitImage} fallback={<User size={14} />} />
              </div>
            );
          }
          if (m.kind === "roll") {
            return (
              <div key={m.id} className="flex justify-center fade-up">
                <div className="flex items-center gap-2 text-xs mono-font tx-gold border bd-brown rounded-full px-3 py-1.5">
                  <Dices size={13}/> {m.text}
                </div>
              </div>
            );
          }
          if (m.kind === "combat-start") {
            return (
              <div key={m.id} className="flex justify-center fade-up">
                <div className="flex items-center gap-2 text-xs mono-font tx-red border bd-crimson rounded-full px-3 py-1.5">
                  <Swords size={13}/> Initiative: {m.text}
                </div>
              </div>
            );
          }
          if (m.kind === "combat") {
            return (
              <div key={m.id} className="flex justify-center fade-up">
                <div className="text-xs mono-font tx-cream border bd-brown rounded-xl px-3 py-1.5 max-w-[90%] text-center">
                  {m.text}
                </div>
              </div>
            );
          }
          if (m.kind === "xp") {
            return (
              <div key={m.id} className="flex justify-center fade-up">
                <div className="flex items-center gap-1.5 text-xs mono-font tx-gold border bd-gold rounded-full px-3 py-1">
                  <Sparkles size={12}/> {m.text}
                </div>
              </div>
            );
          }
          if (m.kind === "hint") {
            return (
              <div key={m.id} className="fade-up border border-dashed bd-gold-50 rounded-2xl p-4 bg-gold-5">
                <div className="flex items-center gap-2 mb-2 tx-gold">
                  <Lightbulb size={14}/>
                  <span className="text-xs display-font tracking-wide">A THOUGHT OCCURS TO YOU</span>
                </div>
                <p className="text-sm tx-cream whitespace-pre-line">{m.text}</p>
              </div>
            );
          }
          if (m.kind === "ending") {
            return (
              <div key={m.id} className="parchment-card corner-brackets rounded-2xl p-5 fade-up">
                <div className="text-center mb-3">
                  <p className="display-font tracking-widest gold-engraved text-lg">✦ THE END ✦</p>
                  <div className="ornate-divider max-w-[160px] mx-auto mt-2" />
                </div>
                <p className="narration-text text-[15px] leading-relaxed italic whitespace-pre-line tx-cream">{m.text}</p>
              </div>
            );
          }
          return null;
        })}

        {loading && (
          <div className="parchment-card rounded-2xl p-4 flex items-center gap-2 fade-up">
            <Feather size={14} className="tx-gold quill-write" />
            <span className="w-1.5 h-1.5 rounded-full bg-gold pulse-dot" />
            <span className="w-1.5 h-1.5 rounded-full bg-gold pulse-dot" style={{ animationDelay: "0.2s" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-gold pulse-dot" style={{ animationDelay: "0.4s" }} />
            <span className="text-xs tx-cream-92 italic ml-1">the Dungeon Master weaves the next thread...</span>
          </div>
        )}

        {error && (
          <div className="border bd-crimson rounded-2xl p-4 flex items-start gap-2 fade-up">
            <AlertTriangle size={16} className="tx-red mt-0.5 shrink-0"/>
            <div>
              <p className="text-sm tx-cream">{error}</p>
              <button onClick={retryLastCall} className="text-xs tx-gold underline mt-1">Try again</button>
            </div>
          </div>
        )}

        {pendingRoll && (
          <div className="parchment-card rounded-2xl p-4 text-center fade-up">
            <p className="text-sm tx-cream mb-3">
              The Dungeon Master calls for a <span className="tx-gold">{pendingRoll.skill}</span> check ({ABILITY_NAMES[pendingRoll.ability]}){pendingRoll.dc ? <> — DC {pendingRoll.dc}</> : null}
            </p>
            <button onClick={resolveRoll} disabled={rollingValue !== null} className="mx-auto flex items-center gap-2 btn-gold tx-ink2 rounded-xl px-5 py-2.5 display-font tracking-wide text-sm disabled:opacity-70">
              <Dices size={16}/> {rollingValue !== null ? rollingValue : "Roll d20"}
            </button>
          </div>
        )}

        {combat && !combat.ended && (
          <div className="parchment-card rounded-2xl p-4 fade-up bd-crimson-60">
            <div className="flex items-center gap-2 mb-3 tx-red">
              <Swords size={16}/>
              <span className="display-font text-sm tracking-wide">ROUND {combat.round}</span>
            </div>

            <div className="space-y-2 mb-4">
              {combat.order.map((c, i) => (
                <div key={c.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${i === combat.turnIndex ? "bg-crimson-25 border bd-crimson" : "bg-ink-30"} ${!c.alive ? "opacity-40" : ""}`}>
                  <SpeakerAvatar imageUrl={c.isPlayer ? portraitImage : c.portraitUrl} loading={c.portraitLoading} fallback={c.isPlayer ? <Shield size={14} className="tx-gold"/> : c.isCompanion ? <User size={14} className="tx-gold-mid"/> : <Sword size={14} className="tx-cream-95"/>} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs">
                      <span className="tx-cream truncate">{c.name}{!c.alive ? " (down)" : ""}</span>
                      <span className="mono-font tx-gold">{c.hp}/{c.maxHp}</span>
                    </div>
                    <div className="w-full h-1.5 bg-ink rounded-full mt-1 overflow-hidden">
                      <div className={`h-full hp-fill ${c.hp / c.maxHp > 0.5 ? "bg-hp-good" : c.hp / c.maxHp > 0.25 ? "bg-hp-mid" : "bg-hp-low"}`} style={{ width: `${Math.max(0, (c.hp / c.maxHp) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {diceAnim ? (
              <div className={`rounded-2xl p-4 text-center border ${diceAnim.actor === "player" ? "bg-gold-5 bd-gold" : "bg-crimson-25 bd-crimson"}`}>
                <p className={`text-xs mb-2 ${diceAnim.actor === "player" ? "tx-gold" : "tx-red"}`}>{diceAnim.label}</p>
                <div className={`mx-auto w-14 h-14 rounded-xl border-2 flex items-center justify-center display-font text-2xl ${diceAnim.actor === "player" ? "bd-gold tx-gold" : "bd-crimson tx-red"}`}>
                  {diceAnim.value !== null ? diceAnim.value : <Dices size={22} className="animate-spin" />}
                </div>
              </div>
            ) : combat.order[combat.turnIndex]?.isPlayer && combat.order[combat.turnIndex]?.alive ? (
              <div className="space-y-2">
                <p className="text-xs tx-cream-92 text-center mb-1">Your turn — choose a target</p>
                {combat.order.filter((c) => !c.isPlayer && !c.isCompanion && c.alive).map((enemy) => (
                  <div key={enemy.id} className="flex gap-2 flex-wrap">
                    <button onClick={() => playerAttack(enemy.id, false)} className="flex-1 flex items-center justify-center gap-1 btn-gold tx-ink2 rounded-xl py-2 text-xs display-font min-w-[45%]">
                      <Sword size={13}/> Attack {enemy.name}
                    </button>
                    {getCantripAbility(charLevel) && (
                      <button onClick={() => playerAttack(enemy.id, true)} className="flex-1 flex items-center justify-center gap-1 border bd-gold tx-gold rounded-xl py-2 text-xs display-font min-w-[45%]">
                        <Sparkles size={13}/> Cantrip
                      </button>
                    )}
                    {charLevel.spellSlotsMax > 0 && spellSlotsUsed < charLevel.spellSlotsMax && (
                      <button onClick={() => playerCastSpell(enemy.id)} className="flex-1 flex items-center justify-center gap-1 border bd-crimson tx-red rounded-xl py-2 text-xs display-font min-w-[45%]">
                        <Sparkles size={13}/> Cast Spell ({charLevel.spellSlotsMax - spellSlotsUsed} left)
                      </button>
                    )}
                  </div>
                ))}
                {character.background === "Hermit" && (
                  <button onClick={playerHeal} className="w-full flex items-center justify-center gap-1 text-xs border bd-gold tx-gold rounded-xl py-2">
                    <Heart size={13}/> Use Healer's Kit
                  </button>
                )}
                <button onClick={playerFlee} className="w-full flex items-center justify-center gap-1 text-xs tx-cream-95 border bd-brown rounded-xl py-2 mt-1">
                  <Wind size={13}/> Attempt to flee
                </button>
              </div>
            ) : (
              <div className="rounded-2xl p-4 text-center border bd-crimson bg-crimson-25">
                <p className="text-xs tx-red italic">{combat.order[combat.turnIndex]?.name} is taking their turn...</p>
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Map column */}
      <div className={`${activeTab === "map" ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-72 lg:shrink-0 lg:border-l bd-brown overflow-y-auto pb-40`}>
        <div key={activeTab === "map" ? "map-active" : "map-idle"} className="drawer-transition">
          <MapPanel mapData={mapData} onTravel={travelTo} disabled={loading || !!pendingRoll || !!combat || campaignEnded} sceneImage={sceneImage} sceneImageLoading={sceneImageLoading} sceneImageError={sceneImageError} onIllustrate={ensureSceneImage} autoIllustrate={autoIllustrate} onToggleAutoIllustrate={setAutoIllustrate} />
        </div>
      </div>

      {/* Character sheet column */}
      <div className={`${activeTab === "sheet" ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-80 lg:shrink-0 lg:border-l bd-brown overflow-y-auto pb-40`}>
        <div key={activeTab === "sheet" ? "sheet-active" : "sheet-idle"} className="drawer-transition">
          <CharacterSheetPanel character={charLevel} currentHp={currentHp} portrait={portrait} portraitLoading={portraitLoading} portraitError={portraitError} onGeneratePortrait={ensurePortrait} portraitImage={portraitImage} portraitImageLoading={portraitImageLoading} portraitImageError={portraitImageError} onGeneratePortraitImage={ensurePortraitImage} spellSlotsUsed={spellSlotsUsed} companions={companions} quests={activeQuestList} availableWeapons={availableWeapons} equippedWeapon={equippedWeapon} onEquipWeapon={setEquippedWeapon} />
        </div>
      </div>

      </div>

      {/* Input bar / epilogue panel */}
      {campaignEnded ? (
        <div className="fixed bottom-0 left-0 right-0 bg-ink-85 glass-panel border-t bd-brown px-4 py-3 z-10">
          <div className="max-w-xl mx-auto flex gap-2">
            <button onClick={exportRecap} title="Download adventure recap" className="border bd-brown hover-bd-gold tx-cream-90 rounded-xl px-3 flex items-center justify-center shrink-0">
              <Download size={16}/>
            </button>
            <button onClick={() => setCampaignEnded(false)} className="flex-1 border bd-gold tx-gold rounded-xl py-2.5 text-sm display-font">
              Continue Anyway
            </button>
            {onExit && (
              <button onClick={onExit} className="flex-1 btn-crimson rounded-xl py-2.5 text-sm tx-cream-lt display-font">
                Return to Title
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 bg-ink-85 glass-panel border-t bd-brown px-4 py-3 z-10">
          <div className="max-w-xl mx-auto flex gap-2">
            <button
              onClick={requestHint}
              disabled={loading || !!pendingRoll || !!combat}
              title="Not sure what to do? Get a hint."
              className="w-11 h-11 rounded-xl border bd-brown hover-bd-gold tx-gold flex items-center justify-center disabled:opacity-30 shrink-0"
            >
              <Lightbulb size={16}/>
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendAction(input); }}
              disabled={loading || !!pendingRoll || !!combat}
              placeholder={combat ? "Combat in progress — use the actions above" : pendingRoll ? "Resolve the roll above first..." : "What do you do?"}
              className="flex-1 bg-ink-60 border bd-brown focus-bd-gold rounded-xl px-4 py-2.5 text-sm outline-none tx-cream ph-cream disabled:opacity-50"
            />
            {isVoiceInputSupported() && (
              <button
                onClick={handleMicClick}
                disabled={loading || !!pendingRoll || !!combat}
                title={listening ? "Listening… tap to stop" : "Speak your action"}
                className={`w-11 h-11 rounded-xl border flex items-center justify-center disabled:opacity-30 shrink-0 ${listening ? "bd-crimson bg-crimson-25 tx-red" : "bd-brown hover-bd-gold tx-cream-90"}`}
              >
                <Mic size={16}/>
              </button>
            )}
            <button
              onClick={() => sendAction(input)}
              disabled={loading || !!pendingRoll || !!combat || !input.trim()}
              className="w-11 h-11 rounded-xl btn-gold tx-ink2 flex items-center justify-center disabled:opacity-30 shrink-0"
            >
              {loading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
            </button>
          </div>
        </div>
      )}

      {/* Level up modal */}
      {pendingLevelUp && (
        <LevelUpModal character={character} fromLevel={level} toLevel={pendingLevelUp} currentAbilityScores={charLevel.abilityScores} onConfirm={resolveLevelUp} />
      )}

      {/* Journal drawer */}
      {showJournal && (
        <div className="fixed inset-0 z-20 overlay-dark glass-panel overlay-transition flex items-end sm:items-center sm:justify-center" onClick={() => setShowJournal(false)}>
          <div className="bg-ink border-t sm:border bd-brown rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto p-6 drawer-transition" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="display-font text-lg tx-gold flex items-center gap-2"><Scroll size={16}/> Journal</h3>
              <button onClick={() => setShowJournal(false)} className="tx-cream-92 hover-tx-gold"><X size={18}/></button>
            </div>
            {journal.length === 0 ? (
              <p className="text-sm tx-cream-90 italic">Nothing noteworthy yet — the story has just begun.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {journal.map((n) => (
                  <div key={n.id} className="parchment-card rounded-xl p-3">
                    <p className="text-[10px] tx-gold uppercase mb-1">Entry {n.turn}</p>
                    <p className="text-sm tx-cream-95">{n.text}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-2 border-t bd-brown">
              <input
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && manualNote.trim()) { setJournal((j) => [...j, { id: genId(), text: manualNote.trim(), turn: j.length + 1, manual: true }]); setManualNote(""); } }}
                placeholder="Add your own note..."
                className="flex-1 bg-ink-60 border bd-brown focus-bd-gold rounded-xl px-3 py-2 text-sm outline-none tx-cream ph-cream mt-2"
              />
              <button
                onClick={() => { if (manualNote.trim()) { setJournal((j) => [...j, { id: genId(), text: manualNote.trim(), turn: j.length + 1, manual: true }]); setManualNote(""); } }}
                className="w-10 h-10 mt-2 rounded-xl btn-gold tx-ink2 flex items-center justify-center shrink-0"
              >
                <Plus size={16}/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Items drawer */}
      {showItems && (
        <div className="fixed inset-0 z-20 overlay-dark glass-panel overlay-transition flex items-end sm:items-center sm:justify-center" onClick={() => setShowItems(false)}>
          <div className="bg-ink border-t sm:border bd-brown rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto p-6 drawer-transition" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="display-font text-lg tx-gold flex items-center gap-2"><Package size={16}/> Items</h3>
              <button onClick={() => setShowItems(false)} className="tx-cream-92 hover-tx-gold"><X size={18}/></button>
            </div>
            {inventory.length === 0 ? (
              <p className="text-sm tx-cream-90 italic">Your pack is empty.</p>
            ) : (
              <div className="space-y-2">
                {inventory.map((it, i) => (
                  <div key={`${it.name}-${i}`} className="parchment-card rounded-xl p-3">
                    <p className="text-sm tx-gold-lt">{it.name}</p>
                    {it.desc && <p className="text-xs tx-cream-92 italic mt-0.5">{it.desc}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
