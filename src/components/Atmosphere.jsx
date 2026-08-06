import React, { useMemo } from "react";

export default function Atmosphere() {
  const EMBERS = useMemo(() => Array.from({ length: 16 }, (_, i) => ({
    id: i,
    left: (i * 37 + 5) % 100,
    size: 3 + ((i * 13) % 5),
    duration: 8 + ((i * 7) % 10),
    delay: (i * 1.3) % 12,
    drift: ((i % 2 === 0 ? 1 : -1) * (10 + (i * 5) % 40)),
  })), []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {EMBERS.map((e) => (
        <div
          key={e.id}
          className="ember"
          style={{ left: `${e.left}%`, width: e.size, height: e.size, animation: `rise ${e.duration}s linear ${e.delay}s infinite`, "--drift": `${e.drift}px` }}
        />
      ))}
    </div>
  );
}
