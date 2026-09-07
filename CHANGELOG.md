# Changelog — rippers-hoplosphere

## 0.2.1 — the check is an FU check, and two icons existed only in our heads
- **Fixed: the crafting check rolled whatever Fabricate supplied, not a Fabula Ultima check.** Every
  `rollFormula` in `craftingCheck` and `salvageCraftingCheck` shipped empty, so the system contributed
  no dice of its own. Both the crafting and the salvage check now roll
  `1d@attributes.dex.current + 1d@attributes.ins.current` — DEX + INS at the crafting actor's own
  current die sizes, against the DL (Austin's ruling, 7 Sep 2026). Fabricate substitutes those paths
  against the actor's roll data before parsing, so the die *size* is per-actor: a DEX d10 / INS d6
  character rolls `1d10 + 1d6`. Every DL is unchanged (10 / 13 / 15).
  - `salvageCraftingCheck.progressive.rollFormula` stays `1d2`: that is the rendering **yield**, not a
    check, and must never carry the check formula.
- **Fixed: two icons pointed at files Foundry does not ship.** `icons/svg/anvil.svg` (Lodge Bench) and
  `icons/svg/waste.svg` (Slag) are not among the 119 icons in Foundry 13's `public/icons/svg`, so both
  rendered broken. They are now `icons/svg/clockwork.svg` and `icons/svg/ruins.svg`. Item ids are
  unchanged, in the compendium pack and in the crafting-system file alike.
- Re-import the crafting system over the existing one (overwrite in place) and update the module so the
  compendium pack carries the corrected icons.

## 0.2.0 — the shard economy actually spends
- **Fixed: recipes gated on shards but never consumed them.** Every one of the 21 recipes priced its
  aspect cost in the crafting system's set-level `ingredientSets[].essences` map. Measured against
  Fabricate 1.9.5 in the e2e harness, that map is an **availability gate only** — the resolver checks
  it, returns an empty essence allocation and consumes nothing, so a craft spent its matrix and handed
  out the sphere for free. The cost now rides an ingredient-group option
  (`match: { type: "essence", essenceId, amount }`), which deducts exactly.
- Requires re-importing `system/rippers-hoplosphere-system.json` over the existing crafting system
  (overwrite in place — component and recipe ids are unchanged, so live bindings survive).
- **Still required, unchanged:** *Settings → Fabricate → Item Stack Quantity Field* must be
  `system.quantity.value` in every world that crafts. Fabricate's default for Project FU is
  `system.quantity`, at which a stack of twelve reads as one and crafting is refused outright.
- No change to recipe outputs, components, tools, salvage, or gathering.

## 0.1.3 — V3 rebase
Crafting system rebased on the owner's live Fabricate 1.9.4 export (normalizer-true shapes).

## 0.1.2 — SCORCH simplified
The Scorch ships as a simple single-result recipe; the routed three-tier binding is deferred.

## 0.1.1 — schema 4
Crafting system rewritten to Fabricate export schemaVersion 4: 68 items, 7 essences, 45 components,
2 tools, 21 recipes.
