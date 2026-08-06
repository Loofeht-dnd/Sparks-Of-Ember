import React, { useState } from "react";
import { Clock, Trash2 } from "lucide-react";
import { PROVIDERS, getProviderConfig, isProviderActive } from "../services/providers.js";
import { GLOBAL_STYLE } from "../styles/globalStyle.js";
import { timeAgo } from "../utils/time.js";
import Atmosphere from "./Atmosphere.jsx";
import Campfire from "./Campfire.jsx";

export default function TitleScreen({ slots, onContinue, onNew, onDeleteSlot, onChangeModel }) {
  const [confirmDelete, setConfirmDelete] = useState(null); // slotId awaiting delete confirmation
  const activeLabels = Object.keys(PROVIDERS)
    .filter((id) => isProviderActive(id, getProviderConfig(id)))
    .map((id) => PROVIDERS[id].label);

  return (
    <div className="min-h-screen w-full tx-cream relative flex flex-col items-center justify-center px-6 py-10 scene-bg screen-transition" style={{ fontFamily: "'EB Garamond', serif" }}>
      <style>{GLOBAL_STYLE}</style>
      <Atmosphere />
      <div className="vignette-layer" />
      <div className="relative z-10 text-center max-w-sm w-full">
        <Campfire />
        <h1 className="display-font text-3xl font-bold tracking-widest gold-engraved mt-4">SPARKS OF EMBER</h1>
        <p className="text-sm tx-cream-95 italic mb-2">Pull up a seat. Every story starts around the fire.</p>
        <div className="ornate-divider max-w-[220px] mx-auto mb-8" />

        {slots.length > 0 && (
          <div className="space-y-3 mb-4">
            {slots.map((s) => (
              <div key={s.slotId} className="parchment-card corner-brackets rounded-2xl p-4 fade-up text-left">
                {s.completed && <p className="text-[10px] tx-gold uppercase tracking-widest mb-1 text-center">✦ Story Complete ✦</p>}
                <p className="display-font text-lg tx-cream mb-1">{s.name}</p>
                <p className="text-sm tx-cream-95 italic mb-1">Level {s.level} {s.race} {s.cls}</p>
                <p className="text-xs tx-cream-90 flex items-center gap-1 mb-3"><Clock size={11}/> Last played {timeAgo(s.timestamp)}</p>

                {confirmDelete === s.slotId ? (
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDelete(null)} className="flex-1 border bd-brown rounded-xl py-2 text-xs tx-cream">Cancel</button>
                    <button onClick={() => { onDeleteSlot(s.slotId); setConfirmDelete(null); }} className="flex-1 btn-crimson rounded-xl py-2 text-xs tx-cream-lt">Let It Burn Out</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => onContinue(s.slotId)} className="flex-1 btn-crimson transition-colors rounded-xl py-2 display-font text-sm tracking-wider tx-cream-lt flicker-border">
                      {s.completed ? "REVISIT" : "CONTINUE"}
                    </button>
                    <button onClick={() => setConfirmDelete(s.slotId)} className="border bd-brown rounded-xl px-3 tx-cream-90 hover-tx-red" title="Delete this story">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <button onClick={onNew} className="w-full btn-crimson transition-colors rounded-xl py-3 display-font tracking-wider tx-cream-lt flicker-border">
          BEGIN A NEW STORY
        </button>

        {onChangeModel && (
          <button onClick={onChangeModel} className="text-xs tx-cream-90 hover-tx-gold underline mt-6">
            {activeLabels.length ? `Running on: ${activeLabels.join(" → ")} — manage providers` : "Set up AI connection"}
          </button>
        )}
      </div>
    </div>
  );
}
