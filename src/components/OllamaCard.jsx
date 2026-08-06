import React, { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { PROVIDERS, testProviderKey, setOllamaConfig } from "../services/providers.js";

export default function OllamaCard({ cfg, onChange }) {
  const def = PROVIDERS.ollama;
  const [testState, setTestState] = useState(null);

  async function handleToggle(enabled) {
    const next = await setOllamaConfig({ enabled, model: cfg.model, baseUrl: cfg.baseUrl });
    onChange(next);
  }
  async function handleField(field, value) {
    const next = await setOllamaConfig({ [field]: value, enabled: cfg.enabled });
    onChange(next);
  }
  async function handleTest() {
    setTestState("testing");
    const result = await testProviderKey("ollama", "", cfg.model, cfg.baseUrl);
    setTestState(result);
  }

  return (
    <div className={`rounded-2xl p-4 border transition-all ${cfg.enabled ? "bg-gold-5 bd-gold" : "bd-brown"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm tx-gold display-font tracking-wide">{def.label}</span>
        <label className="flex items-center gap-1.5 text-[11px] tx-cream-90">
          <input type="checkbox" checked={!!cfg.enabled} onChange={(e) => handleToggle(e.target.checked)} />
          Enabled
          {cfg.enabled && <Check size={11} className="tx-gold" />}
        </label>
      </div>
      <p className="text-xs tx-cream-90 mb-2">{def.keyHelp}</p>
      <input
        type="text"
        value={cfg.baseUrl || def.baseUrl}
        onChange={(e) => handleField("baseUrl", e.target.value)}
        placeholder={def.baseUrl}
        className="w-full bg-ink-60 border bd-brown focus-bd-gold rounded-xl px-3 py-2 text-sm outline-none tx-cream ph-cream mb-2"
      />
      <input
        type="text"
        value={cfg.model}
        onChange={(e) => handleField("model", e.target.value)}
        placeholder="Model name, e.g. llama3.1"
        className="w-full bg-ink-60 border bd-brown focus-bd-gold rounded-xl px-3 py-2 text-sm outline-none tx-cream ph-cream mb-2"
      />
      <button
        onClick={handleTest}
        disabled={testState === "testing"}
        className="text-xs px-3 py-1.5 rounded-lg border bd-brown tx-cream-90 flex items-center gap-1 disabled:opacity-40"
      >
        {testState === "testing" ? <Loader2 size={12} className="animate-spin" /> : null}
        Test connection
      </button>
      {testState && testState !== "testing" && (
        <p className={`text-[11px] mt-1 ${testState.ok ? "tx-gold" : "tx-red"}`}>{testState.message}</p>
      )}
    </div>
  );
}
