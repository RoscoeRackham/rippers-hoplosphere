# Rippers Unmasked — Hoplosphere Economy

The Lodge's harvested-hoplosphere crafting economy as a **Fabricate** crafting-system file plus the
Project FU **Item compendium** it binds. Personal-table module for Rippers Unmasked (Foundry v13,
Project FU 4.16.2, requires the `fabricate` module).

**The loop:** monster material → *shards* → *hoplospheres*, plus a secondary *accessory setting* recipe.

## What's in the box

- `system/rippers-hoplosphere-system.json` — the Fabricate `FabricateExportModel` you import with
  `game.fabricate.api.importSystemFromFile()`. **7 essences, 47 components, 21 recipes.**
- `packs/components` — the compendium (68 Item documents) every component/recipe/output binds to.
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
Four runtime features are **stubbed** pending the installed build's V3 export envelope (search
`TODO(V3)`): progressive salvage yield, per-system check DLs, the Scorch tier bands, and the Susurrus
gathering environment. The emotion/denial aspect register is **GM-side only** and appears in no
player-facing string here (brief §3.4).

No Project FU or Fabricate content is redistributed. Not for redistribution.
