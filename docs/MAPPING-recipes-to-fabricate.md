# Recipe → Fabricate mapping (schemaVersion 4 / Fabricate 1.9.2)

How each brief §5 recipe maps onto Fabricate's schema-4 model, and where Fabricate still cannot express
the brief. The per-entity field names were captured live from Austin's world plus the 1.9.2 bundle Recipe
model, so this is authored to the **installed** build, not a public repo.

## Where things live (schema-4 layout)

| Concept | Schema-4 location |
|---|---|
| The crafting system config | `system{}` (features, checks, visibility) |
| **Aspect** (Algor/Sordes/…) | `system.essenceDefinitions[]` — `{id,name,description,icon,enabled,…}` |
| Shards / matrices / spheres / remnants / accessories | `system.components[]` — each with `originItemUuid` + `registeredItemUuid` (both bind the compendium item) |
| **Lodge bench / street crucible** | `system.tools[]` — NOT components; `checkBreakable` false (bench) / true (crucible) |
| The recipes | **top-level** `recipes[]` |
| The learnable recipe-card items | `system.recipeItemDefinitions[]` — `recipeIds[]` links each card to its recipe |

## The core moves

| Brief concept | Schema-4 mechanism |
|---|---|
| "3 shards of one aspect" | `recipe.ingredientSets[].essences = { <aspect>: 3 }` (each shard component is tagged `essences:{<aspect>:1, shard:1}`) |
| "2 shards of **any** aspect" | `essences = { shard: 2 }` (the shared `shard` essence) |
| A consumed reagent (phial / matrix / remnant) | `ingredientSets[].ingredientGroups[].options[].match = {type:"component", componentId}` |
| A tool present-not-consumed (bench / crucible) | `recipe.toolIds = ["tool-bench"]` (tools are not consumed) |
| An output | `recipe.resultGroups[] = [{id,name,results:[{componentId,quantity}]}]` |
| "Routed by ingredients / matrix" | **one recipe per output** — owning the shards/matrix gates which recipes are craftable |
| Per-recipe difficulty | `recipe.dcOverride` (DECOCTION 13 vs system default 10) — **one system, no split** |

## The six recipes

### 1. RENDERING — salvage
`component.salvage` on each **Clotted Remains (aspect)**: `enabled:true`, `resultGroups:[{results:[{componentId:shard,quantity:2}]}]`.
The **1–2-rising** yield (brief §5.1, tunable) is `system.salvageCraftingCheck.progressive.rollFormula = "1d2"`.
`salvageCraftingCheck.enabled:false` → salvage yields without a gate. "Requires a blade" left GM-gated.

### 2. FIXATION — licensed elemental (×5)
`toolIds:["tool-bench"]` + ingredient `matrix-phial` + `essences:{<aspect>:3}` → the aspect's elemental sphere.
DC 10 (system default; `dcOverride:null`). **Ingredients returned on failure** via
`craftingCheck.consumption.consumeIngredientsOnFail:false`. Arctic/Volcanic/Poisonous/Dark/Cyclonic(wave-2).

### 3. DECOCTION — licensed afflictive (×4)
Same shape, ingredient `matrix-quicklime`, **`dcOverride:13`**. Scornful/Toxic/Draining/Ghastly(wave-2).
FIXATION (10) and DECOCTION (13) coexist in **one** crafting system via per-recipe `dcOverride` — the §9 #6
"one check per system" concern is dissolved by schema 4's per-recipe DC override (confirmed in the 1.9.2 bundle).

### 4. INVESTITURE — the bane (×4)
`toolIds:["tool-bench"]` + a bane matrix ingredient + `essences:{shard:2}` → creature-type sphere. The matrix
selects the output (silver→Blessed, cold iron→Knightly, lead→Skeptical, brass→Disrupting).

