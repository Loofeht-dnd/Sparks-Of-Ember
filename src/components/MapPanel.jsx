import React from "react";
import { Image as ImageIcon, Loader2, MapPin } from "lucide-react";
import { COMPASS_CELL } from "../constants/map.js";

export default function MapPanel({ mapData, onTravel, disabled, sceneImage, sceneImageLoading, sceneImageError, onIllustrate, autoIllustrate, onToggleAutoIllustrate }) {
  if (!mapData) {
    return (
      <div className="p-4">
        <p className="text-sm tx-cream-90 italic text-center mt-8">The map will take shape once the Dungeon Master sets the scene.</p>
      </div>
    );
  }
  const compassExits = mapData.exits.filter((e) => COMPASS_CELL[e.direction]);
  const otherExits = mapData.exits.filter((e) => !COMPASS_CELL[e.direction]);

  return (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <p className="text-[10px] tx-gold uppercase tracking-widest mb-1">✦ You Are Here ✦</p>
        <h3 className="display-font text-lg tx-cream">{mapData.current.name}</h3>
        {mapData.current.desc && <p className="text-xs tx-cream-90 italic mt-1">{mapData.current.desc}</p>}
      </div>

      <div className="parchment-card corner-brackets rounded-2xl p-3">
        {sceneImage ? (
          <img src={sceneImage} alt={mapData.current.name} className="w-full rounded-xl" />
        ) : sceneImageLoading ? (
          <div className="aspect-video rounded-xl bg-ink flex items-center justify-center">
            <Loader2 size={20} className="tx-gold animate-spin" />
          </div>
        ) : (
          <div className="aspect-video rounded-xl bg-ink flex flex-col items-center justify-center gap-2 p-3 text-center">
            {sceneImageError && <p className="text-xs tx-red">{sceneImageError}</p>}
            <button onClick={onIllustrate} className="text-xs btn-gold tx-ink2 rounded-xl px-3 py-2 display-font flex items-center gap-1"><ImageIcon size={13}/> Illustrate This Scene</button>
          </div>
        )}
      </div>

      <button onClick={() => onToggleAutoIllustrate(!autoIllustrate)} className="w-full flex items-center justify-between text-xs tx-cream-90 px-1">
        <span>Auto-illustrate new locations</span>
        <span className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${autoIllustrate ? "bg-gold justify-end" : "bg-brown justify-start"}`}>
          <span className="w-4 h-4 rounded-full bg-ink block" />
        </span>
      </button>

      <div className="grid grid-cols-3 grid-rows-3 gap-2 aspect-square max-w-[280px] mx-auto">
        {compassExits.map((e) => (
          <button
            key={e.name}
            onClick={() => onTravel(e)}
            disabled={disabled}
            title={e.desc || e.name}
            className={`${COMPASS_CELL[e.direction]} parchment-card rounded-xl flex flex-col items-center justify-center p-1.5 text-center disabled:opacity-40 transition-all hover:scale-[1.03]`}
          >
            <span className="text-[9px] tx-gold uppercase tracking-wide">{e.direction}</span>
            <span className="text-[11px] tx-cream leading-tight mt-0.5">{e.name}</span>
          </button>
        ))}
        <div className="col-start-2 row-start-2 rounded-full bg-gold-5 border bd-gold flex items-center justify-center">
          <MapPin size={20} className="tx-gold" />
        </div>
      </div>

      {otherExits.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs tx-gold uppercase tracking-wide text-center">Other paths</p>
          {otherExits.map((e) => (
            <button key={e.name} onClick={() => onTravel(e)} disabled={disabled} className="w-full text-left parchment-card rounded-xl p-3 disabled:opacity-40 transition-all">
              <p className="text-sm tx-cream">{e.name}</p>
              {e.desc && <p className="text-xs tx-cream-90 italic mt-0.5">{e.desc}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
