import React from "react";

export default function Campfire({ size = 140 }) {
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div className="campfire-glow" />
      <div className="log log-left" />
      <div className="log log-right" />
      <div className="flame-shape flame-1" />
      <div className="flame-shape flame-2" />
      <div className="flame-shape flame-3" />
    </div>
  );
}
