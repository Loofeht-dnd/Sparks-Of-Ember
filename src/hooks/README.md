# Why this folder is (mostly) empty

Your refactor spec asked for `hooks/useCombat.js`, `useCharacter.js`, `useStory.js`,
`useInventory.js`, `useSaveGame.js`, and `useAI.js`. I made a deliberate, scoped
call not to force `GameScreen.jsx`'s internal state into those six hooks in
this pass, and want to explain why rather than silently skip it.

## What's actually in GameScreen.jsx

It's ~30 `useState` hooks and a dozen `useEffect`s that are **tightly
interdependent** — e.g. `resolveLevelUp` closes over `level`, `abilityBonuses`,
and `character`; `pushDMResult` calls `startCombat`, `setMapData`, `awardXp`,
and `setPendingRoll` depending on what the AI reply contains; the autosave
effect depends on nine different pieces of state; combat's enemy-turn effect
depends on `combat` and drives `setCombat` updates that other combat functions
also mutate. It's a single, coherent state machine, not six independent
concerns that happen to share a file.

## Why I didn't split it anyway

Splitting that into separate hooks means re-threading which functions close
over which state, in which order effects fire, and what each hook returns —
and I had **no way to compile or run this project** in the sandbox I built it
in (no network access, so no `npm install` / `vite build` / actual playtesting).
I verified everything else in this refactor two ways: `esbuild` bundle-checked
the whole import/export graph (catches syntax errors and wrong import names),
and a line-by-line diff against your original file (confirms zero logic
changes). Neither of those catches a subtly wrong `useEffect` dependency array
or a stale closure — the exact bugs a blind hook-split risks introducing. You
were explicit that gameplay must keep working exactly as it does today, so I
prioritized that guarantee over finishing this part of the folder structure.

## A safe path to actually do this

If you want GameScreen properly split, the lowest-risk order (each step
buildable/testable before the next) is roughly:

1. `useSaveGame.js` — wraps `services/saveManager.js` + the autosave `useEffect`.
   Lowest risk: it only reads state, doesn't produce any.
2. `useCharacterProgress.js` — `level`, `xp`, `abilityBonuses`,
   `levelUpQueue`/`pendingLevelUp`, `charLevel`, `resolveLevelUp`, `awardXp`.
3. `useInventory.js` — `journal`, `inventory`, the item/note extraction
   handling currently inside `pushDMResult`.
4. `useCombat.js` — the biggest one: `combat`, `diceAnim`, `extraAttackUsed`,
   `spellSlotsUsed`, and every `player*`/`enemyTurn`/`startCombat`/`endCombat`
   function. Do this last, after the others are proven out, since it's the
   most interconnected.
5. `useAI.js` last, once the others exist to call into — it's mostly a thin
   wrapper around `services/aiService.js` plus `log`/`history`/`loading`/`error`.

Do each step with `npm run dev` open and actually play through character
creation → a fight → a level-up → a save/reload, before moving to the next
hook.
