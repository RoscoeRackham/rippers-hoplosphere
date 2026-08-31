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
Authored to the installed build's real **schemaVersion 4** envelope; per-recipe DC (`dcOverride`),
progressive salvage, routed Scorch tiers and tool breakage are all native. One piece is deferred: the
**Susurrus gathering environment** (`features.gathering` off) — its element shape needs a live
populated-gathering export; Susurrus material still flows through the shard components. The
emotion/denial aspect register is **GM-side only** and appears in no player-facing string here (brief §3.4).

No Project FU or Fabricate content is redistributed. Not for redistribution.
