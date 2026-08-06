# Sparks of Ember — AI Dungeon Master (free, Gemini-powered edition)

A solo D&D campaign narrated by an AI Dungeon Master — character creation,
combat, an auto-updating journal and inventory, a generated character
portrait — running on Google's **free Gemini API**. No credit card, no
bill, and no device-compatibility headaches (unlike the on-device version,
this works on any phone/laptop with a normal browser and internet
connection — no WebGPU required).

## Architecture

This codebase was refactored from a single ~2,500-line `App.jsx` into a
modular structure. **Gameplay and UI behavior are unchanged** — every
extracted piece of logic was diffed line-by-line against the original file
to confirm nothing but its location (and, in a few clearly-marked spots, its
wrapping) moved. See "Verification" below for how that was checked without
a working `npm install` in the environment this refactor was done in.

### Folder layout

```
src/
  App.jsx                 Thin top-level orchestrator: which screen is showing
                           (loading / api-key setup / title / character
                           creator / story setup / play) and the save-slot
                           state that gets handed to GameScreen.

  components/              One file per screen/panel. Each is still a plain
    CharacterCreator.jsx    React function component with its own local
    StorySetup.jsx          useState for UI-only state (step index, form
    GameScreen.jsx           fields) — same as before, just in its own file.
    CharacterSheetPanel.jsx  GameScreen.jsx is intentionally still the
    MapPanel.jsx             largest file (~1,050 lines): see "Why GameScreen
    LevelUpModal.jsx         wasn't split further" below.
    TitleScreen.jsx
    ApiKeySetup.jsx          Rewritten for encrypted key storage — see below.
    ProviderCard.jsx
    Atmosphere.jsx, Campfire.jsx   Small decorative pieces.

  constants/               Pure data: races, classes, backgrounds, ability
                            score rules, leveling tables, map/compass
                            layout, story tone options, default theme.
                            No logic, nothing that changes at runtime.

  utils/                   Pure functions, no React, no I/O (except
    dice.js, modifiers.js,  theme.js touching document.documentElement,
    id.js, leveling.js,     which is the one exception — it's a DOM side
    combatMath.js,           effect but not a network/storage one).
    parser.js,              parser.js holds the [ROLL]/[COMBAT]/[MAP]/
    promptBuilder.js,       [ITEM_ADD]/[XP]/[THE_END] tag extractors the
    theme.js, time.js,      AI's replies are parsed with. promptBuilder.js
    validators.js           builds the Dungeon Master system prompt.
                            validators.js is new — see "Type safety" below.

  services/                Anything that talks to the network or persists
    providers.js             data lives here.
    keyStorage.js
    aiService.js
    saveManager.js

  styles/globalStyle.js    The big CSS-in-JS template string (moved as-is).

  hooks/, contexts/         Present per the requested structure, but left
                            mostly as READMEs explaining a scoped decision
                            not to force GameScreen's state through them
                            in this pass — see those files for why, and for
                            a concrete safe path to do it properly later.
```

### AI provider abstraction

```
GameScreen / components
      |
      v
services/aiService.js     <- generateNarration() / generateJSON() / generateImage()
      |
      v
services/providers.js     <- provider-agnostic: picks the first configured
      |                       provider in order, retries the next on failure
      v
Gemini / Groq / OpenRouter (or a future entry added to the PROVIDERS map)
```

Nothing above `providers.js` needs to change to add a new provider — including
a future backend proxy, if you ever want to stop shipping keys to the browser
at all. Add an entry to `PROVIDERS` in `services/providers.js`, a request
function alongside `callGemini`/`callOpenAICompatible`, and everything above
it keeps working unchanged.

### API key storage

Previously, API keys sat in `localStorage` as plain JSON. They're now
encrypted at rest with the browser's native **Web Crypto API** (AES-GCM) —
see `services/keyStorage.js`. Three storage modes are available per
provider, chosen in the API key setup screen:

- **Remember permanently** — encrypted, survives closing the browser
  (`localStorage`).
- **This session only** — encrypted, cleared when the tab/browser session
  ends (`sessionStorage`).
- **Never remember** — kept only in memory for that page load, never
  written to disk at all.

