// Formats a save's story so far into a shareable markdown document, and
// triggers a browser download for it — no server, no library, just a Blob
// and a temporary <a download> link.

export function buildRecapMarkdown({ character, log, journal, questLog, npcRegistry }) {
  const lines = [];
  lines.push(`# ${character.name}'s Adventure`);
  lines.push("");
  lines.push(`*Level ${character.level} ${character.race} ${character.class} (${character.background})*`);
  lines.push("");

  const quests = Object.values(questLog || {});
  if (quests.length) {
    lines.push("## Quests");
    quests.forEach((q) => {
      const mark = q.status === "complete" ? "✅" : q.status === "failed" ? "❌" : "🔸";
      lines.push(`- ${mark} ${q.title}`);
    });
    lines.push("");
  }

  const npcs = Object.values(npcRegistry || {});
  if (npcs.length) {
    lines.push("## People met along the way");
    npcs.forEach((n) => {
      lines.push(`- **${n.name}**${n.role ? ` — ${n.role}` : ""}${n.disposition && n.disposition !== "neutral" ? ` (${n.disposition})` : ""}`);
    });
    lines.push("");
  }

  if (journal?.length) {
    lines.push("## Journal notes");
    journal.forEach((entry) => lines.push(`- ${typeof entry === "string" ? entry : entry.text}`));
    lines.push("");
  }

  lines.push("## The story so far");
  lines.push("");
  (log || []).forEach((m) => {
    if (m.kind === "narration" || m.kind === "ending") {
      lines.push(m.text);
      lines.push("");
    } else if (m.kind === "action") {
      lines.push(`> **${character.name}:** ${m.text}`);
      lines.push("");
    }
  });

  return lines.join("\n");
}

export function downloadTextFile(filename, content, mimeType = "text/markdown") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
