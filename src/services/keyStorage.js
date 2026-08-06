// Encrypted-at-rest storage for API keys, using the browser's native Web Crypto
// API (AES-GCM). This is NOT real security — see the honesty note below — but it
// does mean a key no longer sits in localStorage/devtools as plain, greppable
// text, which is worth doing even though it can't be a complete solution without
// a backend.
//
// IMPORTANT HONESTY NOTE (surfaced in the UI too, see components/ApiKeySetup.jsx):
// The AES key that wraps each API key is itself stored in this same browser
// (localStorage for "remember permanently", sessionStorage for "this session
// only"). Anyone with the same level of access needed to read localStorage
// (devtools, another extension, physical device access) can also read the
// wrapping key and decrypt the record. This raises the bar above "plaintext in
// devtools" but does not achieve real secrecy — only a server-side proxy can do
// that. We say so plainly rather than imply otherwise.

const WRAP_KEY_LOCAL = "dnd-keystore-wrapkey-local";
const WRAP_KEY_SESSION = "dnd-keystore-wrapkey-session";
const RECORD_PREFIX = "dnd-keystore-record-";

// Mode "none" ("never remember") never touches any Storage — the value lives
// only in this module's memory for the lifetime of the page.
const memoryOnly = {};

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}
function base64ToBytes(b64) {
  const binary = atob(b64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function getOrCreateWrapKey(mode) {
  const storage = mode === "session" ? sessionStorage : localStorage;
  const storeKey = mode === "session" ? WRAP_KEY_SESSION : WRAP_KEY_LOCAL;
  const existing = storage.getItem(storeKey);
  if (existing) {
    const raw = base64ToBytes(existing);
    return crypto.subtle.importKey("raw", raw, "AES-GCM", true, ["encrypt", "decrypt"]);
  }
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const raw = await crypto.subtle.exportKey("raw", key);
  storage.setItem(storeKey, bytesToBase64(new Uint8Array(raw)));
  return key;
}

async function encryptForStorage(plaintext, mode) {
  const key = await getOrCreateWrapKey(mode);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return { mode, iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(cipher)) };
}

async function decryptFromStorage(record) {
  const key = await getOrCreateWrapKey(record.mode);
  const iv = base64ToBytes(record.iv);
  const data = base64ToBytes(record.data);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plainBuf);
}

/**
 * Persist an API key under one of three modes:
 *  - "local":   encrypted, survives browser restarts (localStorage)
 *  - "session": encrypted, cleared when the tab/browser session ends (sessionStorage)
 *  - "none":    never written to disk at all, kept only in memory for this page load
 */
export async function saveKeyRecord(id, apiKey, mode) {
  const storageKeyName = RECORD_PREFIX + id;
  localStorage.removeItem(storageKeyName);
  sessionStorage.removeItem(storageKeyName);
  delete memoryOnly[id];

  if (!apiKey) return; // treat empty as "clear"
  if (mode === "none") {
    memoryOnly[id] = apiKey;
    return;
  }
  const record = await encryptForStorage(apiKey, mode);
  const storage = mode === "session" ? sessionStorage : localStorage;
  storage.setItem(storageKeyName, JSON.stringify(record));
}

/** Returns the decrypted API key for `id`, or "" if nothing is stored. */
export async function loadKeyRecord(id) {
  if (id in memoryOnly) return memoryOnly[id];
  const storageKeyName = RECORD_PREFIX + id;
  const raw = localStorage.getItem(storageKeyName) || sessionStorage.getItem(storageKeyName);
  if (!raw) return "";
  try {
    const record = JSON.parse(raw);
    return await decryptFromStorage(record);
  } catch {
    return ""; // corrupt or undecryptable record — treat as absent rather than throwing
  }
}

/** Which mode (if any) a key is currently stored under, for UI display. */
export function loadKeyMode(id) {
  if (id in memoryOnly) return "none";
  const storageKeyName = RECORD_PREFIX + id;
  if (localStorage.getItem(storageKeyName)) return "local";
  if (sessionStorage.getItem(storageKeyName)) return "session";
  return null;
}

export function clearKeyRecord(id) {
  localStorage.removeItem(RECORD_PREFIX + id);
  sessionStorage.removeItem(RECORD_PREFIX + id);
  delete memoryOnly[id];
}

/** Basic sanity checks before we bother saving/testing a key. Not provider-specific validation. */
export function validateApiKeyFormat(apiKey) {
  const trimmed = (apiKey || "").trim();
  if (!trimmed) return { valid: false, error: "Paste an API key first." };
  if (/\s/.test(trimmed)) return { valid: false, error: "That doesn't look right — API keys don't contain spaces or line breaks." };
  if (trimmed.length < 10) return { valid: false, error: "That key looks too short to be valid." };
  return { valid: true, error: null };
}
