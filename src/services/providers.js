// Supports multiple free-tier AI providers with automatic failover: if one
// hits a rate limit (or isn't configured), the next configured provider is
// tried automatically, so the game keeps going instead of stopping cold.
// All keys/settings live only in this browser's localStorage — there's no
// backend in this project.

const STORAGE_PREFIX = "dnd-provider-";
const ORDER_KEY = "dnd-provider-order";

// Maps a provider id to the Vite env var (see .env.example) that can supply
// a build-time default key for it, for a solo personal deployment where you
// don't want to paste a key in on every fresh install.
const ENV_KEY_MAP = {
  gemini: "VITE_GEMINI_API_KEY",
  groq: "VITE_GROQ_API_KEY",
  openrouter: "VITE_OPENROUTER_API_KEY",
};

// Static metadata for each provider. `kind` determines which request format
// is used: "gemini" (Google's own format) or "openai" (the shared chat-
// completions format used by Groq, OpenRouter, and many others).
export const PROVIDERS = {
  gemini: {
    label: "Google Gemini",
    kind: "gemini",
    keyHelp: "Free key: aistudio.google.com/apikey (sign in with any Google account, no card)",
    models: [
      { id: "gemini-3.1-flash-lite", label: "Fastest" },
      { id: "gemini-2.5-flash", label: "Balanced (recommended)" },
      { id: "gemini-3.5-flash", label: "Best Quality" },
    ],
    supportsImages: true,
  },
  groq: {
    label: "Groq",
    kind: "openai",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    keyHelp: "Free key: console.groq.com/keys (no card). Very fast, but a tighter tokens-per-minute limit.",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (recommended)" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (fastest)" },
    ],
    supportsImages: false,
  },
  openrouter: {
    label: "OpenRouter",
    kind: "openai",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    keyHelp: "Free key: openrouter.ai/keys (no card). Pick any model ending in \":free\".",
    models: [
      { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (free)" },
      { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B (free)" },
    ],
    supportsImages: false,
  },
  ollama: {
    label: "Ollama (local)",
    kind: "ollama",
    keyless: true, // runs on your own machine — no API key, just needs to be reachable
    baseUrl: "http://localhost:11434",
    keyHelp: "Free, fully offline, and completely private — but needs Ollama installed and running on this device (ollama.com). Start it with OLLAMA_ORIGINS=* so your browser is allowed to reach it, and pull a model first, e.g. \"ollama pull llama3.1\".",
    models: [
      { id: "llama3.1", label: "Llama 3.1 8B" },
      { id: "llama3.2", label: "Llama 3.2" },
      { id: "mistral", label: "Mistral 7B" },
      { id: "qwen2.5", label: "Qwen 2.5" },
    ],
    supportsImages: false,
  },
  proxy: {
    label: "Shared AI (no setup)",
    kind: "proxy",
    keyless: true, // the browser never holds a real provider key — a Worker does
    keyHelp: "A shared free-tier pool the game's operator set up so you don't need your own key. Has a fair daily limit per device; if it's exhausted, add your own free key above instead.",
    supportsImages: true,
  },
};

// If the game was built with a proxy URL baked in (see .env.example), the
// proxy is tried FIRST — that's what makes "just open and play" possible.
// Everything after it is still available as a fallback / a way to guarantee
// your own capacity if the shared pool is busy.
const DEFAULT_ORDER = ["proxy", "gemini", "groq", "openrouter", "ollama"];

export function getOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(ORDER_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch { /* fall through to default */ }
  return DEFAULT_ORDER;
}
export function setOrder(order) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(order));
}

/* ------------------------- Provider config (encrypted key storage) ------------------------- */
// The API key itself is never written to localStorage in plain text — see
// services/keyStorage.js. Only non-secret metadata (which model is selected)
// lives in plain localStorage. Because encryption/decryption is async but most
// of the app (TitleScreen, chatComplete, etc.) reads config synchronously, we
// keep a decrypted in-memory cache that's populated once via
// initProviderConfigs() at app startup (see App.jsx's "loading" phase).

const configCache = {};

function defaultConfig(id) {
  const base = { apiKey: "", model: PROVIDERS[id].models?.[0]?.id || null, storeMode: null };
  if (PROVIDERS[id].keyless) return { ...base, enabled: false, baseUrl: PROVIDERS[id].baseUrl };
  return base;
}

function readMetadata(id) {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PREFIX + id)) || {};
  } catch {
    return {};
  }
}
function writeMetadata(id, { model, enabled, baseUrl }) {
  const payload = { model };
  if (enabled !== undefined) payload.enabled = enabled;
  if (baseUrl !== undefined) payload.baseUrl = baseUrl;
  localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(payload));
}

