// Lightweight runtime shape-checks. These exist to stop malformed data (a
// corrupted/imported save file, or in principle a weird AI reply that slipped
// past the parser in utils/parser.js) from crashing the app — not to be a
// full schema library.

export function isValidCharacter(c) {
  return !!(
    c &&
    typeof c.name === "string" && c.name.trim() &&
    typeof c.race === "string" &&
    typeof c.class === "string" &&
    typeof c.background === "string" &&
    c.abilityScores && typeof c.abilityScores === "object" &&
    typeof c.hp === "number" &&
    typeof c.ac === "number" &&
    Array.isArray(c.gear) &&
    Array.isArray(c.skills)
  );
}

export function isValidSaveData(data) {
  if (!data || typeof data !== "object") return false;
  if (!isValidCharacter(data.character)) return false;
  if (data.log && !Array.isArray(data.log)) return false;
  if (data.history && !Array.isArray(data.history)) return false;
  if (data.inventory && !Array.isArray(data.inventory)) return false;
  if (data.journal && !Array.isArray(data.journal)) return false;
  return true;
}

export function isValidInventoryItem(item) {
  return !!(item && typeof item.name === "string" && item.name.trim());
}
