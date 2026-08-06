import { KNOWN_DIRECTIONS } from "../constants/map.js";

export function extractNote(text) {
  const re = /\[NOTE:\s*([^\]]+)\]\n?/gi;
  const notes = [];
  const cleaned = text.replace(re, (_, n) => { notes.push(n.trim()); return ""; });
  return { text: cleaned, note: notes[0] || null };
}

export function extractXp(text) {
  const re = /\[XP:\s*(\d+)\]\n?/i;
  const match = text.match(re);
  if (!match) return { text, xp: null };
  return { text: text.replace(re, ""), xp: parseInt(match[1], 10) };
}

export function extractItem(text) {
  const addRe = /\[ITEM_ADD:\s*([^|\]]+?)(?:\s*\|\s*([^\]]+))?\]\n?/gi;
  const removeRe = /\[ITEM_REMOVE:\s*([^\]]+)\]\n?/gi;
  const add = [];
  const remove = [];
  let cleaned = text.replace(addRe, (_, name, desc) => {
    add.push({ name: name.trim(), desc: (desc || "").trim() });
    return "";
  });
  cleaned = cleaned.replace(removeRe, (_, name) => {
    remove.push(name.trim());
    return "";
  });
  if (add.length === 0 && remove.length === 0) return { text, item: null };
  return { text: cleaned, item: { add, remove } };
}


export function extractMap(text) {
  const re = /\[MAP:(\{[\s\S]*?\})\]\n?/i;
  const match = text.match(re);
  if (!match) return { text, map: null };
  try {
    const data = JSON.parse(match[1]);
    if (!data.current?.name || !Array.isArray(data.exits)) throw new Error("bad shape");
    const exits = data.exits
      .filter((e) => e && e.name)
      .map((e) => ({
        direction: KNOWN_DIRECTIONS.includes(String(e.direction).toLowerCase()) ? String(e.direction).toLowerCase() : "path",
        name: e.name,
        desc: e.desc || "",
      }));
    return { text: text.replace(re, ""), map: { current: { name: data.current.name, desc: data.current.desc || "" }, exits } };
  } catch {
    return { text: text.replace(re, ""), map: null };
  }
}

export function extractNPC(text) {
  const re = /\[NPC:\s*(\{[\s\S]*?\})\s*\]\n?/i;
  const match = text.match(re);
  if (!match) return { text, npc: null };
  try {
    const data = JSON.parse(match[1]);
    if (typeof data.id !== "string" || !data.id.trim() || typeof data.name !== "string" || !data.name.trim()) {
      throw new Error("bad shape");
    }
    const npc = {
      id: data.id.trim(),
      name: data.name.trim(),
      role: typeof data.role === "string" ? data.role.trim() : "",
      personality: typeof data.personality === "string" ? data.personality.trim() : "",
      appearance: typeof data.appearance === "string" ? data.appearance.trim() : "",
    };
    return { text: text.replace(re, ""), npc };
  } catch {
    return { text: text.replace(re, ""), npc: null };
  }
}

export function extractSpeaker(text) {
  const re = /^\s*\[SPEAKER:\s*([a-zA-Z0-9_-]+)\s*\]\s*\n?/i;
  const match = text.match(re);
  if (!match) return { text, speakerId: null };
  return { text: text.slice(match[0].length), speakerId: match[1].trim() };
}

export function extractCompanion(text) {
  const re = /\[COMPANION:\s*(\{[\s\S]*?\})\s*\]\n?/i;
  const match = text.match(re);
  if (!match) return { text, companion: null };
  try {
    const data = JSON.parse(match[1]);
    if (typeof data.id !== "string" || !data.id.trim()) throw new Error("bad shape");
    const hp = parseInt(data.hp, 10);
    const ac = parseInt(data.ac, 10);
    const atk = parseInt(data.atk, 10);
    if (!Number.isFinite(hp) || !Number.isFinite(ac) || !Number.isFinite(atk) || typeof data.dmg !== "string") {
      throw new Error("bad shape");
    }
    return { text: text.replace(re, ""), companion: { id: data.id.trim(), maxHp: hp, hp, ac, attackBonus: atk, damage: data.dmg.trim() } };
  } catch {
    return { text: text.replace(re, ""), companion: null };
  }
}

export function extractDisposition(text) {
  const re = /\[DISPOSITION:\s*(\{[\s\S]*?\})\s*\]\n?/i;
  const match = text.match(re);
  if (!match) return { text, disposition: null };
  const VALID = new Set(["friendly", "neutral", "wary", "hostile"]);
  try {
    const data = JSON.parse(match[1]);
    if (typeof data.id !== "string" || !data.id.trim() || !VALID.has(data.value)) throw new Error("bad shape");
    return { text: text.replace(re, ""), disposition: { id: data.id.trim(), value: data.value } };
  } catch {
    return { text: text.replace(re, ""), disposition: null };
  }
}

export function extractQuest(text) {
  const re = /\[QUEST:\s*(\{[\s\S]*?\})\s*\]\n?/i;
  const match = text.match(re);
  if (!match) return { text, quest: null };
  const VALID_STATUS = new Set(["active", "complete", "failed"]);
  try {
    const data = JSON.parse(match[1]);
    if (typeof data.id !== "string" || !data.id.trim() || typeof data.title !== "string" || !data.title.trim() || !VALID_STATUS.has(data.status)) {
      throw new Error("bad shape");
    }
    return { text: text.replace(re, ""), quest: { id: data.id.trim(), title: data.title.trim(), status: data.status } };
  } catch {
    return { text: text.replace(re, ""), quest: null };
  }
}

export function extractEnding(text) {
  const re = /\n?\[THE_END\]\s*$/i;
  const match = text.match(re);
  if (!match) return { text: text.trim(), ended: false };
  return { text: text.slice(0, match.index).trim(), ended: true };
}

export function extractRoll(text) {
  const re = /\n?\[ROLL:([^:\]]+):(str|dex|con|int|wis|cha)(?::(\d+))?\]\s*$/i;
  const match = text.match(re);
  if (!match) return { narration: text.trim(), roll: null };
  return {
    narration: text.slice(0, match.index).trim(),
    roll: { skill: match[1].trim(), ability: match[2].toLowerCase(), dc: match[3] ? parseInt(match[3], 10) : null },
  };
}

export function extractCombat(text) {
  const re = /\n?\[COMBAT:\s*([^\]]+)\]\s*$/i;
  const match = text.match(re);
  if (!match) return { narration: text.trim(), combat: null };
  const narration = text.slice(0, match.index).trim();
  const enemyRe = /([A-Za-z' -]+?)\s+hp(\d+)\s+ac(\d+)\s+atk([+-]?\d+)\s+dmg(\d+d\d+(?:[+-]\d+)?)/gi;
  const enemies = [];
  let m;
  while ((m = enemyRe.exec(match[1])) !== null) {
    enemies.push({ name: m[1].trim(), hp: parseInt(m[2], 10), ac: parseInt(m[3], 10), attackBonus: parseInt(m[4], 10), damage: m[5] });
  }
  if (enemies.length === 0) return { narration, combat: null };
  return { narration, combat: { enemies } };
}
