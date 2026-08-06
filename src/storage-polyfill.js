// Standalone replacement for the Claude-artifact-only `window.storage` API.
// Same shape (get/set/delete/list), backed by real browser localStorage instead.
// The `shared` flag is meaningless outside Claude's multiplayer artifacts, so we
// just prefix keys with it to keep personal/shared data namespaced separately.

function prefixed(key, shared) {
  return `${shared ? "shared" : "personal"}:${key}`;
}

async function get(key, shared = false) {
  const raw = localStorage.getItem(prefixed(key, shared));
  if (raw === null) throw new Error(`key "${key}" not found`);
  return { key, value: raw, shared };
}

async function set(key, value, shared = false) {
  localStorage.setItem(prefixed(key, shared), value);
  return { key, value, shared };
}

async function del(key, shared = false) {
  localStorage.removeItem(prefixed(key, shared));
  return { key, deleted: true, shared };
}

async function list(prefix = "", shared = false) {
  const ns = shared ? "shared:" : "personal:";
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(ns) && k.slice(ns.length).startsWith(prefix)) {
      keys.push(k.slice(ns.length));
    }
  }
  return { keys, prefix, shared };
}

if (typeof window !== "undefined") {
  window.storage = { get, set, delete: del, list };
}