/** Keyless local providers (Ollama) are "on" via an explicit toggle, not an API key. */
export async function setOllamaConfig({ enabled, model, baseUrl }) {
  const current = getProviderConfig("ollama");
  const next = {
    ...current,
    enabled: enabled !== undefined ? !!enabled : current.enabled,
    model: model || current.model,
    baseUrl: baseUrl || current.baseUrl,
  };
  configCache.ollama = next;
  writeMetadata("ollama", { model: next.model, enabled: next.enabled, baseUrl: next.baseUrl });
  return next;
}

/** Call once at startup, before any screen that needs to know which providers are configured. */
export async function initProviderConfigs() {
  const { loadKeyRecord, loadKeyMode } = await import("./keyStorage.js");
  await Promise.all(Object.keys(PROVIDERS).map(async (id) => {
    const metadata = readMetadata(id);

    if (id === "proxy") {
      // Unlike Ollama, this isn't a user-facing toggle — it's either baked
      // into the build (see .env.example's VITE_PROXY_URL) or it doesn't
      // exist as an option at all. That's what makes "just open and play"
      // possible: nothing for the player to configure either way.
      const proxyUrl = import.meta.env.VITE_PROXY_URL;
      configCache.proxy = { apiKey: "", model: null, storeMode: null, enabled: !!proxyUrl?.trim(), baseUrl: proxyUrl?.trim() || "" };
      return;
    }

    if (PROVIDERS[id].keyless) {
      // No API key involved — just plain (non-secret) local/session state.
      configCache[id] = {
        apiKey: "",
        model: metadata.model || defaultConfig(id).model,
        storeMode: null,
        enabled: !!metadata.enabled,
        baseUrl: metadata.baseUrl || PROVIDERS[id].baseUrl,
      };
      return;
    }

    let apiKey = await loadKeyRecord(id);
    let storeMode = loadKeyMode(id);

    // One-time migration: earlier versions of this app stored the raw key in
    // localStorage under this same metadata object. If we find one and haven't
    // already migrated it to encrypted storage, do so now and scrub the plaintext.
    if (!apiKey && metadata.apiKey?.trim()) {
      apiKey = metadata.apiKey.trim();
      storeMode = "local";
      const { saveKeyRecord } = await import("./keyStorage.js");
      await saveKeyRecord(id, apiKey, "local");
      writeMetadata(id, { model: metadata.model || defaultConfig(id).model });
    }

    // Optional build-time default: if nothing is saved yet, fall back to a
    // key baked in at build time via a .env file (see .env.example). This is
    // NEVER written to localStorage — it's re-read from the build every load
    // — and is meant for a solo, personal deployment only. It ends up in the
    // compiled JS bundle your browser downloads, same as everything else in
    // a backend-less app: fine for a link only you use, not for a shared one.
    if (!apiKey) {
      const envKey = ENV_KEY_MAP[id] ? import.meta.env[ENV_KEY_MAP[id]] : undefined;
      if (envKey?.trim()) {
        apiKey = envKey.trim();
        storeMode = "built-in";
      }
    }

    configCache[id] = { apiKey, model: metadata.model || defaultConfig(id).model, storeMode };
  }));
}

/** Synchronous read of the in-memory cache — safe to call anywhere after initProviderConfigs(). */
export function getProviderConfig(id) {
  return configCache[id] || defaultConfig(id);
}

/**
 * Update just the model choice (non-secret), or an apiKey that's already been
 * validated/saved via saveProviderKey. Kept for the simple "just change the
 * model dropdown" case; does not itself touch encrypted storage for the key.
 */
export function setProviderConfig(id, config) {
  configCache[id] = { ...defaultConfig(id), ...configCache[id], ...config };
  writeMetadata(id, { model: configCache[id].model });
}

/** Validates, encrypts, and persists an API key under the chosen storage mode. */
export async function saveProviderKey(id, apiKey, model, mode) {
  const { validateApiKeyFormat, saveKeyRecord } = await import("./keyStorage.js");
  const trimmed = (apiKey || "").trim();
  const check = validateApiKeyFormat(trimmed);
  if (!check.valid) return { ok: false, error: check.error };
  await saveKeyRecord(id, trimmed, mode);
  configCache[id] = { apiKey: trimmed, model: model || getProviderConfig(id).model, storeMode: mode };
  writeMetadata(id, { model: configCache[id].model });
  return { ok: true, error: null };
}

