import React, { useState } from "react";
import { Flame, ShieldAlert } from "lucide-react";
import { PROVIDERS, getProviderConfig, saveProviderKey } from "../services/providers.js";
import { GLOBAL_STYLE } from "../styles/globalStyle.js";
import Atmosphere from "./Atmosphere.jsx";
import ProviderCard from "./ProviderCard.jsx";
import OllamaCard from "./OllamaCard.jsx";

export default function ApiKeySetup({ onSaved }) {
  const [configs, setConfigs] = useState(() => {
    const out = {};
    Object.keys(PROVIDERS).forEach((id) => {
      const existing = getProviderConfig(id);
      out[id] = PROVIDERS[id].keyless ? existing : { ...existing, storeMode: existing.storeMode || "local" };
    });
    return out;
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const keyedProviders = Object.keys(PROVIDERS).filter((id) => !PROVIDERS[id].keyless && id !== "proxy");
  const keylessProviders = Object.keys(PROVIDERS).filter((id) => PROVIDERS[id].keyless && id !== "proxy");

  function updateProvider(id, next) {
    setConfigs((c) => ({ ...c, [id]: next }));
    setError(null);
  }

  async function handleSave() {
    const toSave = Object.entries(configs).filter(([id, cfg]) => !PROVIDERS[id].keyless && cfg.apiKey.trim());
    const ollamaReady = keylessProviders.some((id) => configs[id]?.enabled);
    if (toSave.length === 0 && !ollamaReady) {
      setError("Paste at least one API key, or enable Ollama below if you're running it locally.");
      return;
    }
    setSaving(true);
    setError(null);
    const errors = [];
    for (const [id, cfg] of toSave) {
      const result = await saveProviderKey(id, cfg.apiKey, cfg.model, cfg.storeMode);
      if (!result.ok) errors.push(`${PROVIDERS[id].label}: ${result.error}`);
    }
    setSaving(false);
    if (errors.length) {
      setError(errors.join(" "));
      return;
    }
    onSaved();
  }

  return (
    <div className="min-h-screen w-full tx-cream relative flex flex-col items-center justify-center px-6 py-10 scene-bg screen-transition" style={{ fontFamily: "'EB Garamond', serif" }}>
      <style>{GLOBAL_STYLE}</style>
      <Atmosphere />
      <div className="vignette-layer" />
      <div className="relative z-10 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Flame size={18} className="tx-gold-mid flicker-border" />
            <h1 className="display-font text-2xl font-bold tracking-widest gold-engraved">CONNECT YOUR AI</h1>
            <Flame size={18} className="tx-gold-mid flicker-border" />
          </div>
          <p className="text-sm tx-cream-90 italic">Free providers only — no card, no bill. Paste a key to activate a cloud provider, or enable Ollama below to run entirely offline on this device. Playing a long session? Add more than one; the game automatically falls to the next one if any hits a limit.</p>
          <div className="ornate-divider max-w-[220px] mx-auto mt-3" />
        </div>

        <div className="flex gap-2 items-start rounded-xl border bd-brown bg-ink-60 p-3 mb-4 text-[11px] tx-cream-90">
          <ShieldAlert size={26} className="tx-gold-mid shrink-0" />
          <p>
            Your key is encrypted before it's stored on this device, and never leaves your browser except to call the AI provider directly.
            But without a backend server, <span className="tx-gold">no browser app can completely hide a key</span> from someone with access
            to this device — encryption here only raises the bar above plain text, it isn't a guarantee. Use "Never remember" if that matters to you.
          </p>
        </div>

        <div className="space-y-3">
          {keyedProviders.map((id) => (
            <ProviderCard key={id} id={id} cfg={configs[id]} onChange={(next) => updateProvider(id, next)} />
          ))}
          {keylessProviders.map((id) => (
            <OllamaCard key={id} cfg={configs[id]} onChange={(next) => updateProvider(id, next)} />
          ))}
        </div>

        {error && <p className="text-xs tx-red mt-3 text-center">{error}</p>}

        <button onClick={handleSave} disabled={saving} className="w-full btn-crimson transition-colors rounded-xl py-3 display-font tracking-wider tx-cream-lt flicker-border mt-4 disabled:opacity-60">
          {saving ? "SAVING…" : "SAVE & CONTINUE"}
        </button>
        <p className="text-xs tx-cream-90 italic text-center mt-4">Change or add providers anytime from the title screen. Order tried: Gemini → Groq → OpenRouter → Ollama.</p>
      </div>
    </div>
  );
}
