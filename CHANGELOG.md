# Changelog — rippers-hoplosphere

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