/** Removes a stored key from every storage location and memory. */
export async function removeProviderKey(id) {
  const { clearKeyRecord } = await import("./keyStorage.js");
  clearKeyRecord(id);
  configCache[id] = { ...defaultConfig(id), model: getProviderConfig(id).model };
}

/** Fires a minimal real request against the provider to confirm the key works. */
export async function testProviderKey(id, apiKey, model, baseUrl) {
  const def = PROVIDERS[id];
  const testConfig = { apiKey: (apiKey || "").trim(), model: model || def.models?.[0]?.id, baseUrl: baseUrl || def.baseUrl };
  try {
    if (def.kind === "gemini") {
      await callGemini(testConfig, "Reply with the single word: ok", [{ role: "user", content: "ping" }], 8);
    } else if (def.kind === "ollama") {
      await callOllama(testConfig, "Reply with the single word: ok", [{ role: "user", content: "ping" }], 8);
    } else {
      await callOpenAICompatible(def.label, def.baseUrl, testConfig, "Reply with the single word: ok", [{ role: "user", content: "ping" }], 8);
    }
    return { ok: true, message: "Connected successfully." };
  } catch (e) {
    return { ok: false, message: e.message || "Connection test failed." };
  }
}

export function isProviderActive(id, config) {
  return PROVIDERS[id].keyless ? !!config.enabled : !!config.apiKey?.trim();
}

export function hasAnyProviderConfigured() {
  return Object.keys(PROVIDERS).some((id) => isProviderActive(id, getProviderConfig(id)));
}

function activeProvidersInOrder() {
  return getOrder()
    .map((id) => ({ id, ...PROVIDERS[id], config: getProviderConfig(id) }))
    .filter((p) => isProviderActive(p.id, p.config));
}

/* ------------------------------- Gemini format ------------------------------ */

async function geminiRateLimitMessage(res) {
  const data = await res.json().catch(() => null);
  const details = data?.error?.details || [];
  const quota = details.find((d) => d["@type"]?.includes("QuotaFailure"));
  const retry = details.find((d) => d["@type"]?.includes("RetryInfo"));
  const quotaId = quota?.violations?.[0]?.quotaId || "";
  if (/perday/i.test(quotaId)) return "daily limit reached (resets midnight Pacific Time)";
  const seconds = retry?.retryDelay ? parseInt(retry.retryDelay, 10) : null;
  return seconds ? `rate limited, retry in ~${seconds}s` : "rate limited";
}

async function callGemini(config, systemPrompt, history, maxTokens) {
  const contents = history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.85 },
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error(`Gemini ${await geminiRateLimitMessage(res)}`);
    if (res.status === 400 || res.status === 403) throw new Error("Gemini rejected the request (bad key?)");
    throw new Error(`Gemini error ${res.status}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text.trim()) throw new Error("Gemini returned an empty reply");
  return text;
}

/* --------------------------- Shared OpenAI-style format (Groq, OpenRouter) --------------------------- */

async function callOpenAICompatible(providerLabel, baseUrl, config, systemPrompt, history, maxTokens) {
  const messages = [{ role: "system", content: systemPrompt }, ...history.map((m) => ({ role: m.role, content: m.content }))];
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.model, messages, max_tokens: maxTokens, temperature: 0.85 }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error(`${providerLabel} rate limited — try again shortly`);
    if (res.status === 400 || res.status === 401 || res.status === 403) throw new Error(`${providerLabel} rejected the request (bad key?)`);
    throw new Error(`${providerLabel} error ${res.status}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  if (!text.trim()) throw new Error(`${providerLabel} returned an empty reply`);
  return text;
}

/* --------------------------------- Ollama (local) --------------------------------- */

async function callOllama(config, systemPrompt, history, maxTokens) {
  const baseUrl = (config.baseUrl || "http://localhost:11434").replace(/\/+$/, "");
  const messages = [{ role: "system", content: systemPrompt }, ...history.map((m) => ({ role: m.role, content: m.content }))];
  let res;
  try {
    res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.model, messages, stream: false, options: { num_predict: maxTokens, temperature: 0.85 } }),
    });
  } catch {
    throw new Error("Couldn't reach Ollama — is it running, and started with OLLAMA_ORIGINS=* so the browser can reach it?");
  }
  if (!res.ok) {
    throw new Error(`Ollama error ${res.status} — make sure "${config.model}" is pulled (ollama pull ${config.model})`);
  }
  const data = await res.json();
  const text = data.message?.content || "";
  if (!text.trim()) throw new Error("Ollama returned an empty reply");
  return text;
}

