# Hoplosphere crafting system — import + round-trip verification (schemaVersion 4)

Console steps for god / Austin to run **in-world** (as GM). The module must be installed and enabled,
`fabricate` (**1.9.2**) must be active, and the `rippers-hoplosphere` compendium must be visible so its
item UUIDs resolve. No live-world writes happen until you deliberately import.

The system file is authored to **schemaVersion 4** — the installed build's real envelope (captured live).

## 0. Preconditions

- Foundry **13.351**, Project FU **4.16.2**, module **fabricate 1.9.2** active.
- Enable **Rippers Unmasked — Hoplosphere Economy**. Confirm the compendium
  **Rippers — Hoplosphere Components** appears (68 items).

## 1. Confirm the API surface

**Namespace note (verified live):** `importSystemFromFile`, `exportSystem`, `importFromPack` and
`getCompendiumImporter` are on **`game.fabricate` directly** — NOT `game.fabricate.api`. `game.fabricate.api`
holds the classes plus `getRecipeManager` / `getCraftingSystemManager` / `craftRecipe`.

```js
console.log(typeof game.fabricate.importSystemFromFile); // "function"
```

## 2. Import the crafting system from the file

The file ships at `modules/rippers-hoplosphere/system/rippers-hoplosphere-system.json` (`schemaVersion: 4`).
The live build's `importSystemFromFile` takes a **File** (the raw-object overload threw). Build a File from
the fetched text:

```js
const text = await fetch('modules/rippers-hoplosphere/system/rippers-hoplosphere-system.json').then(r => r.text());
console.log(JSON.parse(text).schemaVersion, JSON.parse(text).fabricateVersion); // 4 "1.9.2"
const file = new File([text], 'rippers-hoplosphere-system.json', { type: 'application/json' });
await game.fabricate.importSystemFromFile(file);
```

Confirm it landed and the counts match:

```js
const exported = await game.fabricate.exportSystem('rippers-hoplosphere');
console.log(
  'schema', exported.schemaVersion,
  '| essences', exported.system.essenceDefinitions.length,   // 7
  '| components', exported.system.components.length,          // 45
  '| tools', exported.system.tools.length,                    // 2
  '| recipes', exported.recipes.length,                       // 21
  '| recipeItemDefs', exported.system.recipeItemDefinitions.length // 21
);
```

## 3. Round-trip diff (catches any field the installed build re-normalizes)

`importSystemFromFile` then `exportSystem` should preserve structure — **all 21 recipes**, including
`the-scorch`, should survive. If the re-exported system **drops or renames** a field this file set —
especially inside a **recipe** (`ingredientSets` / `resultGroups` / `toolIds` / `dcOverride`), a **tool**, or
`craftingCheck` — capture that JSON and send it to Artificer.

- **THE SCORCH ships SIMPLE** — `recipes[id="the-scorch"]` has a single result group (Crude Sphere), no
  `resultSelection` / `outcomeRouting`; `craftingCheck.routed` stays at the empty default. This is because the
  installed 1.9.2 normalizer rejects an offline-derived routed check (mode snaps to `passFail`,
  `routed.fixedOutcomes` strips to 0), silently dropping a `routedByCheck` recipe. Confirm `the-scorch` is
  present in the re-export (21/21). The 3-tier routed version is deferred until its canonical shape is captured
  from a UI-built routed check exported live.
- **RENDERING progressive yield** — `salvageCraftingCheck.progressive.rollFormula = "1d2"` is the tunable
  start (brief §5.1). Confirm salvage still yields with `salvageCraftingCheck.enabled:false`.

## 4. Smoke-test one recipe of each shape (optional, in-world)

Drag ingredients from the compendium into an actor, then:

- **FIXATION** — 3 Algor shards + Apothecary Phial, Lodge Bench present → `fixation-arctic` → **Arctic Sphere** (DC 10).
- **DECOCTION** — 3 Sordes shards + Quicklime + bench → `decoction-toxic` → **Toxic Sphere** (DC 13 via `dcOverride`).
- **INVESTITURE** — 2 of any shard + Cold Iron Filings + bench → `investiture-knightly` → **Knightly Sphere**.
- **SETTING** — Harvested Remnant + Apothecary Phial + 5 shards + bench → `setting-immunity` → **Immunity Accessory**.
- **RENDERING** (salvage) — salvage **Clotted Remains (Sordes)** → 2 **Sordes Shards**.
- **THE SCORCH** — 2 of any shard + Scrap Glass + Street Crucible (tool) → `the-scorch` → **Crude Sphere**
  (single simple output; the 3-tier routing is deferred).

