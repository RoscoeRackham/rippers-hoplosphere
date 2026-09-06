/*
 * CRAFT FROM THE LODGE BENCH — source-actor crafting wrapper (owner ruling, Sep 2026)
 * ----------------------------------------------------------------------------------
 * RULING: bench access is SOURCE-ACTOR crafting. The LODGE ACTOR owns the bench catalyst and the
 * material stores; a player crafts against those stores by passing the Lodge actor as a component
 * source. The installed Fabricate 1.9.4 craft call (read from the live bundle) is:
 *   craftRecipe({ actorId, recipeId, ingredientSetId, ingredientOptionOverrides,
 *                 ingredientEssenceAllocation, componentSourceActorIds, interactive })
 * `componentSourceActorIds` is the mechanism: ingredients and tools may be drawn from those actors'
 * inventories in addition to the crafter's own.
 *
 * USAGE: select the crafting PC's token, run the macro, pick the recipe by id when prompted (or set
 * RECIPE_ID below to hard-bind a copy of this macro to one recipe). `interactive: true` opens
 * Fabricate's own flow so ingredient choices stay in its UI.
 *
 * REQUIRES (both worlds): Settings → Fabricate → Item Stack Quantity Field = `system.quantity.value`
 * — without it, ingredient consumption is a silent no-op (owner-confirmed live). See
 * docs/IMPORT-and-verify.md.
 */

const LODGE_ACTOR_NAME = 'The Lodge'; // the actor that owns the bench catalyst + stores — rename to taste
const RECIPE_ID = null; // set to e.g. 'fixation-arctic' to skip the prompt

const actor = canvas?.tokens?.controlled?.[0]?.actor ?? game.user?.character;
if (!actor) { ui.notifications?.warn('Select the crafting actor’s token first.'); return; }

const lodge = game.actors?.getName?.(LODGE_ACTOR_NAME);
if (!lodge) { ui.notifications?.warn(`Lodge actor "${LODGE_ACTOR_NAME}" not found — edit LODGE_ACTOR_NAME in this macro.`); return; }

let recipeId = RECIPE_ID;
if (!recipeId) {
	recipeId = await new Promise((resolve) => {
		new Dialog({
			title: 'Craft from the Lodge bench',
			content: '<p>Recipe id (e.g. <code>fixation-arctic</code>, <code>decoction-toxic</code>, <code>setting-immunity</code>):</p><input type="text" name="rid" style="width:100%">',
			buttons: {
				ok: { label: 'Craft', callback: (html) => resolve(html.find('[name=rid]').val()?.trim() || null) },
				cancel: { label: 'Cancel', callback: () => resolve(null) },
			},
			default: 'ok',
		}).render(true);
	});
}
if (!recipeId) return;

try {
	const craft = game.fabricate?.craft?.bind(game.fabricate)
		?? game.fabricate?.api?.craftRecipe?.bind(game.fabricate.api)
		?? game.fabricate?.api?.crafting?.craftRecipe?.bind(game.fabricate.api.crafting);
	if (!craft) throw new Error('craftRecipe entry point not located on this build.');
	await craft({ actorId: actor.id, recipeId, componentSourceActorIds: [lodge.id], interactive: true });
} catch (e) {
	ui.notifications?.warn(`Bench craft handoff failed — open Fabricate and craft "${recipeId}" manually with ${LODGE_ACTOR_NAME} as a source. (${e.message})`);
	console.warn('[rippers-hoplosphere] bench craft:', { recipeId, lodge: lodge.id, error: e });
}
