# Rippers Unmasked — Hoplosphere Economy

The Lodge's harvested-hoplosphere crafting economy as a **Fabricate** crafting-system file plus the
Project FU **Item compendium** it binds. Personal-table module for Rippers Unmasked (Foundry v13,
Project FU 4.16.2, requires the `fabricate` module).

**The loop:** monster material → *shards* → *hoplospheres*, plus a secondary *accessory setting* recipe.

## What's in the box

- `system/rippers-hoplosphere-system.json` — the Fabricate crafting-system file (**schemaVersion 4**,
  Fabricate 1.9.2) you import with `game.fabricate.api.importSystemFromFile()`.
  **7 essences, 45 components, 2 tools, 21 recipes, 21 recipe cards.**
- `packs/components` — the compendium (68 Item documents) every essence/component/tool/recipe binds to.
- `macros/scorch-check.js` — the external-roll macro for **The Scorch** (FU crits can't be Fabricate
  triggers; see the mapping doc).
- `docs/IMPORT-and-verify.md` — console import + round-trip verification steps.
- `docs/MAPPING-recipes-to-fabricate.md` — recipe-by-recipe mapping and every Fabricate limitation.

## Build

```
npm run build   # regenerate src/packs + system JSON from the brief (tools/build-hoplosphere.mjs)
npm run pack    # compile src/packs/components → packs/components LevelDB (clears first)
npm run unpack  # reverse: packs → src (round-trip a Foundry-edited pack)
```

## Source & scope

Built source-faithfully from `Look Here Claude/hoplosphere-economy-brief.md`. **No rules value is
invented** — where Techno Fantasy Atlas sphere/accessory mechanics would go, a `⚠ owed` marker sits.
**V3 (Sep 2026):** the system JSON is now rebased on the **owner's live 2026-09-07 export**
(Fabricate 1.9.4 normalizer schema) — `npm run build` no longer overwrites it (guarded; see
`tools/build-hoplosphere.mjs`). Filled since V2: **progressive RENDERING salvage** (1d2 per run),
**Decoction `dcOverride: 13`** (Fixation rides the system default 10), the-scorch (simple) restored,
the SCORCH macro bound to the confirmed installed `craftRecipe` signature, and the **source-actor
bench ruling** encoded in `macros/craft-from-lodge-bench.js`. Still deferred, with the export as
proof both remain uncapturable offline: **The Scorch's 3-tier routing** (the live routed check is the
empty default; tier **band values are unruled** — the macro's bands are a flagged approximation) and
the **Susurrus gathering environment** (`gatheringConfig.system` exports as `{}` — shape unrevealed;
see `docs/IMPORT-and-verify.md` §6d for exactly what a populated export must show). The
emotion/denial aspect register is **GM-side only** and appears in no player-facing string here (brief §3.4).

No Project FU or Fabricate content is redistributed. Not for redistribution.
