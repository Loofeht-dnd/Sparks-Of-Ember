# Companions

## What's implemented

- The AI can mark a known NPC as a companion via `[COMPANION:{...}]` (see
  `utils/parser.js`'s `extractCompanion`, and rule 14 in
  `utils/promptBuilder.js`), giving them `hp`/`ac`/`atk`/`dmg` combat stats.
- That data is stored on the NPC's entry in `npcRegistry` (`isCompanion: true`,
  `companionStats: {...}`) in `GameScreen.jsx`, persisted in saves.
- `CharacterSheetPanel.jsx` shows a "Companions" section with each one's
  portrait, name, and current/max HP.
- **Companions now actually fight.** Any companion with HP remaining joins
  `combat.order` when a fight starts, takes their own turn in initiative
  order, and attacks a random living enemy (`companionTurn` in
  `GameScreen.jsx`, deliberately written to mirror `enemyTurn`'s exact
  structure so the two are easy to compare). Damage they take or deal
  persists — `endCombat` writes their ending HP back into `npcRegistry`, so
  they don't full-heal between fights, and a companion reduced to 0 HP sits
  out of the next one instead of reappearing at full health.

## What's deliberately still scoped out

- **Enemies never target companions.** `enemyTurn` was left completely
  unchanged — enemies still always attack the player. Companions only ever
  deal damage, they don't draw enemy fire. This was a conscious choice: the
  original code has exactly one hardcoded assumption (`playerSnapshot`) about
  who gets attacked, and changing that means deciding real design questions
  (target priority? does the player choose who protects whom? can an enemy
  focus-fire the squishiest companion?) rather than an obvious mechanical
  extension. Shipping a guess there felt riskier than shipping nothing.
- **No revival/healing for downed companions** beyond whatever the story
  itself provides — there's no in-app "heal your companion" action.
- **Victory/defeat conditions are unchanged** beyond correctly excluding
  companions from the "are enemies still alive" check. A companion going
  down never ends the fight; only the player's HP and the enemies' HP do.

## Why this was safe to build (unlike earlier in this project)

Every place in `GameScreen.jsx` that used `!c.isPlayer` as a stand-in for
"this is an enemy" had to be found and updated to also exclude companions —
there were five of them (enemy portrait generation, the victory-condition
check, the player's target-selection list, and the post-victory XP
calculation each had this exact bug during development; the fifth,
`enemyTurn`'s own targeting, was intentionally left alone per above). Getting
that audit right — not missing one — was the actual risk in this feature,
more than the new `companionTurn` function itself, which mostly just copies
`enemyTurn`'s already-proven pattern with a different target-selection rule.
That's a fundamentally different (and smaller) kind of change than redesigning
the turn/state machine itself, which is why this was tackled after everything
else rather than first.
