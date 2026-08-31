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

```js
const api = game.fabricate.api;
console.log(typeof api.importSystemFromFile); // "function"
```

## 2. Import the crafting system from the file

The file ships at `modules/rippers-hoplosphere/system/rippers-hoplosphere-system.json` (`schemaVersion: 4`).

```js
const model = await fetch('modules/rippers-hoplosphere/system/rippers-hoplosphere-system.json').then(r => r.json());
console.log(model.schemaVersion, model.fabricateVersion); // 4 "1.9.2"
await game.fabricate.api.importSystemFromFile(model);
// (if importSystemFromFile opens a picker instead of taking an object, pick the file above)
```

Confirm it landed and the counts match:

```js
const exported = await game.fabricate.api.exportSystem('rippers-hoplosphere');
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

`importSystemFromFile` then `exportSystem` should preserve structure. If the re-exported system **drops or
renames** a field this file set — especially inside a **recipe** (`ingredientSets` / `resultGroups` /
`toolIds` / `dcOverride` / `resultSelection`), a **tool**, or `craftingCheck` — capture that JSON and send it
to Artificer. Two spots are known best-effort and worth eyeballing:

- **THE SCORCH routing** — `recipes[id="the-scorch"].resultSelection = {provider:"check"}` with 3 result
  groups (`ruined`/`crude`/`sound`). If the build expects the tier→group binding expressed differently
  (e.g. `craftingCheck.routed.fixedOutcomes[]` referencing group ids, or a `checkTierId` per group),
  the re-export shows the canonical shape — send it back for a one-line fix.
- **RENDERING progressive yield** — `salvageCraftingCheck.progressive.rollFormula = "1d2"` is the tunable
  start (brief §5.1). Confirm salvage still yields with `salvageCraftingCheck.enabled:false`.

## 4. Smoke-test one recipe of each shape (optional, in-world)

Drag ingredients from the compendium into an actor, then:

- **FIXATION** — 3 Algor shards + Apothecary Phial, Lodge Bench present → `fixation-arctic` → **Arctic Sphere** (DC 10).
- **DECOCTION** — 3 Sordes shards + Quicklime + bench → `decoction-toxic` → **Toxic Sphere** (DC 13 via `dcOverride`).
- **INVESTITURE** — 2 of any shard + Cold Iron Filings + bench → `investiture-knightly` → **Knightly Sphere**.
- **SETTING** — Harvested Remnant + Apothecary Phial + 5 shards + bench → `setting-immunity` → **Immunity Accessory**.
- **RENDERING** (salvage) — salvage **Clotted Remains (Sordes)** → 2 **Sordes Shards**.
- **THE SCORCH** — after import, make a Foundry **Macro** from `macros/scorch-check.js`, set
  `system.craftingCheck.routed.macroUuid` to that macro's UUID, then run the macro with the crafting actor
  selected: it rolls the FU check and routes to Ruined / Crude / Sound.

## 5. What "pass" looks like

- Imports with **7 essences / 45 components / 2 tools / 21 recipes / 21 recipe-item-defs**, no
  unresolved-UUID errors.
- Licensed recipes keep the bench (tool, not consumed) and **return ingredients on failure**
  (`craftingCheck.consumption.consumeIngredientsOnFail:false`); DECOCTION rolls against DC 13.
- Salvage yields shards; The Scorch routes by the macro’s check.

## Offline checks already done (this build)

- Generator: **schemaVersion 4**, 68 items / 7 essences / 45 components / 2 tools / 21 recipes /
  21 recipe-item-defs; **schema-4 self-consistency OK** (every essence/component/tool/recipe reference and
  every `originItemUuid`/`registeredItemUuid` resolves; simple recipes have exactly one result group;
  The Scorch is the only routed recipe).
- Pack compiles to a clean single-manifest LevelDB (`CURRENT` → `MANIFEST-000002`, one `.ldb`).
