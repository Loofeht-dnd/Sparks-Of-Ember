import React, { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { PROVIDERS, testProviderKey, removeProviderKey } from "../services/providers.js";

const STORE_MODES = [
  { id: "local", label: "Remember permanently", help: "Encrypted, stays after you close the browser." },
  { id: "session", label: "This session only", help: "Encrypted, cleared when this tab/browser session ends." },
  { id: "none", label: "Never remember", help: "Not written to disk at all — you'll re-paste it next time." },
];

export default function ProviderCard({ id, cfg, onChange, onRemoved }) {
  const def = PROVIDERS[id];
  const [showKey, setShowKey] = useState(false);
  const [testState, setTestState] = useState(null); // null | "testing" | { ok, message }
  const active = !!cfg.apiKey.trim();

  async function handleTest() {
    if (!cfg.apiKey.trim()) return;
    setTestState("testing");
    const result = await testProviderKey(id, cfg.apiKey, cfg.model);
    setTestState(result);
  }

  async function handleRemove() {
    await removeProviderKey(id);
    onChange({ ...cfg, apiKey: "" });
    setTestState(null);
    onRemoved?.();
  }

  return (
    <div className={`rounded-2xl p-4 border transition-all ${active ? "bg-gold-5 bd-gold" : "bd-brown"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm tx-gold display-font tracking-wide">{def.label}</span>
        {active && (
          <span className="text-[10px] tx-gold uppercase tracking-wide flex items-center gap-1">
            <Check size={11}/> Connected{cfg.storeMode === "built-in" ? " (built into this deploy)" : ""}
          </span>
        )}
      </div>
      <p className="text-xs tx-cream-90 mb-2">{def.keyHelp}</p>
      <div className="flex gap-2 mb-2">
        <input
          type={showKey ? "text" : "password"}
          value={cfg.apiKey}
          onChange={(e) => { onChange({ ...cfg, apiKey: e.target.value }); setTestState(null); }}
          placeholder="Paste API key..."
          className="flex-1 bg-ink-60 border bd-brown focus-bd-gold rounded-xl px-3 py-2 text-sm outline-none tx-cream ph-cream"
        />
        <button onClick={() => setShowKey((s) => !s)} className="px-3 rounded-xl border bd-brown tx-cream-90 text-xs shrink-0">{showKey ? "Hide" : "Show"}</button>
      </div>
      <select
        value={cfg.model}
        onChange={(e) => onChange({ ...cfg, model: e.target.value })}
        className="w-full bg-ink-60 border bd-brown rounded-xl px-3 py-2 text-sm tx-cream outline-none mb-2"
      >
        {def.models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
      </select>

      <div className="flex gap-3 mb-2">
        {STORE_MODES.map((m) => (
          <label key={m.id} className="flex items-center gap-1 text-[11px] tx-cream-90" title={m.help}>
            <input
              type="radio"
              name={`store-mode-${id}`}
              checked={cfg.storeMode === m.id}
              onChange={() => onChange({ ...cfg, storeMode: m.id })}
            />
            {m.label}
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleTest}
          disabled={!cfg.apiKey.trim() || testState === "testing"}
          className="text-xs px-3 py-1.5 rounded-lg border bd-brown tx-cream-90 flex items-center gap-1 disabled:opacity-40"
        >
          {testState === "testing" ? <Loader2 size={12} className="animate-spin" /> : null}
          Test connection
        </button>
        {active && (
          <button onClick={handleRemove} className="text-xs px-3 py-1.5 rounded-lg border bd-brown tx-red">
            Remove key
          </button>
        )}
      </div>
      {testState && testState !== "testing" && (
        <p className={`text-[11px] mt-1 ${testState.ok ? "tx-gold" : "tx-red"}`}>{testState.message}</p>
      )}
    </div>
  );
}