## 5. What "pass" looks like

- Imports with **7 essences / 45 components / 2 tools / 21 recipes / 21 recipe-item-defs**, no
  unresolved-UUID errors.
- Licensed recipes keep the bench (tool, not consumed) and **return ingredients on failure**
  (`craftingCheck.consumption.consumeIngredientsOnFail:false`); DECOCTION rolls against DC 13.
- Salvage yields shards; The Scorch yields a Crude Sphere.

## Offline checks already done (this build)

- Generator: **schemaVersion 4**, 68 items / 7 essences / 45 components / 2 tools / 21 recipes /
  21 recipe-item-defs; **schema-4 self-consistency OK** (every essence/component/tool/recipe reference and
  every `originItemUuid`/`registeredItemUuid` resolves; every recipe has exactly one result group; no routed
  recipes — The Scorch ships simple).
- Pack compiles to a clean single-manifest LevelDB (`CURRENT` → `MANIFEST-000002`, one `.ldb`).

---

## 6. V3 (Sep 2026) — upgrade over the live V2 import

The V3 file (`system/rippers-hoplosphere-system.json`) is rebased on the **owner's live export of
2026-09-07** (Fabricate 1.9.4 normalizer schema), so it round-trips byte-stably against the installed
build. Deltas over what the world holds: progressive RENDERING salvage (1d2 per run, results ×1),
`dcOverride: 13` on the four DECOCTION recipes, `the-scorch` (simple) restored — the live world holds
20 recipes and its recipe card with nothing behind it — and the nine `DL` description markers filled.

### 6a. REQUIRED world setting — do this FIRST, in BOTH worlds

**Settings → Configure Settings → Fabricate → Item Stack Quantity Field = `system.quantity.value`**

Without it, ingredient consumption is a **silent no-op** (owner-confirmed live): crafting appears to
work but eats nothing. Set it before any verify step, or every consumption check below lies.

### 6b. Upgrade procedure (the world already holds the V2 import)

Re-import **replaces cleanly — no removal needed** — provided both of:
1. Import via the Fabricate system manager's import (or `game.fabricate.importSystemFromFile(file,
   { overwriteExisting: true })`) with **overwrite existing** ON and **copy mode OFF** (keep ids) —
   the importer resolves same-id entities as `overwritten`.
2. The import log shows **21 recipes** afterwards (`the-scorch` restored).

If the UI import offers no overwrite toggle, delete the `rippers-hoplosphere` system in the Fabricate
manager first, then import. Player-held crafted ITEMS are world items and survive either route;
custom tweaks made in the manager since V2 do NOT survive overwrite — export first if any exist.

### 6c. V3 verify steps (live, after import)

- Salvage a **Clotted Remains** → yield is **1–2 shards** (progressive `1d2`), not a flat 2. ⚠ If the
  yield reads 0 or double, set `salvageResolutionMode` back to `simple` in the manager (restores flat 2)
  and report — the progressive award path was schema-read offline, not live-proven.
- Craft a **DECOCTION** → check rolls against **DC 13**; a FIXATION still rolls the system default 10.
- `the-scorch` appears and mints a Crude Sphere; `macros/scorch-check.js` rolls the tier
  (bands still the V2 approximation — **not canon**, no ruling exists) and crafts only on Crude.
- Bench ruling: run `macros/craft-from-lodge-bench.js` with a PC selected — it crafts with the Lodge
  actor's stores via `componentSourceActorIds` (installed 1.9.4 signature, read from the live bundle).

### 6d. Susurrus gathering — still stubbed, deliberately

The 2026-09-07 export proves `features.gathering:false`, `gatheringEnvironments: []` and
`gatheringConfig.system: {}` — the per-environment element shape is **entirely unrevealed**, so any
authored environment would be an invented schema (⚠ unverified-shape). To unblock it, a live export
must show: **at least one populated `gatheringEnvironments[]` entry** (its node/task element shape,
yield table, and check binding) **and a non-empty `gatheringConfig.system`** — i.e. the owner builds
one throwaway gathering environment in the Fabricate UI, exports, and hands the file over. Susurrus
material continues to flow through the ordinary shard components meanwhile.
