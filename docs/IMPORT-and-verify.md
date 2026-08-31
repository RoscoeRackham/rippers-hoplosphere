# Hoplosphere crafting system — import + round-trip verification

Console steps for god / Austin to run **in-world** (as GM). The module must be installed and enabled,
`fabricate` must be active, and the `rippers-hoplosphere` compendium must be visible so its item UUIDs
resolve. No live-world writes happen until you deliberately import.

## 0. Preconditions

- Foundry **13.351**, Project FU **4.16.2**, module **fabricate** active (verified live).
- Enable **Rippers Unmasked — Hoplosphere Economy**. Confirm the compendium
  **Rippers — Hoplosphere Components** appears (68 items).

## 1. Confirm the API surface (one line)

```js
const api = game.fabricate.api;
console.log(Object.keys(api));               // expect getRecipeManager / craftRecipe / importSystemFromFile / exportSystem / SalvageRunManager / GatheringEngine …
console.log(typeof api.importSystemFromFile); // "function"
```

## 2. Import the crafting system from the file

`importSystemFromFile` takes the file the module ships at
`modules/rippers-hoplosphere/system/rippers-hoplosphere-system.json`. Depending on the installed
build's exact signature (⚠ not yet locked — see the mapping doc), one of:

```js
// A) if it accepts a fetched object:
const model = await fetch('modules/rippers-hoplosphere/system/rippers-hoplosphere-system.json').then(r => r.json());
await game.fabricate.api.importSystemFromFile(model);

// B) if it opens a file picker / accepts a path, follow its prompt and pick the file above.
```

Then confirm the system landed:

```js
const mgr = game.fabricate.api.getCraftingSystemManager?.() ?? game.fabricate.api;
console.log((await mgr.getAll?.())?.map?.(s => s.id) ?? 'inspect manually'); // expect "rippers-hoplosphere"
```

## 3. Round-trip: export it back and diff

```js
const exported = await game.fabricate.api.exportSystem('rippers-hoplosphere');
console.log(exported.version, exported.essences.length, exported.components.length, exported.recipes.length);
// expect: essences 7, components 47, recipes 21 (version string is the installed build's — V2 or a V3+)
```

**If the exported `version` is NOT `"V2"`**, or the object carries fields the shipped file does not
(a per-system `check`, a salvage-run/yield block, a `gathering` array): **capture that JSON and send it
to Artificer.** That is the V3 envelope needed to finalize the four stubbed features
(search `TODO(V3)` in the file). Everything else already round-trips.

## 4. Smoke-test one recipe of each shape (optional, in-world)

Put the ingredients in an actor's inventory (drag from the compendium), then:

- **FIXATION** — 3 Algor shards + Apothecary Phial, with a Lodge Bench present → craft `fixation-arctic` → **Arctic Sphere**.
- **INVESTITURE** — 2 of any shard + Cold Iron Filings + bench → craft `investiture-knightly` → **Knightly Sphere**.
- **SETTING** — 1 Harvested Remnant + Apothecary Phial + 5 shards + bench → craft `setting-immunity` → **Immunity Accessory**.
- **RENDERING** (salvage) — salvage **Clotted Remains (Sordes)** → 2 **Sordes Shards** (fixed yield; progressive is `TODO(V3)`).
- **THE SCORCH** — run `macros/scorch-check.js` with the crafting actor selected; it rolls the FU check, prints the tier, and hands Fabricate the matching result option.

## 5. What "pass" looks like

- The system imports with **7 essences / 47 components / 21 recipes**, no unresolved-UUID errors.
- Each smoke-test recipe consumes its ingredients, keeps its catalyst (bench/crucible), and produces
  the named output Item.
- `exportSystem` returns the system; its `version` tells you whether the installed envelope is V2 (done)
  or newer (send it back to finalize the stubs).

## Offline check already done (this build)

- Generator: **68 items / 7 essences / 47 components / 21 recipes**, referential integrity OK
  (every ingredient/catalyst/product/salvage/essence key resolves).
- Pack compiles to a clean single-manifest LevelDB (`CURRENT` → `MANIFEST-000002`, one `.ldb`); a
  round-trip `extractPack` returns all **68** documents.
