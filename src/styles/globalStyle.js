export const GLOBAL_STYLE = `
  /* ---- Themeable accent palette (defaults — overridden per-campaign via
     document.documentElement.style, see applyWorldTheme()) ---- */
  :root {
    --accent: #C9A961;
    --accent-bright: #e8c983;
    --accent-mid: #d4af6a;
    --accent-dark: #a9793a;
  }

  /* ---- Color system (plain CSS classes — arbitrary bracket Tailwind values like text-[#xxxxxx]
     are NOT compiled in this environment, so every color must be a real class, not a utility) ---- */
  .tx-gold { color: var(--accent); }
  .tx-cream { color: #E8DCC4; }
  .tx-cream-95 { color: rgba(232,220,196,0.95); }
  .tx-cream-92 { color: rgba(232,220,196,0.92); }
  .tx-cream-90 { color: rgba(232,220,196,0.90); }
  .tx-gold-lt { color: var(--accent-bright); }
  .tx-red { color: #ff6b6b; }
  .tx-ink { color: #0d0b0e; }
  .tx-cream-lt { color: #f2e4c8; }
  .tx-gold-mid { color: var(--accent-mid); }
  .tx-ink2 { color: #140f0a; }
  .ph-cream::placeholder { color: rgba(232,220,196,0.85); opacity: 1; }
  .hover-tx-gold:hover { color: var(--accent); }
  .hover-tx-red:hover { color: #ff6b6b; }
  .hover-bd-gold:hover { border-color: var(--accent); }
  .focus-bd-gold:focus { border-color: var(--accent); }
  .sel-ring { box-shadow: 0 0 0 2px var(--accent); }

  .bd-brown { border-color: #4a3a24; }
  .bd-gold { border-color: var(--accent); }
  .bd-gold-50 { border-color: color-mix(in srgb, var(--accent) 50%, transparent); }
  .bd-crimson { border-color: #7A1F2B; }
  .bd-crimson-60 { border-color: rgba(122,31,43,0.6); }

  .bg-ink { background-color: #0d0b0e; }
  .bg-ink-60 { background-color: rgba(13,11,14,0.6); }
  .bg-ink-40 { background-color: rgba(13,11,14,0.4); }
  .bg-ink-85 { background-color: rgba(13,11,14,0.85); }
  .bg-ink-75 { background-color: rgba(13,11,14,0.75); }
  .bg-ink-30 { background-color: rgba(13,11,14,0.3); }
  .bg-gold { background-color: var(--accent); }
  .bg-gold-5 { background-color: color-mix(in srgb, var(--accent) 5%, transparent); }
  .bg-brown { background-color: #4a3a24; }
  .bg-crimson { background-color: #7A1F2B; }
  .bg-crimson-40 { background-color: rgba(122,31,43,0.4); }
  .bg-crimson-30 { background-color: rgba(122,31,43,0.3); }
  .bg-crimson-25 { background-color: rgba(122,31,43,0.25); }
  .overlay-dark { background-color: rgba(0,0,0,0.5); }
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Spectral+SC:wght@600&display=swap');
  .display-font { font-family: 'Cinzel', serif; }
  .mono-font { font-family: 'Spectral SC', serif; }

  .scene-bg {
    background-color: #0a0809;
    background-image:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E"),
      radial-gradient(ellipse at 50% -10%, #2b2013 0%, #140f0a 55%, #0a0809 100%);
    background-blend-mode: overlay, normal;
  }

  @keyframes flicker { 0%,100%{opacity:1} 45%{opacity:.85} 50%{opacity:.7} 55%{opacity:.9} }
  .flicker-border { animation: flicker 4.5s ease-in-out infinite; }

  * { transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }

  .parchment-card {
    position: relative;
    background:
      linear-gradient(165deg, rgba(154,110,52,0.16) 0%, rgba(28,20,13,0.7) 55%, rgba(20,14,9,0.85) 100%),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
    background-blend-mode: normal, overlay;
    border: 1px solid color-mix(in srgb, var(--accent-mid) 40%, transparent);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 24px rgba(0,0,0,0.3), 0 12px 28px -8px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3);
    transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
  }
  .parchment-card::before {
    content: '';
    position: absolute; inset: 4px;
    border: 1px solid color-mix(in srgb, var(--accent-mid) 16%, transparent);
    border-radius: inherit;
    pointer-events: none;
  }
  .parchment-card:hover { border-color: color-mix(in srgb, var(--accent-mid) 75%, transparent); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 24px rgba(0,0,0,0.3), 0 16px 34px -8px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.3); }

  .glass-panel {
    backdrop-filter: blur(14px) saturate(1.2);
    -webkit-backdrop-filter: blur(14px) saturate(1.2);
  }

  button { transition: transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.2s ease, background-color 0.2s ease; }
  button:active:not(:disabled) { transform: scale(0.97); }
  .btn-gold:hover:not(:disabled), .btn-crimson:hover:not(:disabled) { transform: translateY(-2px); }
  .btn-gold:active:not(:disabled), .btn-crimson:active:not(:disabled) { transform: translateY(0) scale(0.97); }

  input, textarea, select { transition: border-color 0.25s ease, box-shadow 0.25s ease; }
  input:focus, textarea:focus, select:focus { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-mid) 18%, transparent); }


  .corner-brackets {
    background-image:
      linear-gradient(to right, var(--accent-mid) 2px, transparent 2px), linear-gradient(to bottom, var(--accent-mid) 2px, transparent 2px),
      linear-gradient(to left, var(--accent-mid) 2px, transparent 2px), linear-gradient(to bottom, var(--accent-mid) 2px, transparent 2px),
      linear-gradient(to right, var(--accent-mid) 2px, transparent 2px), linear-gradient(to top, var(--accent-mid) 2px, transparent 2px),
      linear-gradient(to left, var(--accent-mid) 2px, transparent 2px), linear-gradient(to top, var(--accent-mid) 2px, transparent 2px);
    background-repeat: no-repeat;
    background-size: 14px 2px, 2px 14px, 14px 2px, 2px 14px, 14px 2px, 2px 14px, 14px 2px, 2px 14px;
    background-position: top 10px left 10px, top 10px left 10px, top 10px right 10px, top 10px right 10px, bottom 10px left 10px, bottom 10px left 10px, bottom 10px right 10px, bottom 10px right 10px;
  }

  .ornate-divider { position: relative; height: 1px; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent-mid) 70%, transparent), transparent); margin: 10px 0; }
  .ornate-divider::after { content: '\\2726'; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); color: var(--accent-mid); font-size: 11px; background: #140f0a; padding: 0 10px; }

  .gold-engraved {
    background: linear-gradient(180deg, var(--accent-bright) 0%, var(--accent-mid) 45%, var(--accent-dark) 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent;
    filter: drop-shadow(0 1px 0 rgba(0,0,0,0.6));
  }

  .btn-gold {
    background: linear-gradient(180deg, var(--accent-bright) 0%, var(--accent) 50%, var(--accent-dark) 100%);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.25), 0 3px 8px rgba(0,0,0,0.4);
    border: 1px solid rgba(80,58,20,0.6);
  }
  .btn-gold:active { box-shadow: inset 0 2px 4px rgba(0,0,0,0.35); }

  .btn-crimson {
    background: linear-gradient(180deg, #a53a48 0%, #7A1F2B 55%, #5c1620 100%);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.3), 0 3px 10px rgba(0,0,0,0.45);
    border: 1px solid rgba(40,10,14,0.6);
  }
  .btn-crimson:active { box-shadow: inset 0 2px 4px rgba(0,0,0,0.35); }

  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-thumb { background: #4a3a24; border-radius: 4px; }
  @keyframes rise { 0%{transform:translateY(0) translateX(0);opacity:0} 10%{opacity:.8} 100%{transform:translateY(-110vh) translateX(var(--drift));opacity:0} }
  .ember { position:absolute; bottom:-10px; border-radius:999px; background: radial-gradient(circle,#ffb26b 0%,#C9A961 40%,transparent 75%); pointer-events:none; }
  @keyframes shakeX { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
  .shake { animation: shakeX .4s ease-in-out; }
  @keyframes slideInR { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
  @keyframes slideInL { from{opacity:0;transform:translateX(-24px)} to{opacity:1;transform:translateX(0)} }
  .slide-in-r { animation: slideInR .28s ease-out; }
  .slide-in-l { animation: slideInL .28s ease-out; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .fade-up { animation: fadeUp .35s ease-out; }
  @keyframes pulse2 { 0%,100%{opacity:.4} 50%{opacity:1} }
  .pulse-dot { animation: pulse2 1.2s ease-in-out infinite; }

  .scene-bg { position: relative; }
  .vignette-layer { position: fixed; inset: 0; pointer-events: none; z-index: 1; background: radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,0.55) 100%); }

  .narration-text::first-letter {
    font-family: 'Cinzel', serif;
    font-size: 2.6em;
    font-weight: 700;
    float: left;
    line-height: 0.8;
    padding: 0.05em 0.08em 0 0;
    color: var(--accent);
    text-shadow: 0 0 12px color-mix(in srgb, var(--accent) 35%, transparent);
  }

  @keyframes quillWrite { 0%,100% { transform: rotate(-3deg) translateX(0); } 50% { transform: rotate(3deg) translateX(2px); } }
  .quill-write { animation: quillWrite 0.6s ease-in-out infinite; transform-origin: bottom left; }

  .hp-fill { transition: width 0.4s ease, background-color 0.4s ease; }

  .campfire-glow {
    position: absolute; inset: -60% ; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,140,60,0.35) 0%, rgba(201,169,97,0.12) 40%, transparent 70%);
    animation: glowPulse 3.2s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes glowPulse { 0%,100% { opacity: 0.8; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }

  .log { position: absolute; bottom: 6px; width: 64px; height: 12px; border-radius: 6px; background: linear-gradient(180deg, #5c3d22, #2e1f11); }
  .log-left { left: 50%; transform: translateX(-50%) rotate(18deg); }
  .log-right { left: 50%; transform: translateX(-50%) rotate(-18deg); }

  .flame-shape {
    position: absolute; bottom: 14px; left: 50%;
    border-radius: 50% 50% 50% 0;
    transform-origin: bottom center;
    filter: blur(0.3px);
  }
  @keyframes flicker1 { 0%,100% { transform: translateX(-50%) rotate(45deg) scale(1); } 50% { transform: translateX(-50%) rotate(45deg) scale(1.06) translateY(-2px); } }
  @keyframes flicker2 { 0%,100% { transform: translateX(-50%) rotate(45deg) scale(1); } 50% { transform: translateX(-50%) rotate(45deg) scale(1.1) translateY(-3px) rotate(50deg); } }
  @keyframes flicker3 { 0%,100% { transform: translateX(-50%) rotate(45deg) scale(1); } 50% { transform: translateX(-50%) rotate(45deg) scale(0.94) translateY(-1px); } }
  .flame-1 { width: 58px; height: 58px; background: #7A1F2B; animation: flicker1 1.8s ease-in-out infinite; opacity: 0.9; }
  .flame-2 { width: 42px; height: 42px; background: #d4af6a; animation: flicker2 1.3s ease-in-out infinite; opacity: 0.95; }
  .flame-3 { width: 24px; height: 24px; background: #f8e3a3; animation: flicker3 0.9s ease-in-out infinite; }
  .bg-hp-good { background-color: #4a9b5e; }
  .bg-hp-mid { background-color: #d4af6a; }
  .bg-hp-low { background-color: #ff6b6b; }

  @keyframes sceneIn {
    0% { opacity: 0; transform: scale(0.97) translateY(8px); filter: blur(6px); }
    60% { filter: blur(0); }
    100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
  }
  .screen-transition { animation: sceneIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }

  @keyframes drawerIn {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .drawer-transition { animation: drawerIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }

  @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
  .overlay-transition { animation: overlayIn 0.25s ease-out both; }
`;
