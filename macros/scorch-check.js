/*
 * ⚠ DEFERRED — this macro is for the FUTURE 3-tier routed SCORCH (Ruined/Crude/Sound), which is NOT in the
 * shipped build: THE SCORCH currently ships SIMPLE (a single Crude output), because the installed 1.9.2
 * normalizer rejects an offline-derived routed check. Kept here for the routed version once its canonical
 * shape is captured from a UI-built check (card ROUTED-scorch-tiers-future). It does nothing useful against
 * the simple recipe (there are no ruined/crude/sound result options to route to).
 *
 * THE SCORCH — external-roll crafting macro (Rippers Unmasked hoplosphere economy)
 * ------------------------------------------------------------------------------
 * WHY THIS EXISTS (brief §9 #5, §9.1): a Fabula Ultima critical success is a matching pair ≥ 6.
 * Fabricate's dice-group triggers can only compare a group against a FIXED value, so an FU crit
 * cannot be a native trigger. The §9.1 plan is therefore: roll the FU check EXTERNALLY, read the
 * dice, decide the tier here, then hand Fabricate the chosen result option to craft.
 *
 * TIERS (brief §5, THE SCORCH): Ruined / Crude / Sound. Crude = idiosyncratic, can never coagulate.
 *
 * ⚠ TODO(V3) — the exact installed-build call is not yet locked (public repo is older than the
 * installed v1.2.1). Two integration points below are marked TODO and fall back to a chat report so
 * the GM can craft manually if the API signature differs. Finalize once god supplies the exportSystem()
 * envelope + the confirmed craftRecipe signature from the live world.
 *
 * USAGE: select the crafting actor's token, run the macro. It rolls the Scorch check, prints the tier,
 * and (if the API matches) calls Fabricate with the matching result option of the `the-scorch` recipe.
 */

const RECIPE_ID = 'the-scorch';
const SYSTEM_ID = 'rippers-hoplosphere';

// --- 1. resolve the acting actor ------------------------------------------------------------------
const actor = canvas?.tokens?.controlled?.[0]?.actor ?? game.user?.character;
if (!actor) { ui.notifications?.warn('Select the crafting actor’s token first.'); return; }

// --- 2. roll the FU Scorch check ------------------------------------------------------------------
// The Scorch check attribute pair is a GM call (brief leaves the DL/pair a §9 VERIFY). Default here to
// DEX + INS (a maker's check); change ATTR_A/ATTR_B to taste. DL is a soft threshold, GM-tunable.
const ATTR_A = 'dex';
const ATTR_B = 'ins';
const DL = 10; // soft; brief §8 balance-watch: review after two months of play.

function dieOf(attr) {
	// projectfu stores an attribute die size as an integer (6/8/10/12) at system.attributes.<attr>.current|base.
	const a = actor.system?.attributes?.[attr];
	return a?.current ?? a?.base ?? 8;
}
const roll = await new Roll(`1d${dieOf(ATTR_A)} + 1d${dieOf(ATTR_B)}`).roll();
const [d1, d2] = roll.dice.map((d) => d.results[0].result);
const total = roll.total;
const isCrit = d1 === d2 && d1 >= 6;   // FU crit: matching pair >= 6
const isFumble = d1 === 1 && d2 === 1; // FU fumble: double 1

// --- 3. decide the tier ---------------------------------------------------------------------------
// Ruined on a fumble or a clear miss; Sound on a crit or a comfortable beat; Crude in between.
// (These bands are the V2 approximation. TODO(V3): confirm against the ruled Scorch thresholds.)
let tier, resultOptionId;
if (isFumble || total < DL) { tier = 'Ruined'; resultOptionId = 'ruined'; }
else if (isCrit || total >= DL + 5) { tier = 'Sound'; resultOptionId = 'sound'; }
else { tier = 'Crude — will never coagulate'; resultOptionId = 'crude'; }

// --- 4. report ------------------------------------------------------------------------------------
await roll.toMessage({
	speaker: ChatMessage.getSpeaker({ actor }),
	flavor: `<strong>The Scorch</strong> — ${ATTR_A.toUpperCase()} + ${ATTR_B.toUpperCase()} vs DL ${DL}` +
		`<br>Dice: ${d1}, ${d2} — total ${total}${isCrit ? ' (CRIT)' : isFumble ? ' (FUMBLE)' : ''}` +
		`<br>Result tier: <strong>${tier}</strong>`,
});

// --- 5. hand the tier to Fabricate ----------------------------------------------------------------
try {
	const api = game.fabricate?.api;
	if (!api) throw new Error('Fabricate API not found (game.fabricate.api).');
	// TODO(V3): confirm the installed craftRecipe signature. Public 1.0.0 shape:
	//   api.crafting.craftRecipe({ recipeId, sourceActorId, requirementOptionId:'req', resultOptionId })
	// The installed v1.2.1 exposes craftRecipe() at a top level or under getRecipeManager()/CraftingEngine.
	if (typeof api.craftRecipe === 'function') {
		await api.craftRecipe({ recipeId: RECIPE_ID, sourceActorId: actor.id, requirementOptionId: 'req', resultOptionId });
	} else if (api.crafting?.craftRecipe) {
		await api.crafting.craftRecipe({ recipeId: RECIPE_ID, sourceActorId: actor.id, requirementOptionId: 'req', resultOptionId });
	} else {
		throw new Error('craftRecipe entry point not located on this build.');
	}
	ui.notifications?.info(`The Scorch crafted: ${tier}.`);
} catch (e) {
	// Fallback: the GM crafts manually, picking the reported result option in the Fabricate UI.
	ui.notifications?.warn(`Scorch tier is "${tier}" (option "${resultOptionId}"). Craft it manually in Fabricate. (${e.message})`);
	console.warn('[rippers-hoplosphere] Scorch craft handoff:', { recipeId: RECIPE_ID, resultOptionId, tier, error: e });
}