**Read this honestly, not optimistically**: the AES key that wraps each
stored API key lives in the same browser storage as the ciphertext. Anyone
with the level of access needed to read your `localStorage` (devtools,
another browser extension, physical access to the unlocked device) can also
read the wrapping key and decrypt your API key. This raises the bar above
"plain text visible in devtools," but it is **not** real secrecy — only a
server-side proxy holding the key server-side can actually achieve that,
and this project deliberately has no server. The setup screen says this
plainly rather than implying otherwise.

Existing plain-text keys from before this refactor are migrated
automatically and transparently the first time the app loads — nothing
breaks, no re-entering keys required.

Key management now also includes: format validation before saving (catches
obviously-wrong pastes with a real error message instead of a silent
failure later), a **Test connection** button per provider that fires one
minimal real request, and a **Remove key** button that clears it from every
storage location.

### Save system

`services/saveManager.js` wraps the single save slot with a `version`
field and a `migrate()` hook, so a future change to the save shape can
upgrade old saves instead of breaking them:

```
load: window.storage -> migrate(data) -> validate(data) -> GameScreen
save: GameScreen state -> { ...state, version: CURRENT_SAVE_VERSION } -> window.storage
```

`exportSave()`/`importSave()` are included for a future "download/upload
your save" feature, built on the same migration path.

### Type safety without TypeScript

`utils/validators.js` adds runtime shape checks (`isValidCharacter`,
`isValidSaveData`, `isValidInventoryItem`) used by the save system so a
corrupted or hand-edited save file fails gracefully (falls through to
character creation) instead of crashing the app with `undefined` property
errors deep in a render.

### Why GameScreen wasn't split further

