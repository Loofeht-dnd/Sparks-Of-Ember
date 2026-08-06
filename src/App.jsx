import React, { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import { hasAnyProviderConfigured, initProviderConfigs } from "./services/providers.js";
import { loadGame, deleteGame, listSaveSlots, newSlotId } from "./services/saveManager.js";
import { resetWorldTheme } from "./utils/theme.js";

import ApiKeySetup from "./components/ApiKeySetup.jsx";
import TitleScreen from "./components/TitleScreen.jsx";
import CharacterCreator from "./components/CharacterCreator.jsx";
import StorySetup from "./components/StorySetup.jsx";
import GameScreen from "./components/GameScreen.jsx";

export default function DnDGame() {
  const [phase, setPhase] = useState("loading");
  const [character, setCharacter] = useState(null);
  const [storyPref, setStoryPref] = useState(null);
  const [resumeState, setResumeState] = useState(null);
  const [slots, setSlots] = useState([]);
  const [activeSlotId, setActiveSlotId] = useState(null);

  async function refreshSlots() {
    const list = await listSaveSlots();
    setSlots(list);
    return list;
  }

  useEffect(() => {
    (async () => {
      // Decrypt/migrate stored provider keys into the in-memory cache before
      // any screen (title, api-key setup) reads them synchronously.
      await initProviderConfigs();
      await refreshSlots();
      setPhase(hasAnyProviderConfigured() ? "title" : "apikey-setup");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleContinue(slotId) {
    const data = await loadGame(slotId);
    if (data && data.character) {
      setCharacter(data.character);
      setStoryPref(data.storyPref || null);
      setActiveSlotId(slotId);
      setResumeState({ log: data.log || [], history: data.history || [], currentHp: data.currentHp ?? data.character.hp, journal: data.journal || [], inventory: data.inventory || null, portrait: data.portrait || null, portraitImage: data.portraitImage || null, campaignEnded: !!data.campaignEnded, mapData: data.mapData || null, worldTheme: data.worldTheme || null, level: data.level || 1, xp: data.xp || 0, abilityBonuses: data.abilityBonuses || null, npcRegistry: data.npcRegistry || {}, questLog: data.questLog || {}, equippedWeapon: data.equippedWeapon || null, historySummary: data.historySummary || "" });
      setPhase("play");
    } else {
      setPhase("create");
    }
  }

  async function handleNew() {
    setActiveSlotId(slots.length === 0 ? "default" : newSlotId());
    setResumeState(null);
    setCharacter(null);
    setStoryPref(null);
    resetWorldTheme();
    setPhase("create");
  }

  async function handleDeleteSlot(slotId) {
    await deleteGame(slotId);
    await refreshSlots();
  }

  async function handleExitToTitle() {
    await refreshSlots();
    setCharacter(null);
    setStoryPref(null);
    setResumeState(null);
    setActiveSlotId(null);
    resetWorldTheme();
    setPhase("title");
  }

  if (phase === "loading") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center tx-gold" style={{ background: "#0d0b0e" }}>
        <Flame size={22} className="flicker-border" />
      </div>
    );
  }
  if (phase === "apikey-setup") {
    return <ApiKeySetup onSaved={() => setPhase("title")} />;
  }
  if (phase === "title") {
    return <TitleScreen slots={slots} onContinue={handleContinue} onNew={handleNew} onDeleteSlot={handleDeleteSlot} onChangeModel={() => setPhase("apikey-setup")} />;
  }
  if (phase === "create" || !character) {
    return <CharacterCreator onComplete={(c) => { setCharacter(c); setResumeState(null); setPhase("story"); }} />;
  }
  if (phase === "story") {
    return <StorySetup character={character} onComplete={(pref) => { setStoryPref(pref); setPhase("play"); }} />;
  }
  return <GameScreen character={character} storyPref={storyPref} initialState={resumeState} slotId={activeSlotId} onExit={handleExitToTitle} />;
}
