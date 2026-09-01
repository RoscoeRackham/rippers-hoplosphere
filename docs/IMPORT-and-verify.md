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
`the-scorch`, should survive (v0.1.1 dropped the-scorch because its routed check had no outcomes; v0.1.2
populates them). If the re-exported system still **drops or renames** a field this file set — especially
inside a **recipe** (`ingredientSets` / `resultGroups` / `toolIds` / `dcOverride` / `resultSelection` /
`outcomeRouting`), a **tool**, or `craftingCheck.routed` — capture that JSON and send it to Artificer.

- **THE SCORCH routing (fixed in v0.1.2)** — `recipes[id="the-scorch"]` sets `resultSelection={provider:"check"}`
  and `outcomeRouting={ruined:"ruined",crude:"crude",sound:"sound"}`, mapping the 3 outcome bands in
  `system.craftingCheck.routed.fixedOutcomes` (`ruined` 0–9 fail / `crude` 10–14 pass / `sound` 15–99 pass) to
  its 3 result groups. Confirm `the-scorch` is present in the re-export and `craftingCheck.routed.fixedOutcomes`
  is non-empty.
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
