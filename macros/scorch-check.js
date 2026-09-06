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
 * V3: the installed-build call IS now locked, read from the installed Fabricate 1.9.4 source:
 *   craftRecipe({ actorId, recipeId, ingredientSetId, ingredientOptionOverrides,
 *                 ingredientEssenceAllocation, componentSourceActorIds, interactive })
 * There is NO resultOptionId parameter — the routed check picks the result, and the live system's
 * routed check is still the empty default (the 2026-09-07 export proves it). So until a UI-built
 * routed check exists, this macro rolls the tier and REPORTS it; the GM crafts the matching result.
 * ⚠ Tier BAND VALUES below remain the V2 approximation — Austin has not ruled the thresholds
 * (brief §8 says review after two months of play). Do not treat the bands as canon.
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
	// Installed 1.9.4 signature (read from the live bundle):
	//   craftRecipe({ actorId, recipeId, ingredientSetId, ingredientOptionOverrides,
	//                 ingredientEssenceAllocation, componentSourceActorIds, interactive })
	// It carries NO resultOptionId — result choice belongs to the (still-unbuilt) routed check. On the
	// current SIMPLE recipe the only craftable result is Crude, so: Crude tier → craft it directly;
	// any other tier → report to chat and let the GM resolve (Ruined = consume, no output; Sound owed
	// to the future routed version).
	const craft = game.fabricate?.craft?.bind(game.fabricate)
		?? game.fabricate?.api?.craftRecipe?.bind(game.fabricate.api)
		?? game.fabricate?.api?.crafting?.craftRecipe?.bind(game.fabricate.api.crafting);
	if (!craft) throw new Error('craftRecipe entry point not located on this build.');
	if (resultOptionId !== 'crude') {
		throw new Error('non-Crude tier — resolve manually (the simple recipe only mints Crude).');
	}
	await craft({ actorId: actor.id, recipeId: RECIPE_ID, interactive: true });
	ui.notifications?.info(`The Scorch crafted: ${tier}.`);
} catch (e) {
	// Fallback: the GM crafts manually, picking the reported result option in the Fabricate UI.
	ui.notifications?.warn(`Scorch tier is "${tier}" (option "${resultOptionId}"). Craft it manually in Fabricate. (${e.message})`);
	console.warn('[rippers-hoplosphere] Scorch craft handoff:', { recipeId: RECIPE_ID, resultOptionId, tier, error: e });
}
