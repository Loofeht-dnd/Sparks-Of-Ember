// Wraps the single "save" slot in window.storage (see storage-polyfill.js)
// with a version tag and a migration hook, so future format changes don't
// silently break existing players' saves.

import { isValidSaveData } from "../utils/validators.js";

export const CURRENT_SAVE_VERSION = 1;
export const DEFAULT_SLOT = "default";
const SLOT_PREFIX = "save:";

// The very first version of this app only ever had one save, stored under the
// bare key "save" (no slot suffix). We keep that exact key for the "default"
// slot so anyone's existing save keeps working with zero migration — every
// *additional* slot beyond that gets a "save:<id>" key.
function keyFor(slotId) {
  return !slotId || slotId === DEFAULT_SLOT ? "save" : `${SLOT_PREFIX}${slotId}`;
}

export function newSlotId() {
  return `slot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Every save currently in the wild predates the version field entirely — treat
// those as version 1 (today's shape) with no changes needed. When the save
// shape actually changes, add a step here, e.g.:
//   if (data.version < 2) data = migrateV1toV2(data);
function migrate(data) {
  if (!data.version) data.version = 1;
  return data;
}

/** Returns the save in a given slot (migrated + validated), or null if there isn't one / it's unusable. */
export async function loadGame(slotId = DEFAULT_SLOT) {
  try {
    const res = await window.storage.get(keyFor(slotId), false);
    if (!res || !res.value) return null;
    const data = migrate(JSON.parse(res.value));
    if (!isValidSaveData(data)) return null;
    return data;
  } catch {
    return null;
  }
}

/** Best-effort autosave/manual save — never throws, returns false on failure. */
export async function saveGame(payload, slotId = DEFAULT_SLOT) {
  try {
    await window.storage.set(
      keyFor(slotId),
      JSON.stringify({ ...payload, version: CURRENT_SAVE_VERSION, savedAt: Date.now() }),
      false
    );
    return true;
  } catch {
    return false;
  }
}

export async function deleteGame(slotId = DEFAULT_SLOT) {
  try {
    await window.storage.delete(keyFor(slotId), false);
  } catch {
    // nothing to delete
  }
}

/**
 * Lists every save slot with just enough metadata for a slot picker —
 * doesn't return full save payloads (portraits/history would make this heavy).
 */
export async function listSaveSlots() {
  try {
    const { keys } = await window.storage.list("save", false);
    const slots = await Promise.all(
      (keys || []).map(async (key) => {
        const slotId = key === "save" ? DEFAULT_SLOT : key.slice(SLOT_PREFIX.length);
        const res = await window.storage.get(key, false);
        if (!res || !res.value) return null;
        try {
          const data = migrate(JSON.parse(res.value));
          if (!isValidSaveData(data)) return null;
          return {
            slotId,
            name: data.character?.name,
            race: data.character?.race,
            cls: data.character?.class,
            level: data.level || 1,
            timestamp: data.savedAt,
            completed: !!data.campaignEnded,
          };
        } catch {
          return null;
        }
      })
    );
    return slots.filter(Boolean).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch {
    return [];
  }
}

/** Returns a pretty-printed JSON string of a slot's save, for a "download my save" feature. */
export async function exportSave(slotId = DEFAULT_SLOT) {
  const data = await loadGame(slotId);
  if (!data) throw new Error("No save to export.");
  return JSON.stringify(data, null, 2);
}

/** Parses, migrates, and validates an imported save file, then stores it in a (new, by default) slot. */
export async function importSave(jsonString, slotId = null) {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  data = migrate(data);
  if (!isValidSaveData(data)) throw new Error("That save file is missing required character data.");
  const targetSlot = slotId || newSlotId();
  await saveGame(data, targetSlot);
  return { data, slotId: targetSlot };
}