`GameScreen.jsx` is still one ~1,050-line file, not six hooks. This was a
deliberate call, not an oversight — full explanation, and a concrete safe
path to actually do it, is in `src/hooks/README.md` and
`src/contexts/README.md`. Short version: its ~30 `useState` hooks are
tightly interdependent (combat, leveling, autosave, and AI calls all close
over each other's state), and this refactor was done without a working
`npm install`/`vite build` in the sandbox — so anything riskier than a
verified-identical move was out of scope for this pass, given "preserve
100% of existing gameplay" was the explicit top priority.

### Verification

No `npm install` was possible in the environment this refactor was written
in (no network access), so nothing here has been run through Vite or a
browser. What **was** possible and was done:

1. Every new/moved file was bundled with `esbuild` (bundler mode, ESM,
   React/lucide-react marked external) from the new `App.jsx` entry point.
   This resolves every relative import against real files and checks every
   named import actually exists as an export in its target module — it
   completed with zero errors or warnings, confirming the whole module
   graph wires together correctly and nothing is orphaned.
2. Every extracted component/util/constant file was diffed line-by-line
   against the matching span of the original `App.jsx`. Every diff is
   either `function X` → `export default function X`, or one of the small,
   explicitly-listed substitutions above (`callDM` → `generateNarration`,
   the two raw `chatComplete` JSON calls → `generateJSON`, the raw
   `window.storage.set("save", ...)` → `saveGame(...)`).

**Before you rely on this in production**: run `npm install && npm run dev`
and play through character creation → a fight → a level-up → save/reload →
continue, exactly like you would after any refactor. Structural correctness
was verified; an actual playthrough wasn't possible here.

- **Storage**: browser `localStorage`/`sessionStorage` (via
  `src/storage-polyfill.js` for the save slot, `services/keyStorage.js` for
  API keys) — your save and your API key live only on the device/browser
  you play on.
- **PWA**: `vite-plugin-pwa` generates the manifest + service worker for a
  real installable app shell.

## New gameplay features (this pass)

Built on top of the architecture refactor above, additive to the verified
core game loop:

- **NPCs with real personalities, run by the AI, with generated portraits.**
  The AI now registers named NPCs it introduces (`[NPC:...]` — id, name,
  role, personality, appearance) and the system prompt feeds a running
  "KNOWN NPCS" list back to it every turn, so the same character stays
  consistent across a whole session instead of drifting. Each registered NPC
  gets a small AI-generated portrait automatically (`GameScreen.jsx`'s
  portrait effect, reusing the same image pipeline as your own character
  portrait). This is also the first layer of AI memory: it's scoped to
  keeping *who's who* consistent, not to summarizing/compressing the full
  conversation history — see the "Verification" section above's spirit for
  why the bigger token-management piece wasn't attempted blind.
- **Speaker avatars in the story log.** The AI can tag a reply with
  `[SPEAKER:id]` when a specific NPC is the focus of that beat; the log then
  shows that NPC's portrait + name next to their dialogue
  (`components/SpeakerAvatar.jsx`). Your own messages show your character's
  portrait the same way.
- **Multiple save slots.** `services/saveManager.js` now supports named
  slots; your title screen lists every in-progress story with its own
  Continue/Delete. Anyone's pre-existing single save keeps working
  automatically — it's just the first slot now, same storage key as before.
- **Local AI via Ollama.** A fourth provider option with no API key — just
  an enable toggle, base URL, and model name (`components/OllamaCard.jsx`).
  Needs Ollama running locally with `OLLAMA_ORIGINS=*` so the browser can
  reach it, and the model already pulled.
- **Companion data model** (`[COMPANION:...]` tag, shown in the character
  sheet's new "Companions" section) — tracked and displayed, but
  deliberately **not** wired into autonomous combat turns yet. Full
  reasoning and a concrete safe path to add real companion combat AI is in
  `docs/COMPANIONS.md`.

## More gameplay features (second pass)

- **Companions now actually fight.** Any recruited companion with HP
  remaining joins combat, takes their own turn, and attacks a random living
  enemy — persisted across fights (they don't full-heal between encounters).
  Enemies still only target the player, deliberately — see the updated
  `docs/COMPANIONS.md` for exactly what's scoped in vs. out and why.
- **Equip slots.** Classes with more than one starting weapon (e.g. a Rogue's
  rapier vs. shortbow) can now actually switch which one they're wielding
  from the character sheet — it changes the real attack profile used in
  combat, not just flavor text.
- **Conversation memory/summarization.** Once a session's history grows past
  a threshold, the oldest chunk gets compressed into a rolling summary (fed
  back into the system prompt) and dropped from what's sent to the AI on
  future turns — bounds token usage/latency on long sessions without losing
  context, and never touches what's shown on screen, only what's sent to the
  API.
- **Ambient audio + narration read-aloud** — one toggle, fully procedural
  (Web Audio oscillators/noise — no sound files to host), covers a background
  ambience bed, a few SFX cues (dice rolls, level-ups, XP), and reading DM
  replies aloud via the browser's built-in speech synthesis.
- **Voice input** — speak your action instead of typing, via the browser's
  native speech recognition (shows up only where the browser supports it).
- **Shareable adventure recap** — downloads a formatted markdown file of your
  quests, the NPCs you've met, your journal, and the full story log.
- **Reference-image portrait consistency** — portrait re-rolls and scene
  illustrations now build on the character's existing portrait as a
  reference instead of generating an unrelated image each time.

## 1. Get a free Gemini API key (takes ~1 minute)

1. Go to **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)**
2. Sign in with any Google account
3. Click **"Create API key"** — no credit card required
4. Copy the key (starts with `AIza...`)

You'll paste this directly into the app on first launch — it's saved only
in that browser's local storage, never sent anywhere except directly to
Google's API.

## 2. Install dependencies

```bash
npm install
```

## 3. Run it locally

```bash
npm run dev
```

Open the printed localhost URL, paste in your key when prompted, and play.

## 4. Deploy it for free

This is a fully static site — no backend, so any free static host works:
Netlify, Vercel, Cloudflare Pages, GitHub Pages, all fine.

```bash
npm run build
```

Then either drag the `dist/` folder to **[app.netlify.com/drop](https://app.netlify.com/drop)**,
or push it to a GitHub repo named `yourusername.github.io` and enable
Pages in that repo's Settings (see the full phone-only walkthrough at the
end of this file if you're setting this up without a computer).

## 5. Install it on your phone or laptop

Open your deployed URL, then:

- **Android (Chrome)**: menu → "Install app" or "Add to Home Screen"
- **iPhone (Safari)**: Share → "Add to Home Screen"
- **Laptop (Chrome/Edge)**: click the install icon in the address bar

## AI-generated images (new!)

Beyond text, the game can now generate real illustrations using Gemini's
free image model (`gemini-2.5-flash-image`, aka "Nano Banana"):

- **Character portrait**: an "Illustrate Me" button in the character sheet
  panel generates a real portrait image based on your species/class/
  background/personality/backstory (in addition to the text portrait,
  which still generates automatically).
- **Scene illustrations**: an "Illustrate This Scene" button in the map
  panel generates artwork for your current location. This resets each
  time you move somewhere new — it's on-demand, not automatic, both to
  save your free daily image quota and to keep the game responsive.

**Free tier as of this writing**: ~500 images/day, ~10/minute, 1024x1024
resolution, no billing required. Google's newer "Pro" image models do
require billing, which is why this deliberately stays on the free one —
if Google renames or retires `gemini-2.5-flash-image`, update the image
model URL in `src/services/providers.js`'s `generateImage()`.

Dice-roll animations (yours and enemies', in combat) are unrelated to any
of this — those are pure frontend animation and have worked since the
combat system was first built.

## Real D&D leveling (new!)

Characters used to be permanently Level 1. Now the game tracks real
progression, following 2024 D&D rules where our simplified engine can
support them:

- **XP & leveling**: defeating enemies in combat awards XP automatically
  (scaled roughly by their HP/AC/attack as a difficulty proxy). The AI DM
  also awards XP for meaningful non-combat accomplishments — solving a
  problem cleverly, finishing a quest, a strong roleplay moment.
- **HP growth**: every level adds your class's average hit die + CON
  modifier to your max HP, same as the tabletop rule.
- **Proficiency bonus scaling**: +2 through level 4, +3 through 8, up to
  +6 at levels 17-20 — this raises your attack rolls, skill checks, and
  saves as you level, not just your HP.
- **Ability Score Improvements**: at levels 4, 8, 12, 16, and 19, a
  level-up modal lets you choose +2 to one ability or +1 to two.
- **Extra Attack**: Fighters, Barbarians, Paladins, and Rangers unlock a
  second attack per turn at level 5 — the combat UI lets you attack twice
  before your turn ends.
- **Spell slots**: Wizards, Clerics, and Bards (and anyone with the
  Magic Initiate origin feat) get a real, level-scaling pool of spell
  slots for a stronger "Cast Spell" combat action, separate from the
  always-free cantrip. This is a simplified single-pool version of 5e's
  spell slot system rather than a full per-spell-level table, since the
  game doesn't track an actual spell list.

**What's still simplified rather than fully real 5e**: no full spell
list/spell selection, no subclasses, no non-ASI feats beyond the origin
feats from character creation, no multiclassing. This is meant to make
long campaigns feel like they're actually progressing, not to be a
complete tabletop ruleset.

## Multiple free AI providers, with automatic failover

You're not locked into one provider. **Just paste a key for any of these
to activate it** — no extra toggle, no extra step. The game tries them
**in this order**, and if one hits a rate limit (or wasn't given a key),
it silently falls through to the next instead of stopping the story:

1. **Google Gemini** — the best writing quality of the three; free key at
   [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
   Also the only one that supports free image generation.
2. **Groq** — extremely fast responses, running Llama models; free key at
   [console.groq.com/keys](https://console.groq.com/keys). Tighter
   tokens-per-minute limit than Gemini, which is exactly why it's useful
   as a second option rather than a replacement.
3. **OpenRouter** — free key at
   [openrouter.ai/keys](https://openrouter.ai/keys); pick any model whose
   ID ends in `:free`. A good third layer since it aggregates several
   different free-tier models behind one key.

You only need **one** to play. **If you're playing a long session, adding
all three is genuinely worth the few extra minutes of signup** — each
service needs its own separate free account (I can't create these for
you), but once all three keys are pasted in, the game automatically
spreads across them as needed with zero further effort from you.

Longer replies: narration now requests up to ~2,048 tokens per turn
(up from the earlier ~800), since running multiple providers gives more
total headroom to work with. If you notice free-tier limits coming up
faster than before, that's the tradeoff — you can lower this in `generateNarration()`'s call to `chatComplete()`
in `src/services/aiService.js` if you'd rather prioritize more turns over
longer ones.

## The UI adapts to your world

Renamed to **Sparks of Ember** — the title screen is now a campfire scene
(every story starts around the fire, whatever kind of story it is).

Beyond gear names, the game's **color palette itself shifts to match
whatever world you describe** — a grimdark sci-fi war might pull the UI
toward blood-red and gunmetal tones, a bright creature-collecting
adventure toward vivid blue and gold, a pirate world toward teal and
brass. This is generated once per campaign (alongside the gear
reflavoring) and applied live via CSS variables — no page reload needed.
It resets back to the default warm gold palette on the title screen and
character creator between playthroughs, so a strongly-themed campaign
doesn't bleed into your next one. Like gear reflavoring, this is a pure
nice-to-have — if it fails for any reason, the game just keeps the
default palette, nothing breaks.

## World-flavored gear

If you described a specific world/setting on the "Set the Scene" screen
(a Warhammer 40k-style world, a One Piece-style pirate world, whatever),
your starting gear is automatically renamed to match it the moment the
session begins — a Longbow might become a "Lasgun," a Longsword a
"Power Blade" — while a short note ("Functions as: Longbow") keeps the
mechanics clear. The Items panel shows both. New items found during play
get the same treatment. If gear reflavoring fails for any reason (a
provider hiccup, an odd response), the game just quietly falls back to
plain D&D item names — nothing breaks, it's a pure nice-to-have layered
on top of the actual mechanics, which never change.

## Skipping the setup screen entirely — a shared backend for multiple players

If you want players to open the game and start playing with **zero setup at
all** — no key, not even a one-time paste — the real way to do that is a
small backend that holds a pool of your own free-tier keys server-side and
proxies requests through it. That's a separate project:
**`ember-proxy-worker`** (a Cloudflare Worker), not part of this repo.

Deploy it (see its own README for the full walkthrough — Cloudflare
account, a few free API keys, one `wrangler deploy`), then point this game
at it:

```
VITE_PROXY_URL=https://your-worker-name.your-subdomain.workers.dev
```

Rebuild, redeploy, and the game skips straight to the title screen for
every player — no per-player setup, ever. It automatically falls back to
whatever's in the sections below (a player's own key, Ollama) if the shared
pool is ever rate-limited, so nothing here removes those options — it just
means most players never need to reach for them.

**The honest tradeoff**: this is a real second deployment to maintain (a
Cloudflare account, secrets, a running Worker), and a shared pool has a real
capacity ceiling — see `ember-proxy-worker/src/index.js`'s top comment for
exactly how it manages that (multiple pooled keys, per-device fair-use
limits, graceful fallback) and where that ceiling honestly is.

## Skipping the setup screen for a solo personal deploy

If this deploy is just for you, you can bake a default key in at build time
so the app never shows the "connect your AI" screen at all:

1. Copy `.env.example` to a new file named `.env` in the project root.
2. Fill in a real key, e.g. `VITE_GEMINI_API_KEY=your-key-here`.
3. Run `npm run build` (or `npm run dev`) again.

**Read `.env.example` before doing this** — the short version: there's no
backend here, so this key still ends up inside the JS your browser
downloads, readable by anyone who opens dev tools on that URL. Fine for a
link only you use; don't share that URL or commit a filled-in `.env` to a
public repo (it's already gitignored — keep it that way). Pasting your key
into the in-app setup screen with "Remember permanently" achieves the same
"never type it again" result with less exposure, since nothing leaves your
own browser's encrypted storage — this `.env` route is purely for skipping
even that one-time paste on a fresh install.

## Choosing a model per provider

Each provider's card on the setup screen has its own model dropdown:

- **Gemini**: Fastest (Flash-Lite) / Balanced (Flash, recommended) / Best
  Quality (Pro, much lower daily quota).
- **Groq**: Llama 3.3 70B (recommended) / Llama 3.1 8B (fastest).
- **OpenRouter**: any free-tier model — swap the IDs in
  `src/services/providers.js` for others if you want different ones.

**If a model name stops working**: providers occasionally rename or
retire free-tier models. Check the provider's docs for the current free
lineup, then edit that provider's `models` array in
`src/services/providers.js`.

## Honest limitations

- **Free tier rate limits**: Google's free tier caps requests per minute
  and per day (varies by model — Flash-Lite allows the most, Pro the
  fewest). If you hit a limit mid-session, the game shows a clear error
  and lets you retry — it doesn't crash, but you may need to wait a bit
  or switch to a lighter model.
- **Your key lives in the browser**: since there's no backend, the key is
  visible in this browser's storage and in network requests if someone
  inspected them. There's no bill at risk on the free tier (worst case is
  your quota gets used up for the day), but don't reuse a key you've also
  enabled billing on elsewhere.
- **Single device saves**: saves live in that browser's `localStorage`
  only — no sync across devices. Your API key is also per-browser, so
  you'll paste it in again on each new device.
- **Data usage note**: unlike the on-device version, this needs an
  internet connection every time you play (each DM reply is a live API
  call) — there's no offline mode in this edition.
- **Writing quality**: noticeably better than the small on-device models,
  genuinely closer to the Claude-hosted version — but it's still a
  different model with its own quirks and occasional inconsistencies.