### 5. THE SCORCH — street (routed)
`toolIds:["tool-crucible"]` + `matrix-scrapglass` + `essences:{shard:2}`, **`resultSelection:{provider:"check"}`**
with **three** result groups: `ruined`→Slag, `crude`→Crude Sphere (uncombinable flag), `sound`→Sound Sphere.
The tier is decided by the FU check via `system.craftingCheck.routed` + a macro: after import the GM makes a
Macro from `macros/scorch-check.js` and sets `craftingCheck.routed.macroUuid` to it. **Best-effort:** the exact
tier→group binding (`routed.fixedOutcomes`/`checkTierId`) is left for the live round-trip to confirm — the
re-export shows the canonical shape if a tweak is needed. FU crit-as-trigger is still limited (§9 #5), which is
exactly why the macro decides the tier.

### 6. SETTING — accessories (×7)
`toolIds:["tool-bench"]` + a remnant + `matrix-phial` + `essences:{shard:N}` (§5.2 counts 2/2/3/5/6) → the
remnant's accessory. Worked examples: **The Hyde** (Hyde sinew → Weapon Up, 6) and **Melmoth** (broadsheet →
custom Quality, 3 Susurrus shards). Separate recipe per Quality so each carries its own shard cost.

## Exclusions honored (brief §5.3 — no recipe)
Gladiator, attribute spheres, Damage-Change accessory, Seismic/Voltaic (provenance not aspect), species-tag.
**Residuum** is minted (essence + shard + clotted remains) but **refuses to refine**: no recipe consumes it,
no conversion rate. `system.alchemy` exists (null) — Residuum→Alchemy is technically available but deliberately
**not** built (canon).

## What schema 4 resolved (were V2 limitations)
- **Per-recipe DC** → `recipe.dcOverride` (one system holds FIXATION 10 + DECOCTION 13).
- **Routed outcomes** (SCORCH tiers) → `resultSelection:{provider:"check"}` + `craftingCheck.routed`.
- **Progressive salvage** → `salvageCraftingCheck.progressive.rollFormula`.
- **Tool breakage** (bench never / crucible breakable) → `tools[].checkBreakable` + `system.toolBreakage.authority`.
- **Consumption opposites** → `craftingCheck.consumption.consumeIngredientsOnFail` (Fixation returns; the
  Scorch's Ruined→Slag group is itself the "consumed" outcome).

## What Fabricate still can't express / left open
1. **Not self-contained.** Every component/tool/recipe-card references a real Foundry item UUID
   (`originItemUuid` + `registeredItemUuid`); every recipe output/ingredient references a component id.
   Handled by minting the whole `components` compendium.
2. **FU crit as a native trigger** (§9 #5) — still no. The Scorch tier is macro-decided.
3. **Susurrus GATHERING environment** — `features.gathering:false`, `gatheringEnvironments:[]`. The
   environment element shape was **not** captured (the live export of an empty system doesn't reveal it and a
   populated-gathering export wasn't available). Susurrus material still flows through the shard components;
   authoring the pub/press/crowd environment waits on a populated-gathering export → a follow-up (v0.1.2).
4. **The Scorch tier→group binding** is best-effort (see recipe 5) — one live round-trip confirms it.
5. **Coagulation** is not a Fabricate feature. "Crude never coagulates" is a flag on the sphere Item
   (`flags.rippers-hoplosphere.coagulable`, crude=false); enforcement automation is a separate follow-up card.

## §7 OPEN items — STUBBED + FLAGGED, never decided
`#1 graft reversibility`, `#3 Piercing vs Coag.3 bypass`, `#8 technosphere indestructibility` — surfaced, not
answered. **§7.2 (ruled) is baked:** a seated/grafted Quality is live immediately after the Equipment action.

## Naming compliance (brief §3.4)
The emotion/denial register (grief, shame, appetite, rage, rumour, righteousness, panic) is GM-side only and
appears in **no** player-facing string. Only Lodge terms, damage types, sphere names, street counterparts and
word-etymologies are used. Susurrus is authored but flagged wave-2 in its strings.
