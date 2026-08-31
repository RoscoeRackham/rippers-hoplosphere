# Recipe → Fabricate mapping, with every limitation flagged

How each brief §5 recipe maps onto Fabricate's domain model, and exactly where Fabricate cannot
express the brief. Built against the extracted `FabricateExportModel` (V2). Where the installed
build (v1.2.1) is newer than any public repo, the field is stubbed and marked `TODO(V3)`.

## The core moves (approved, god conv-hoplo-build)

| Brief concept | Fabricate concept |
|---|---|
| **Aspect** (Algor/Sordes/Inanition/Empyreuma/Susurrus/Residuum) | **Essence** — a component is tagged with essences; a recipe requires N-of-an-essence. |
| "3 shards of one aspect" | `requirementOptions[].essences = { <aspect>: 3 }` (each shard component carries `{<aspect>:1, shard:1}`). |
| "2 shards of **any** aspect" | `essences = { shard: 2 }` — the shared `shard` essence every shard also carries. |
| **Tool** (Lodge bench / street crucible) | **Catalyst** — required present, **not consumed**. |
| Matrix / phial / shards spent | **Ingredient** — consumed. |
| "Routed by ingredients / by the matrix" | **One recipe per output** — owning the shards/matrix is what gates which recipes are craftable (see limitation 1). |
| A component / recipe / sphere | A real Foundry **Item** (`itemUuid`) — every one is minted in the `components` compendium (see limitation 2). |

## The six recipes

### 1. RENDERING — salvage, not a recipe
- **Fabricate:** a `salvageOptions` entry on each **Clotted Remains (aspect)** component → shards of that aspect.
- **Built:** 6 clotted-remains components, each salvages to **2** shards of its aspect.
- ⚠ `TODO(V3)`: the brief's **progressive salvage-run yield** (start 1–2, rising — the one number that
  tunes the whole economy) is a runtime feature of the installed `SalvageRunManager`, not in the V2 file.
  Fixed at 2 here as the V2 approximation. "Requires a blade" is left GM-gated (no blade catalyst minted).

### 2. FIXATION — licensed elemental (×5)
- **Fabricate:** `catalysts {tool-bench:1}` + `ingredients {matrix-phial:1}` + `essences {<aspect>:3}` → the aspect's elemental sphere.
- **Built:** Arctic (Algor), Volcanic (Empyreuma), Poisonous (Sordes), Dark (Inanition), Cyclonic (Susurrus, wave-2).
- ⚠ `TODO(V3)`: **DL ~10** and "ingredients returned on failure" are a per-system **check** config, not a
  V2 field. Not emitted; the file imports without it and the GM adjudicates the check, or the V3 check is
  wired once the envelope is known.

### 3. DECOCTION — licensed afflictive (×4)
- **Fabricate:** same shape as Fixation but `ingredients {matrix-quicklime:1}`, → the aspect's afflictive sphere.
- **Built:** Scornful (enraged), Toxic (poisoned), Draining (steals HP/MP), Ghastly (shaken, wave-2). Algor and Residuum have no afflictive (correct — brief §4.4).
- ⚠ `TODO(V3)`: **DL ~13**, and the **§9 #6 "one check per system"** limit — Fixation (DL 10) and Decoction
  (DL 13) differ, so if the DL rides the **system** they need **separate crafting systems**; if it rides the
  **recipe**, one system holds both. The V3 export sample settles this. Authored as one system for now.

### 4. INVESTITURE — the bane (×4)
- **Fabricate:** `catalysts {tool-bench:1}` + `ingredients {<bane matrix>:1}` + `essences {shard:2}` → creature-type sphere. The matrix ingredient selects the output.
- **Built:** silver leaf → Blessed (undead), cold iron → Knightly (monsters), churchyard lead → Skeptical (demons), brass swarf → Disrupting (constructs). Cheaper in shards — you pay for the metal.