async function callProxy(config, systemPrompt, history, maxTokens) {
  const { getDeviceId } = await import("./deviceId.js");
  let res;
  try {
    res = await fetch(`${config.baseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Id": getDeviceId() },
      body: JSON.stringify({ systemPrompt, history, maxTokens }),
    });
  } catch {
    throw new Error("Couldn't reach the shared AI right now.");
  }
  if (!res.ok) {
    let body = {};
    try { body = await res.json(); } catch { /* non-JSON error body — fall through */ }
    if (body.error === "pool_exhausted" && body.scope === "device") {
      throw new Error("You've used today's fair-use share of the shared AI. Add your own free key above for unlimited play, or come back tomorrow.");
    }
    if (body.error === "pool_exhausted") {
      throw new Error("The shared AI is busy right now (its whole pool is rate-limited). Add your own free key above to keep playing.");
    }
    throw new Error(`Shared AI error (${res.status}).`);
  }
  const data = await res.json();
  if (!data.text?.trim()) throw new Error("The shared AI returned an empty reply.");
  return data.text;
}

/* ------------------------------- Public API ------------------------------ */

export async function chatComplete(systemPrompt, history, maxTokens = 1500) {
  const trimmedHistory = history.length > 24 ? history.slice(-24) : history;
  const providers = activeProvidersInOrder();
  if (providers.length === 0) throw new Error("No AI provider set up yet — add at least one free API key from the title screen.");

  const attempts = [];
  for (const p of providers) {
    try {
      if (p.kind === "gemini") return await callGemini(p.config, systemPrompt, trimmedHistory, maxTokens);
      if (p.kind === "ollama") return await callOllama(p.config, systemPrompt, trimmedHistory, maxTokens);
      if (p.kind === "proxy") return await callProxy(p.config, systemPrompt, trimmedHistory, maxTokens);
      return await callOpenAICompatible(p.label, p.baseUrl, p.config, systemPrompt, trimmedHistory, maxTokens);
    } catch (e) {
      attempts.push(`${p.label}: ${e.message}`);
      // fall through to the next configured provider regardless of failure reason
    }
  }
  throw new Error(`All configured AI providers are unavailable right now:\n${attempts.join("\n")}`);
}

async function callProxyImage(config, prompt, referenceDataUrl) {
  const { getDeviceId } = await import("./deviceId.js");
  let res;
  try {
    res = await fetch(`${config.baseUrl}/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Id": getDeviceId() },
      body: JSON.stringify({ prompt, referenceDataUrl: referenceDataUrl || undefined }),
    });
  } catch {
    throw new Error("Couldn't reach the shared AI for image generation.");
  }
  if (!res.ok) {
    let body = {};
    try { body = await res.json(); } catch { /* non-JSON error body */ }
    if (body.error === "pool_exhausted") throw new Error("Shared image generation is at its limit right now.");
    throw new Error(`Shared AI image error (${res.status}).`);
  }
  const data = await res.json();
  if (!data.dataUrl) throw new Error("The shared AI didn't return an image that time.");
  return data.dataUrl;
}

export async function generateImage(prompt, referenceDataUrl) {
  const proxy = getProviderConfig("proxy");
  if (isProviderActive("proxy", proxy)) {
    try {
      return await callProxyImage(proxy, prompt, referenceDataUrl);
    } catch (e) {
      // fall through to a direct Gemini key, if the player has one configured,
      // exactly like chatComplete falls through across providers
      const gemini = getProviderConfig("gemini");
      if (!gemini.apiKey?.trim()) throw e;
    }
  }

  const gemini = getProviderConfig("gemini");
  if (!gemini.apiKey?.trim()) throw new Error("Image generation needs Gemini configured (it's the only provider here with a free image tier), or the shared AI to be reachable.");

  const parts = [];
  if (referenceDataUrl) {
    const match = referenceDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
  }
  parts.push({ text: prompt });

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": gemini.apiKey },
    body: JSON.stringify({ contents: [{ role: "user", parts }] }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error(`Gemini image limit — ${await geminiRateLimitMessage(res)}`);
    if (res.status === 400 || res.status === 403) throw new Error("Gemini rejected the image request — check your key, or image gen may not be enabled for your account/region.");
    throw new Error(`Image generation error (${res.status}).`);
  }
  const data = await res.json();
  const responseParts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = responseParts.find((p) => p.inlineData || p.inline_data);
  if (!imagePart) throw new Error("Gemini didn't return an image that time — try again.");
  const inline = imagePart.inlineData || imagePart.inline_data;
  return `data:${inline.mimeType || inline.mime_type || "image/png"};base64,${inline.data}`;
}
