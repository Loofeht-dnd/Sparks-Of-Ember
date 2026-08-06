// A random id persisted in localStorage, sent as a header to the shared
// proxy Worker (if configured) so it can give each device a fair daily
// message budget. Not tied to any account or personal info — just enough
// to tell "the same device asked again" from "a different device."

const STORAGE_KEY = "dnd-device-id";

export function getDeviceId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return ""; // fine — the Worker just won't rate-limit this session specifically
  }
}