### 5. THE SCORCH — street (STUB)
- **Fabricate:** `catalysts {tool-crucible:1}` + `ingredients {matrix-scrapglass:1}` + `essences {shard:2}`, with **three result options**: Ruined → Slag, Crude → Crude Sphere (uncombinable flag), Sound → Sound Sphere.
- ⚠ `TODO(V3)` **(§9 #5, the confirmed limitation):** an FU crit (matching pair ≥ 6) **cannot** be a Fabricate
  dice-group trigger (those compare a group to a fixed value). So the tier is decided by an **external roll**
  and the matching result option is crafted — the shipped `macros/scorch-check.js` does this (the §9.1
  storage/validation-layer plan). Double-1 fumbles *can* be caught natively; crits cannot.
- "Ingredients consumed on failure" (opposite of Fixation) and the exact Ruined/Crude/Sound thresholds
  finalize with the V3 check envelope.

### 6. SETTING — accessories (×7)
- **Fabricate:** `catalysts {tool-bench:1}` + `ingredients {<remnant>:1, matrix-phial:1}` + `essences {shard:N}` → the remnant's accessory. **Separate recipe per Quality** so each carries its own shard cost (a single recipe with independent requirement/result menus would let a player pair 2 shards with an Immunity result — see limitation 1).
- **Built (shard counts, brief §5.2 RAW):** Antistatus 2, Resistance 2, Swordbreaker 3, Immunity 5, Weapon Up 6 (all off the generic **Harvested Remnant**), plus two worked examples: **The Hyde** (Hyde sinew → Weapon Up, 6) and **Melmoth** (broadsheet → custom Quality, 3 Susurrus shards).

## Exclusions honored (brief §5.3 — no recipe)
- **Gladiator**, **attribute spheres** (Agile/Brave/Mighty/Revealing), **Damage-Change accessory** — no recipe minted. Found objects / market only.
- **Seismic (earth) / Voltaic (bolt)** — no aspect → not craftable. Provenance only (Dug / Manufactured), GM-placed. No essence, no recipe.
- **Species Origin as a component tag** — rejected. Not modelled.

## Residuum (brief §6)
- Minted as an essence + a **Residuum Shard** + **Clotted Remains (Residuum)**. It **refuses to refine**:
  no Fixation/Decoction recipe consumes it, and it has **no conversion rate** — deliberately never a
  reagent/flux/matrix/failure-offset. It exists as the cover story and the sink.

## What Fabricate cannot express (summary — flagged to god)

1. **No auto-routing of requirement → result.** `craftRecipe` selects a requirement option and a result
   option **independently** (both default to the first; a menu if >1). Solved by **one recipe per output**
   so ingredient possession gates craftability. The one place this bites hardest is Setting (per-Quality
   recipes) — kept single-option to prevent cost/Quality mismatch.
2. **The file is not self-contained.** Every component/recipe references a real Foundry `itemUuid`; every
   essence an `activeEffectSourceItemUuid`. Handled by minting the whole `components` compendium and binding
   `Compendium.rippers-hoplosphere.components.Item.<id>` UUIDs. Essences carry `""` (no source item).
3. **FU crits are not dice-group triggers** (§9 #5). External roll + `craftRecipe(resultOption)` macro instead.
4. **One check per system** (§9 #6). Differing DLs may force separate systems — pending the V3 envelope.
5. **Coagulation is not a Fabricate feature.** "Identical spheres combine/escalate" and "a Crude sphere can
   never coagulate" live on the **sphere Item** (`flags.rippers-hoplosphere.coagulable`), enforced by our own
   automation — deferred to a **separate follow-up card** (god's call, point 4). The flag is set now
   (crude = false; all others = true); no coag automation is built in this pass.

## §7 OPEN items — STUBBED + FLAGGED, never decided
- **#1 graft reversibility**, **#3 Piercing (d66-41) vs the Coag.3 resistance-bypass exemption**,
  **#8 technosphere indestructibility** — surfaced, not answered. No recipe or flag here presumes an answer.
- **§7.2 (the one RULED item) is baked:** a seated/grafted Quality is **live immediately after the Equipment
  action** (god, 2026-08-31). Recorded on accessory/sphere item text; the timing is a play rule, not a
  Fabricate field.

## Naming compliance (brief §3.4)
- The **emotion/denial** register (grief, shame, appetite, rage, rumour, righteousness, panic) is GM-side
  only and appears in **no** player-facing string in this module. Only Lodge terms, damage types, sphere
  names, street counterparts and word-etymologies are used. Susurrus is authored but flagged **wave-2** in its
  strings (GM enables when the beat lands).
