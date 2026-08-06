export const rollD20 = () => 1 + Math.floor(Math.random() * 20);

export function rollDiceExpr(expr) {
  const m = String(expr).match(/(\d+)d(\d+)([+-]\d+)?/i);
  if (!m) return { total: 0, raws: [] };
  const n = +m[1], sides = +m[2], flat = m[3] ? parseInt(m[3], 10) : 0;
  const raws = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * sides));
  return { total: raws.reduce((a, b) => a + b, 0) + flat, raws };
}
