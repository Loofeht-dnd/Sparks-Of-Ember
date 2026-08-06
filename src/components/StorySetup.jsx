import React, { useState } from "react";
import { Flame } from "lucide-react";
import { STORY_TONES } from "../constants/story.js";
import { GLOBAL_STYLE } from "../styles/globalStyle.js";
import Atmosphere from "./Atmosphere.jsx";

export default function StorySetup({ character, onComplete }) {
  const [world, setWorld] = useState("");
  const [tones, setTones] = useState([]);
  const [details, setDetails] = useState("");

  const toggleTone = (g) => setTones((s) => (s.includes(g) ? s.filter((x) => x !== g) : [...s, g]));

  return (
    <div className="min-h-screen w-full tx-cream relative flex flex-col items-center justify-center px-6 scene-bg screen-transition" style={{ fontFamily: "'EB Garamond', serif" }}>
      <style>{GLOBAL_STYLE}</style>
      <Atmosphere />
      <div className="vignette-layer" />
      <div className="relative z-10 max-w-xl w-full">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Flame size={18} className="tx-gold-mid flicker-border" />
            <h1 className="display-font text-2xl font-bold tracking-widest gold-engraved">SET THE SCENE</h1>
            <Flame size={18} className="tx-gold-mid flicker-border" />
          </div>
          <p className="text-sm tx-cream-90 italic">{character.name}, what world do you want to adventure in?</p>
          <div className="ornate-divider max-w-[220px] mx-auto mt-3" />
        </div>

        <div className="parchment-card corner-brackets rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-sm tx-gold display-font tracking-wide mb-2">The world (this is the big one)</p>
            <p className="text-xs tx-cream-90 mb-2">
              Not just fantasy — go anywhere. A high-seas pirate world with wild elemental powers, a grimdark far-future war between empires, a region full of wild creatures to capture and train, a cyberpunk megacity, a cozy village sim — anything. Name a favorite anime/game/show as inspiration if that helps; the Dungeon Master will build an original world in that spirit rather than retelling it.
            </p>
            <textarea
              value={world}
              onChange={(e) => setWorld(e.target.value)}
              placeholder="A One Piece-style pirate world with Devil Fruit-like powers and rival crews sailing a Grand Line of strange islands..."
              rows={4}
              className="w-full bg-ink-60 border bd-brown focus-bd-gold rounded-xl px-3 py-2 text-sm outline-none tx-cream ph-cream resize-none"
            />
          </div>

          <div>
            <p className="text-sm tx-gold display-font tracking-wide mb-2">Tone (optional, pick any)</p>
            <div className="flex flex-wrap gap-2">
              {STORY_TONES.map((g) => (
                <button
                  key={g}
                  onClick={() => toggleTone(g)}
                  className={`text-xs px-3 py-2 rounded-xl border transition-all ${tones.includes(g) ? "bg-gold tx-ink bd-gold" : "bd-brown tx-cream-90"}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm tx-gold display-font tracking-wide mb-2">Anything else specific? (optional)</p>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="I want my character to start already part of a crew, and I want a rival who shows up early..."
              rows={3}
              className="w-full bg-ink-60 border bd-brown focus-bd-gold rounded-xl px-3 py-2 text-sm outline-none tx-cream ph-cream resize-none"
            />
          </div>

          <button onClick={() => onComplete({ world, tones, details })} className="w-full btn-crimson transition-colors rounded-xl py-3 display-font tracking-wider tx-cream-lt flicker-border">
            BEGIN THE SESSION
          </button>
        </div>
      </div>
    </div>
  );
}
