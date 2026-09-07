// build-hoplosphere.mjs — generate the Rippers "harvested hoplosphere" Fabricate crafting system.
//
// Emits TWO artefacts:
//   1. src/packs/components/*.json  — the Foundry Item documents the crafting graph references
//      (shards, clotted remains, matrices, tools, sphere outputs, remnants, accessories, recipe-cards).
//      pack.mjs compiles these to a LevelDB compendium `components`.
//   2. system/rippers-hoplosphere-system.json — the Fabricate `FabricateExportModel` (V2 shape)
//      that game.fabricate.api.importSystemFromFile() consumes. Components/recipes bind REAL
//      compendium UUIDs of the items minted in (1).
//
// SOURCING RULE (absolute): built from Look Here Claude/hoplosphere-economy-brief.md. The brief's
// tag legend is LAW. RULED items are built; PROPOSED §4-5 recipes are implemented as the brief's
// STARTING values (marked tunable in text); §7 OPEN items are STUBBED + FLAGGED, never decided;
// no rules value is invented — where TFA sphere/accessory mechanics would go, a ⚠ owed marker sits.
//
// PLAYER-FACING NAME LAW (brief §3.4): the emotion/denial register (grief, shame, appetite, rage,
// rumour, righteousness, panic) is GM-SIDE ONLY and appears in NO string this file emits. Only the
// Lodge terms (Algor/Sordes/Inanition/Empyreuma/Susurrus/Residuum), damage types, sphere names,
// street counterparts and word-etymologies are player-facing here.
//
// V2-vs-installed gap (approved split, god conv-hoplo-build): the installed build (v1.2.1) is newer
// than any public Fabricate repo. This file is authored to the extracted V2 `FabricateExportModel`.
// Four runtime-only features are STUBBED with a V2 approximation + a TODO(V3) marker so the file still
// imports; they finalize when god hands over a real exportSystem() sample:
//   - RENDERING progressive salvage-run yield  (here: fixed 2-shard salvageOption)
//   - per-system CHECK config (DL~10 Fixation / DL~13 Decoction)  (here: no check field emitted)
//   - THE SCORCH Ruined/Crude/Sound tier bands  (here: 3 independent resultOptions, macro-driven)
//   - Susurrus GATHERING environment  (here: Susurrus shards exist as ordinary components)

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PACK_DIR = path.join(ROOT, 'src', 'packs', 'components');
const SYS_DIR = path.join(ROOT, 'system');

const MODULE_ID = 'rippers-hoplosphere';
const PACK_NAME = 'components';
const SYSTEM_ID = 'rippers-hoplosphere';
const SOURCE = 'Rippers Unmasked — Hoplosphere Economy';
const OWED = '⚠ owed'; // marker for a rules value not in source — never invented

// ---- deterministic 16-char Foundry _id per component slug -----------------------------------------
// 16 alphanumeric chars or compilePack throws LEVEL_INVALID_KEY. Prefix (4) + 12-digit counter.
let _counter = 0;
const _idBySlug = new Map();
function foundryId(slug, prefix) {
	if (_idBySlug.has(slug)) return _idBySlug.get(slug);
	_counter += 1;
	const id = (prefix + String(_counter).padStart(12, '0')).slice(0, 16);
	_idBySlug.set(slug, id);
	return id;
}
const compendiumUuid = (id) => `Compendium.${MODULE_ID}.${PACK_NAME}.Item.${id}`;

// ---- Foundry Item document builders --------------------------------------------------------------
const p = (s) => `<p>${s}</p>`;
function treasureItem({ id, name, subtype = 'material', costZ = null, desc, fuid, img = 'icons/svg/item-bag.svg', flags = {} }) {
	return {
		folder: null, name, type: 'treasure', img,
		system: {
			subtype: { value: subtype },
			summary: { value: costZ != null ? `${costZ}z` : '' },
			description: desc,
			showTitleCard: { value: false },
			cost: { value: costZ != null ? costZ : 0 },
			quantity: { value: 1 },
			origin: { value: '' },
			source: SOURCE,
			fuid,
		},
		effects: [], ownership: { default: 0 },
		flags: Object.keys(flags).length ? { [MODULE_ID]: flags } : {},
		_stats: { systemId: 'projectfu', coreVersion: '13.0.0' },
		sort: 0, _id: id, _key: `!items!${id}`,
	};
}

const itemDocs = []; // accumulates Foundry Item docs for the pack
const essences = [];  // Fabricate essences
const components = []; // Fabricate components
const recipes = [];   // Fabricate recipes

// ---- 1. ESSENCES (the aspect taxonomy) -----------------------------------------------------------
// Act I set (brief §3.1, RULED) + Susurrus (§3.2, RULED name / wave-2 timing) + a shared `shard`
// essence so INVESTITURE can require "any 2 shards" (approved design). Emotion/denial column omitted.
const ESSENCE_DATA = [
	['algor', 'Algor', 'ice', 'The ice register. Lodge term for the aspect that presents as cold. From <em>algor mortis</em>, the cooling of a corpse.'],
	['sordes', 'Sordes', 'poison', 'The poison register. Street counterpart: <em>the crust</em>. From <em>sordes</em>, the foul crust on a fever patient’s lips.'],
	['inanition', 'Inanition', 'dark', 'The dark register. Street counterpart: <em>the hollow</em>. From <em>inanition</em>, death by emptiness.'],
	['empyreuma', 'Empyreuma', 'fire', 'The fire register. Street counterpart: <em>the scorch</em> / <em>burnt batch</em>. From <em>empyreuma</em>, the burnt smell of organic matter spoiled by heat in a retort.'],
	['susurrus', 'Susurrus', 'air', 'The air register (wave-2 material). Street counterpart: <em>the whisper</em>. From <em>susurrus</em>, a sound heard on auscultation.'],
	['residuum', 'Residuum', '—', 'Refuses to refine. Over-differentiated material the Lodge’s categories cannot resolve. Has no sphere and no conversion rate — never a reagent (brief §6).'],
];
for (const [slug, name, dmg, desc] of ESSENCE_DATA) {
	essences.push({
		id: slug, name, tooltip: dmg === '—' ? 'Unrefinable aspect' : `${name} — ${dmg}`,
		iconCode: 'fa-droplet', disabled: false, description: desc,
		craftingSystemId: SYSTEM_ID, activeEffectSourceItemUuid: '',
	});
}
// shared mechanism essence
essences.push({
	id: 'shard', name: 'Shard', tooltip: 'Any refined shard', iconCode: 'fa-shard',
	disabled: false, description: 'Shared tag carried by every aspect shard so a recipe can require "any N shards" regardless of aspect.',
	craftingSystemId: SYSTEM_ID, activeEffectSourceItemUuid: '',
});

// ---- helper to register a component (mints its Foundry Item + Fabricate component) ----------------
function addComponent({ slug, prefix, name, subtype, costZ = null, desc, essenceMap = {}, salvageOptions = [], img, flags = {} }) {
	const id = foundryId(slug, prefix);
	itemDocs.push(treasureItem({ id, name, subtype, costZ, desc, fuid: slug, img, flags }));
	components.push({
		id: slug, itemUuid: compendiumUuid(id), disabled: false,
		essences: essenceMap, salvageOptions, craftingSystemId: SYSTEM_ID,
	});
	return slug;
}

// ---- 2a. SHARDS -----------------------------------------------------------------------------------
// One shard/sphere at just over £2 (brief §8); a shard ~167z at 3/sphere (§5.2). Cost carried faithfully.
const SHARD_ASPECTS = ['algor', 'sordes', 'inanition', 'empyreuma', 'susurrus', 'residuum'];
const ASPECT_NAME = { algor: 'Algor', sordes: 'Sordes', inanition: 'Inanition', empyreuma: 'Empyreuma', susurrus: 'Susurrus', residuum: 'Residuum' };
for (const a of SHARD_ASPECTS) {
	const wave2 = a === 'susurrus' ? ' <em>(wave-2 material — GM enables when the beat lands.)</em>' : '';
	addComponent({
		slug: `shard-${a}`, prefix: 'RHSH', name: `${ASPECT_NAME[a]} Shard`, subtype: 'material', costZ: 167,
		desc: p(`<em>Shard — ${ASPECT_NAME[a]} aspect.</em> A fungible, anonymous, aspect-tagged fragment. Mute: it shows no vision (that lives in the assembled sphere).${wave2}`),
		essenceMap: a === 'residuum' ? { residuum: 1, shard: 1 } : { [a]: 1, shard: 1 },
		img: 'icons/svg/circle.svg',
	});
}

// ---- 2b. CLOTTED REMAINS (RENDERING salvage source) ----------------------------------------------
// RENDERING is salvage, not a recipe: Clotted Remains → shards of its aspect. TODO(V3): progressive
// salvage-run yield (brief: start 1-2 rising). V2 approximation = a fixed 2-shard salvageOption.
for (const a of SHARD_ASPECTS) {
	addComponent({
		slug: `clot-${a}`, prefix: 'RHCL', name: `Clotted Remains (${ASPECT_NAME[a]})`, subtype: 'material', costZ: null,
		desc: p(`<em>GM-dropped on a kill.</em> Rendered with a blade into shards of its aspect. TODO(V3): progressive salvage yield (start 1–2, rising) — the single number that tunes the whole economy; this V2 build fixes it at 2.`),
		essenceMap: {},
		salvageOptions: [{ id: `salvage-${a}`, name: `Render into ${ASPECT_NAME[a]} shards`, results: { [`shard-${a}`]: 2 }, catalysts: {} }],
		img: 'icons/svg/blood.svg',
	});
}

// ---- 2c. MATRICES (ingredients that select the result) -------------------------------------------
const MATRICES = [
	['matrix-phial', 'Apothecary Phial', 'Neutral matrix for licensed refining (Fixation).'],
	['matrix-scrapglass', 'Scrap Glass', 'Street matrix for The Scorch. Cheap, idiosyncratic.'],
	['matrix-quicklime', 'Quicklime', 'Afflictive matrix for Decoction.'],
	['matrix-silverleaf', 'Silver Leaf', 'Bane matrix → Blessed (undead).'],
	['matrix-coldiron', 'Cold Iron Filings', 'Bane matrix → Knightly (monsters).'],
	['matrix-lead', 'Churchyard Lead', 'Bane matrix → Skeptical (demons).'],
	['matrix-brass', 'Brass Swarf', 'Bane matrix → Disrupting (constructs).'],
];
for (const [slug, name, desc] of MATRICES) {
	addComponent({ slug, prefix: 'RHMX', name, subtype: 'material', desc: p(`<em>Matrix.</em> ${desc} Consumed on use.`), img: 'icons/svg/chest.svg' });
}

// ---- 2d. TOOLS (catalysts — present, not consumed) -----------------------------------------------
addComponent({ slug: 'tool-bench', prefix: 'RHTL', name: 'Lodge Bench', subtype: 'material',
	desc: p('<em>Tool (catalyst).</em> The licensed bench. Set Immune — never breaks. Required present for Fixation, Decoction, Investiture and Setting; not consumed. A bench requires a Lodge subscription (brief §5).'),
	flags: { tool: true, breakable: false }, img: 'icons/svg/anvil.svg' });
addComponent({ slug: 'tool-crucible', prefix: 'RHTL', name: 'Street Crucible', subtype: 'material',
	desc: p('<em>Tool (catalyst).</em> The street crucible. Breakable. Required present for The Scorch; not consumed by the recipe, but may shatter in play (GM-adjudicated).'),
	flags: { tool: true, breakable: true }, img: 'icons/svg/cave.svg' });

// ---- 2e. SPHERE OUTPUTS --------------------------------------------------------------------------
// A hoplosphere is ~500z (TFA p.137). The sphere's exact mechanical effect is TFA content — NOT
// invented here; each output carries a ⚠ owed marker where its rules text will go. coagulable flag
// carried per brief point 4 (enforcement automation deferred to a separate card).
function addSphere({ slug, name, aspect, dmg, d66, note, coagulable = true }) {
	addComponent({
		slug, prefix: 'RHSP', name, subtype: 'artifact', costZ: 500,
		desc: p(`<em>Hoplosphere — ${name}.</em> ${note} Damage/register: ${dmg}. Sample-list d66 ${d66}${aspect ? `, ${ASPECT_NAME[aspect]} aspect` : ''}. Worth ~500z. Mechanical effect (Techno Fantasy Atlas): ${OWED}.`),
		flags: { sphere: true, aspect: aspect || null, coagulable },
		img: 'icons/svg/aura.svg',
	});
}
// elemental (Fixation)
addSphere({ slug: 'sphere-arctic', name: 'Arctic Sphere', aspect: 'algor', dmg: 'ice', d66: 12, note: 'Elemental.' });
addSphere({ slug: 'sphere-volcanic', name: 'Volcanic Sphere', aspect: 'empyreuma', dmg: 'fire', d66: 65, note: 'Elemental.' });
addSphere({ slug: 'sphere-poisonous', name: 'Poisonous Sphere', aspect: 'sordes', dmg: 'poison', d66: 42, note: 'Elemental.' });
addSphere({ slug: 'sphere-dark', name: 'Dark Sphere', aspect: 'inanition', dmg: 'dark', d66: 21, note: 'Elemental.' });
addSphere({ slug: 'sphere-cyclonic', name: 'Cyclonic Sphere', aspect: 'susurrus', dmg: 'air', d66: 16, note: 'Elemental (wave-2).' });
// afflictive (Decoction)
addSphere({ slug: 'sphere-scornful', name: 'Scornful Sphere', aspect: 'empyreuma', dmg: 'fire', d66: 53, note: 'Afflictive — inflicts <strong>enraged</strong>.' });
addSphere({ slug: 'sphere-toxic', name: 'Toxic Sphere', aspect: 'sordes', dmg: 'poison', d66: 64, note: 'Afflictive — inflicts <strong>poisoned</strong>.' });
addSphere({ slug: 'sphere-draining', name: 'Draining Sphere', aspect: 'inanition', dmg: 'dark', d66: 24, note: 'Afflictive — steals HP/MP.' });
addSphere({ slug: 'sphere-ghastly', name: 'Ghastly Sphere', aspect: 'susurrus', dmg: 'air', d66: 31, note: 'Afflictive — inflicts <strong>shaken</strong> (wave-2).' });
// creature-type banes (Investiture) — matrix selects; aspect irrelevant
addSphere({ slug: 'sphere-blessed', name: 'Blessed Sphere', aspect: null, dmg: 'bane (undead)', d66: '—', note: 'Creature-type bane vs undead. Set from silver leaf.' });
addSphere({ slug: 'sphere-knightly', name: 'Knightly Sphere', aspect: null, dmg: 'bane (monsters)', d66: '—', note: 'Creature-type bane vs monsters. Set from cold iron.' });
addSphere({ slug: 'sphere-skeptical', name: 'Skeptical Sphere', aspect: null, dmg: 'bane (demons)', d66: '—', note: 'Creature-type bane vs demons. Set from churchyard lead.' });
addSphere({ slug: 'sphere-disrupting', name: 'Disrupting Sphere', aspect: null, dmg: 'bane (constructs)', d66: '—', note: 'Creature-type bane vs constructs. Set from brass swarf.' });
// THE SCORCH street outputs (STUB): crude (uncombinable) + sound
addSphere({ slug: 'sphere-street-crude', name: 'Crude Sphere', aspect: null, dmg: 'street', d66: '—', coagulable: false,
	note: 'Street work. Idiosyncratic — no two alike — so it can <strong>never coagulate</strong> (flag carried; enforcement deferred to a follow-up card). TODO(V3): bind to the SCORCH check "Crude" band.' });
addSphere({ slug: 'sphere-street-sound', name: 'Sound Sphere', aspect: null, dmg: 'street', d66: '—', coagulable: true,
	note: 'Street work at its best — a sound sphere, coagulable. TODO(V3): bind to the SCORCH check "Sound" band.' });
// ---- 2f. HOMEBREW NAMED SPHERE — Nightglass (the Hyde's Tuesday drop) -----------------------------
// Austin's OWN homebrew drop for the Hyde encounter — NOT a printed TFA sphere, so the ⚠-owed rule
// (which protects unreproducible TFA text) does not apply: the effect is his to define and is stated
// plainly below (god ruling, 2026-09-05). Authored via addComponent (not addSphere) precisely so its
// description carries the STATED homebrew effect instead of the addSphere '⚠ owed TFA' boilerplate,
// while keeping the identical sphere flags{sphere,aspect,coagulable}. Effect is applied MANUALLY by the
// GM/player for now; an auto-applying ActiveEffect is a post-Tuesday follow-up (no effect-engine work
// this week, per god). "Clot" is the campaign-facing name for a sphere.
addComponent({
	slug: 'sphere-nightglass', prefix: 'RHSP', name: 'Nightglass', subtype: 'artifact', costZ: 500,
	desc: p(`<em>Hoplosphere (Clot) — Nightglass.</em> Distilled from the Hyde's tainted serum: a shard of night-glass that turns the beast's own darkness aside. <strong>While seated in an armor socket: gain Resistance to dark.</strong> Register: dark, ${ASPECT_NAME.inanition} aspect. Worth ~500z. <em>Homebrew — this campaign only (Austin, for the Hyde encounter); NOT a Techno Fantasy Atlas owed sphere.</em> The Resist-dark effect is applied manually by the GM/player; auto-applying ActiveEffect wiring is a post-Tuesday follow-up.`),
	flags: { sphere: true, aspect: 'inanition', coagulable: true, homebrew: true },
	img: 'icons/svg/aura.svg',
});

// scrap yield from a Ruined Scorch
addComponent({ slug: 'scrap-slag', prefix: 'RHSL', name: 'Slag', subtype: 'material',
	desc: p('<em>Ruined street work.</em> What a failed Scorch leaves. Ingredients are consumed on failure.'), img: 'icons/svg/waste.svg' });

// ---- 2f. REMNANTS (Setting inputs) ---------------------------------------------------------------
addComponent({ slug: 'remnant-generic', prefix: 'RHRM', name: 'Harvested Remnant', subtype: 'material',
	desc: p(`<em>Remnant (accessory seed).</em> The case-specific object a Quality is set from — GM-assigned per accessory; not always a body part. The remnant selects the Quality (brief §5.1). Best template: a remnant that isn’t a body part (§5.2).`), img: 'icons/svg/mystery-man.svg' });
addComponent({ slug: 'remnant-hyde', prefix: 'RHRM', name: 'Hyde Sinew', subtype: 'material',
	desc: p('<em>Remnant (worked example).</em> Transformed sinew that does not relax after death. Sets Weapon Up (melee). The tutorial fight hands it over.'), img: 'icons/svg/mystery-man.svg' });
addComponent({ slug: 'remnant-melmoth', prefix: 'RHRM', name: 'Melmoth Broadsheet', subtype: 'material',
	desc: p('<em>Remnant (worked example).</em> The broadsheet that libelled the man — not anything off the creature, because the Wanderer is made of the lie. Its Quality goes custom rather than table.'), img: 'icons/svg/book.svg' });

// ---- 2g. ACCESSORY OUTPUTS (Setting results) -----------------------------------------------------
// Book prices are RAW (CRB §2.5 / brief §5.2). Exact accessory rare-item mechanics: ⚠ owed (not invented).
function addAccessory({ slug, name, costZ, note }) {
	addComponent({ slug, prefix: 'RHAC', name, subtype: 'artifact', costZ,
		desc: p(`<em>Accessory.</em> ${name}. ${note} One accessory slot per character (CRB). Book price ${costZ}z. Exact rare-item rules text: ${OWED}.`),
		flags: { accessory: true }, img: 'icons/svg/ice-aura.svg' });
}
addAccessory({ slug: 'acc-antistatus', name: 'Antistatus Accessory', costZ: 500, note: 'Table Quality.' });
addAccessory({ slug: 'acc-resistance', name: 'Resistance Accessory', costZ: 700, note: 'Table Quality.' });
addAccessory({ slug: 'acc-swordbreaker', name: 'Swordbreaker Accessory', costZ: 1000, note: 'Physical Resistance — the only route to it in this campaign (no physical sphere exists).' });
addAccessory({ slug: 'acc-immunity', name: 'Immunity Accessory', costZ: 1500, note: 'Table Quality.' });
addAccessory({ slug: 'acc-weaponup', name: 'Weapon Up Accessory', costZ: 2000, note: 'Table Quality.' });
addAccessory({ slug: 'acc-hyde', name: 'The Hyde', costZ: 2000, note: 'Weapon Up (melee), set from Hyde sinew. Worked example.' });
addAccessory({ slug: 'acc-melmoth', name: 'Melmoth', costZ: null, note: `Custom off-table Quality, set from the broadsheet. Quality text: ${OWED} (Austin authors). Worked example — the better template.` });

// ---- 3. RECIPE-CARD ITEMS + recipe builder -------------------------------------------------------
// Each Fabricate recipe references an itemUuid (the pattern/formula item you own to know the recipe).
function addRecipe({ slug, name, cardNote, requirement, results }) {
	const cardId = foundryId(`card-${slug}`, 'RHRC');
	itemDocs.push(treasureItem({
		id: cardId, name: `Recipe: ${name}`, subtype: 'treasure', costZ: null,
		desc: p(`<em>Fabricate recipe card.</em> ${cardNote}`), fuid: `card-${slug}`, img: 'icons/svg/book.svg',
	}));
	recipes.push({
		id: slug, itemUuid: compendiumUuid(cardId), disabled: false, craftingSystemId: SYSTEM_ID,
		requirementOptions: [requirement],
		resultOptions: Array.isArray(results) ? results : [results],
	});
}
const req = ({ name = 'Ingredients', catalysts = {}, ingredients = {}, essences = {} }) => ({ id: 'req', name, catalysts, ingredients, essences });
const res = ({ id = 'out', name = 'Product', results }) => ({ id, name, results });

// FIXATION ×5 — licensed elemental. 3 shards of one aspect + phial, on the bench. DL~10 (TODO(V3) check).
// Ingredients returned on failure (TODO(V3): check-fail behaviour flag).
const FIXATION = [
	['fixation-arctic', 'Fixation — Arctic', 'algor', 'sphere-arctic', 'Arctic Sphere'],
	['fixation-volcanic', 'Fixation — Volcanic', 'empyreuma', 'sphere-volcanic', 'Volcanic Sphere'],
	['fixation-poisonous', 'Fixation — Poisonous', 'sordes', 'sphere-poisonous', 'Poisonous Sphere'],
	['fixation-dark', 'Fixation — Dark', 'inanition', 'sphere-dark', 'Dark Sphere'],
	['fixation-cyclonic', 'Fixation — Cyclonic (wave-2)', 'susurrus', 'sphere-cyclonic', 'Cyclonic Sphere'],
];
for (const [slug, name, aspect, out, outName] of FIXATION) {
	addRecipe({
		slug, name,
		cardNote: `Licensed elemental refining. 3 ${ASPECT_NAME[aspect]} shards + an apothecary phial, on the Lodge bench. DL ~10 (TODO(V3): per-system check). Ingredients returned on failure.`,
		requirement: req({ catalysts: { 'tool-bench': 1 }, ingredients: { 'matrix-phial': 1 }, essences: { [aspect]: 3 } }),
		results: res({ name: outName, results: { [out]: 1 } }),
	});
}

// DECOCTION ×4 — licensed afflictive. 3 shards + quicklime, on the bench. DL~13.
// NOTE §9#6: one check per system — Fixation (DL10) and Decoction (DL13) may need SEPARATE systems;
// resolved once the V3 envelope shows whether DL rides the recipe or the system.
const DECOCTION = [
	['decoction-scornful', 'Decoction — Scornful', 'empyreuma', 'sphere-scornful', 'Scornful Sphere'],
	['decoction-toxic', 'Decoction — Toxic', 'sordes', 'sphere-toxic', 'Toxic Sphere'],
	['decoction-draining', 'Decoction — Draining', 'inanition', 'sphere-draining', 'Draining Sphere'],
	['decoction-ghastly', 'Decoction — Ghastly (wave-2)', 'susurrus', 'sphere-ghastly', 'Ghastly Sphere'],
];
for (const [slug, name, aspect, out, outName] of DECOCTION) {
	addRecipe({
		slug, name,
		cardNote: `Licensed afflictive refining. 3 ${ASPECT_NAME[aspect]} shards + quicklime, on the Lodge bench. DL ~13 (TODO(V3): per-system check). Runs 2–3 slots to seat.`,
		requirement: req({ catalysts: { 'tool-bench': 1 }, ingredients: { 'matrix-quicklime': 1 }, essences: { [aspect]: 3 } }),
		results: res({ name: outName, results: { [out]: 1 } }),
	});
}

// INVESTITURE ×4 — the bane. 2 shards of ANY aspect + a bane matrix, on the bench. Matrix selects.
const INVESTITURE = [
	['investiture-blessed', 'Investiture — Blessed', 'matrix-silverleaf', 'sphere-blessed', 'Blessed Sphere'],
	['investiture-knightly', 'Investiture — Knightly', 'matrix-coldiron', 'sphere-knightly', 'Knightly Sphere'],
	['investiture-skeptical', 'Investiture — Skeptical', 'matrix-lead', 'sphere-skeptical', 'Skeptical Sphere'],
	['investiture-disrupting', 'Investiture — Disrupting', 'matrix-brass', 'sphere-disrupting', 'Disrupting Sphere'],
];
for (const [slug, name, matrix, out, outName] of INVESTITURE) {
	addRecipe({
		slug, name,
		cardNote: `Creature-type bane. 2 shards of ANY aspect + the matrix, on the Lodge bench. The matrix alone selects the result (cheaper in shards — you are paying for the metal).`,
		requirement: req({ catalysts: { 'tool-bench': 1 }, ingredients: { [matrix]: 1 }, essences: { shard: 2 } }),
		results: res({ name: outName, results: { [out]: 1 } }),
	});
}

// SETTING — accessories. 1 remnant + N shards + phial, on the bench. Shard counts from §5.2 (RAW table).
// Separate recipe per Quality so each carries its own shard cost (avoids a mismatched menu selection).
const SETTING = [
	['setting-antistatus', 'Setting — Antistatus', 'remnant-generic', 2, 'acc-antistatus', 'Antistatus Accessory'],
	['setting-resistance', 'Setting — Resistance', 'remnant-generic', 2, 'acc-resistance', 'Resistance Accessory'],
	['setting-swordbreaker', 'Setting — Swordbreaker', 'remnant-generic', 3, 'acc-swordbreaker', 'Swordbreaker Accessory'],
	['setting-immunity', 'Setting — Immunity', 'remnant-generic', 5, 'acc-immunity', 'Immunity Accessory'],
	['setting-weaponup', 'Setting — Weapon Up', 'remnant-generic', 6, 'acc-weaponup', 'Weapon Up Accessory'],
	['setting-hyde', 'Setting — The Hyde', 'remnant-hyde', 6, 'acc-hyde', 'The Hyde'],
];
for (const [slug, name, remnant, shardN, out, outName] of SETTING) {
	addRecipe({
		slug, name,
		cardNote: `Accessory setting. 1 ${remnant === 'remnant-hyde' ? 'Hyde sinew' : 'remnant'} + ${shardN} shards + an apothecary phial, on the Lodge bench. The remnant selects the Quality. Shard count per brief §5.2.`,
		requirement: req({ catalysts: { 'tool-bench': 1 }, ingredients: { [remnant]: 1, 'matrix-phial': 1 }, essences: { shard: shardN } }),
		results: res({ name: outName, results: { [out]: 1 } }),
	});
}
// Melmoth worked example — custom Quality, Susurrus shards 3 (brief "3–4"; start at 3, tunable).
addRecipe({
	slug: 'setting-melmoth', name: 'Setting — Melmoth',
	cardNote: 'Accessory setting (worked example, the better template). The broadsheet + 3 Susurrus shards + a phial, on the bench. Custom off-table Quality — a remnant that isn’t a body part is where the setting gets to say something.',
	requirement: req({ catalysts: { 'tool-bench': 1 }, ingredients: { 'remnant-melmoth': 1, 'matrix-phial': 1 }, essences: { susurrus: 3 } }),
	results: res({ name: 'Melmoth', results: { 'acc-melmoth': 1 } }),
});

// THE SCORCH — street. 2 shards of any aspect + scrap glass, in the breakable crucible.
// SHIPPED SIMPLE (single crude output): the installed 1.9.2 normalizer (_normalizeRoutedCraftingCheck)
// rejects any derived routed shape wholesale (mode snaps to passFail, fixedOutcomes strip to 0), so a
// routedByCheck recipe is silently dropped on import. Austin's call: ship the reliable CRUDE yield now,
// defer the 3-tier Ruined/Crude/Sound routing (card ROUTED-scorch-tiers-future) until the canonical routed
// shape is captured from a UI-BUILT check exported live. Crude (not Sound) preserves the register split:
// street work reliably yields an uncombinable sphere — cheaper and powerful, but caps you at one per effect.
// (sphere-street-sound + scrap-slag stay minted in the compendium for the future routed version.)
addRecipe({
	slug: 'the-scorch', name: 'The Scorch',
	cardNote: 'Street work. 2 shards of ANY aspect + scrap glass, in the street crucible. Reliably yields a Crude sphere — idiosyncratic, powerful, and it can never coagulate (caps the owner at one per effect). The 3-tier Ruined/Crude/Sound version is deferred.',
	requirement: req({ catalysts: { 'tool-crucible': 1 }, ingredients: { 'matrix-scrapglass': 1 }, essences: { shard: 2 } }),
	results: res({ id: 'crude', name: 'Crude — uncombinable sphere', results: { 'sphere-street-crude': 1 } }),
});

// ---- 4. TRANSFORM V2-shaped intermediates → schemaVersion 4 (Fabricate 1.9.2) --------------------
// The collectors above built V2-shaped essences[]/components[]/recipes[] (readable, integrity-checked).
// Schema 4 (locked from god's live export + the 1.9.2 bundle Recipe model) relocates + renames them:
//   essences        → system.essenceDefinitions[]
//   components       → system.components[] (itemUuid → originItemUuid + registeredItemUuid; salvageOptions → salvage.resultGroups)
//   tools bench/cruc → system.tools[] (NOT components; recipe catalysts → recipe.toolIds)
//   recipes          → TOP-LEVEL recipes[] (requirementOptions.essences → ingredientGroups[].options[]
//                       .match{type:essence,amount} — NOT the set-level essences map, which only gates;
//                       .ingredients → ingredientGroups[].options[].match{type:component}; .catalysts → toolIds;
//                       resultOptions → resultGroups[{id,name,results:[{componentId,quantity}]}])
//   recipe cards     → system.recipeItemDefinitions[] (the learnable holder; recipeIds links the recipe)
// Per-recipe DC via recipe.dcOverride (confirmed present in the 1.9.2 bundle) — DECOCTION 13 vs default 10:
// ONE system, no split (god ratified). SCORCH → resultSelection {provider:"check"} + routed check + macro.

const TOOL_IDS = new Set(['tool-bench', 'tool-crucible']);
const docByUuid = new Map(itemDocs.map((d) => [compendiumUuid(d._id), d]));
const meta = (uuid) => { const d = docByUuid.get(uuid) || {}; return { name: d.name || '', img: d.img || 'icons/svg/item-bag.svg', description: d.system?.description || '' }; };
const asResults = (map) => Object.entries(map).map(([componentId, quantity]) => ({ componentId, quantity }));

// essenceDefinitions (schema-4 essence element)
const essenceDefinitions = essences.map((e) => ({
	id: e.id, name: e.name, description: e.description, icon: 'fas fa-mortar-pestle',
	colorToken: null, enabled: !e.disabled, propertyMacroUuid: null, sourceComponentId: null, sourceItemUuid: null,
}));

// split V2 components → schema-4 components vs tools
const sysComponents = [];
const sysTools = [];
for (const c of components) {
	const m = meta(c.itemUuid);
	if (TOOL_IDS.has(c.id)) {
		const breakable = c.id === 'tool-crucible'; // Lodge bench never breaks; street crucible is breakable
		sysTools.push({
			id: c.id, enabled: true, componentId: null, label: m.name, name: m.name, img: m.img, description: m.description,
			registeredItemUuid: c.itemUuid, originItemUuid: c.itemUuid, aliasItemUuids: [],
			requirement: null, prerequisites: { enabled: false, ids: [], gateMode: 'usability' }, bonus: { enabled: false, expression: '' },
			breakage: { mode: 'limitedUses', maxUses: null }, checkBreakable: breakable, onBreak: { mode: 'destroy' }, repairRequirements: [],
		});
		continue;
	}
	const hasSalvage = c.salvageOptions.length > 0;
	sysComponents.push({
		id: c.id, name: m.name, img: m.img, description: m.description,
		originItemUuid: c.itemUuid, registeredItemUuid: c.itemUuid, aliasItemUuids: [],
		tier: null, category: 'general', tags: [], essences: c.essences,
		salvage: hasSalvage
			? {
				enabled: true, allowPlayerResultReorder: true, ingredientQuantity: 1, dcOverride: null, toolIds: [],
				// TODO(tune): RENDERING progressive 1–2-rising yield lives in system.salvageCraftingCheck.progressive.rollFormula.
				resultGroups: c.salvageOptions.map((so) => ({ id: so.id, name: so.name, results: asResults(so.results) })),
			}
			: { enabled: false, allowPlayerResultReorder: true, ingredientQuantity: 1, dcOverride: null, toolIds: [], resultGroups: [] },
	});
}

// recipes → top-level recipes[] + recipeItemDefinitions[]
const DECOCTION_DC = 13; // brief §5.3 DL ~13; FIXATION/others use the system default (10) via dcOverride:null
const sysRecipes = [];
const recipeItemDefinitions = [];
for (const r of recipes) {
	const rq = r.requirementOptions[0];
	const toolIds = Object.keys(rq.catalysts);
	const ingredientGroups = Object.entries(rq.ingredients).map(([componentId, quantity]) => ({
		id: `grp-${componentId}`, options: [{ quantity, match: { type: 'component', componentId } }],
	}));
	// ESSENCE COST IS A GROUP, NOT THE SET-LEVEL MAP. Measured against Fabricate 1.9.5 in the e2e
	// harness (hive/VERIFY-fabricate-consumption.md): ingredientSets[].essences is an AVAILABILITY
	// GATE ONLY — the resolver checks it, returns essenceAllocation {}, and consumes nothing, so a
	// craft spent the matrix and handed out the sphere FREE. Expressed as an ingredient-group option
	// the same cost deducts exactly. Note the key is `amount`, NOT `quantity`; Fabricate's validator
	// rejects the latter ("Essence ingredient match requires an essence and a positive amount").
	for (const [essenceId, amount] of Object.entries(rq.essences)) {
		ingredientGroups.push({
			id: `grp-ess-${essenceId}`,
			options: [{ quantity: 1, match: { type: 'essence', essenceId, amount } }],
		});
	}
	const ingredientSets = [{ id: `${r.id}-set`, essences: {}, ingredientGroups }];
	const resultGroups = r.resultOptions.map((o) => ({ id: o.id, name: o.name, results: asResults(o.results) }));
	// No recipe is routed in this build (SCORCH ships simple — see its definition). The routed-by-check
	// path (resultSelection {provider:'check'} + outcomeRouting map) is deferred until the canonical routed
	// shape is captured from a UI-built check; the installed normalizer rejects any derived routed shape.
	const routed = false;
	const dcOverride = r.id.startsWith('decoction-') ? DECOCTION_DC : null;

	sysRecipes.push({
		id: r.id, name: r.id, enabled: true,
		ingredientSets, resultGroups, toolIds, catalysts: [], dcOverride,
		resultSelection: routed ? { provider: 'check' } : null,
		outcomeRouting: routed ? Object.fromEntries(resultGroups.map((g) => [g.id, g.id])) : null,
		checkTierId: null,
	});

	// the learnable holder item that grants this recipe
	const cardMeta = meta(r.itemUuid);
	recipeItemDefinitions.push({
		id: `card-${r.id}`, name: cardMeta.name, description: cardMeta.description, img: cardMeta.img,
		originItemUuid: r.itemUuid, registeredItemUuid: r.itemUuid, aliasItemUuids: [], enabled: true,
		recipeIds: [r.id],
		caps: {
			item: { limitUses: false, destroyWhenExhausted: false, whenSpent: 'destroyed' },
			learn: { consumeOnLearn: false, limitRecipes: false, limitLearning: false, learnScope: 'perInstance', learningMode: 'once', prerequisiteIds: [], characterPrerequisiteIds: [], destroyWhenSpent: false },
		},
	});
}

// the three system-level checks (shape locked from the empty-system export)
const checkCommon = () => ({ rollFormula: '', dc: 10, thresholdMode: 'meet', dcMode: 'static', tiers: [], macroUuid: null, checkBreakage: { triggers: [] } });
const craftingCheck = {
	enabled: true, mode: 'passFail',
	consumption: { consumeIngredientsOnFail: false, breakToolsOnFail: false }, // FIXATION/DECOCTION/etc. return on failure
	failureResultPolicy: 'perRecord',
	simple: checkCommon(), // default DC 10; DECOCTION overrides to 13 via recipe.dcOverride
	// routed left at the empty default — nothing uses it (SCORCH ships simple). The 3-tier routed check is
	// deferred: the installed 1.9.2 normalizer rejects any offline-derived routed shape, so its canonical form
	// must be captured from a UI-built check exported live (card ROUTED-scorch-tiers-future).
	routed: { type: 'relative', rollFormula: '', dc: 15, thresholdMode: 'meet', dcMode: 'static', macroUuid: null, tiers: [], relativeOutcomes: [], fixedOutcomes: [], checkBreakage: { triggers: [] } },
	progressive: { awardMode: 'equal', rollFormula: '', checkBreakage: { triggers: [] } },
	outcomes: ['fail', 'pass'], defaultModifierPolicy: 'addAll', defaultModifierIds: [],
};
const salvageCraftingCheck = {
	enabled: false, // RENDERING yields without a gate; the 1–2-rising yield is a tunable progressive rollFormula below
	consumption: { consumeComponentOnFail: true, breakToolsOnFail: false }, failureResultPolicy: 'perRecord',
	simple: checkCommon(),
	routed: { type: 'relative', rollFormula: '', dc: 15, thresholdMode: 'meet', dcMode: 'static', macroUuid: null, tiers: [], relativeOutcomes: [], fixedOutcomes: [], checkBreakage: { triggers: [] } },
	progressive: { awardMode: 'equal', rollFormula: '1d2', checkBreakage: { triggers: [] } }, // brief: start yield 1–2, tunable
	outcomes: ['fail', 'pass'], defaultModifierPolicy: 'addAll', defaultModifierIds: [],
};
const gatheringCraftingCheck = {
	enabled: false, failureResultPolicy: 'perRecord',
	progressive: { awardMode: 'equal', rollFormula: '', checkBreakage: { triggers: [] } },
	routed: { type: 'relative', rollFormula: '', dc: 15, thresholdMode: 'meet', dcMode: 'static', macroUuid: null, tiers: [], relativeOutcomes: [], fixedOutcomes: [], checkBreakage: { triggers: [] } },
	defaultModifierPolicy: 'addAll', defaultModifierIds: [],
};

const exportModel = {
	schemaVersion: 4,
	fabricateVersion: '1.9.2',
	exportedAt: new Date().toISOString(),
	runtimeStateIncluded: false,
	system: {
		id: SYSTEM_ID, name: 'Rippers — Harvested Hoplospheres',
		description: 'The Lodge’s harvested-hoplosphere economy for Rippers Unmasked. Aspects are essences; shards refine into spheres; matrices set banes; remnants set accessories. Source-faithful to the hoplosphere-economy brief; no invented rules values (⚠ owed markers where TFA mechanics belong). The Susurrus gathering environment is not yet authored (features.gathering off) — its element shape needs a live populated-gathering export; Susurrus material still flows through the shard components. Search TODO for tunable starting values.',
		enabled: true, resolutionMode: 'simple',
		features: {
			recipeCategories: true, categories: true, itemTags: true,
			essences: true, multiStepRecipes: false, propertyMacros: false,
			craftingChecks: true, outcomeRouting: true, effectTransfer: false,
			gathering: false, salvage: true, chatOutput: true, itemPiles: false, refundOnPlayerCancel: true,
		},
		itemTags: [], visibilityMode: 'knowledge',
		recipeVisibility: { listMode: 'global', knowledge: { mode: 'itemOrLearned', learn: { dragDropEnabled: true } } },
		requirements: { time: { enabled: true }, currency: { enabled: false } },
		essenceDefinitions,
		recipeItemDefinitions,
		membershipResolvesByRecipeIds: false, modifiers: [],
		craftingCheck,
		salvageResolutionMode: 'simple',
		toolBreakage: { authority: 'toolSpecific' },
		salvageCraftingCheck,
		gatheringCraftingCheck,
		alchemy: null, // slot EXISTS; Residuum→Alchemy deliberately NOT built (canon: Residuum refuses to refine)
		teaserConfig: { enabled: false, discoveryMode: 'threshold', fragments: [] }, // slot for 'aspect hidden until Study'; not built
		componentCategories: [], categoryIcons: {}, componentCategoryIcons: {}, categories: [],
		components: sysComponents,
		tools: sysTools,
		characterPrerequisites: [], gatheringRealmSettings: { enabled: false },
	},
	recipes: sysRecipes,
	gatheringEnvironments: [], // TODO: author the Susurrus pub/press/crowd env once a populated-gathering export locks the element shape
	gatheringConfig: { system: {}, shared: { vocabularies: {}, conditions: { weather: 'clear', timeOfDay: 'day' } } },
	currencyConfig: { spendStrategy: 'actorProperty', providerId: '', macros: { canAfford: '', increment: '', decrement: '' }, units: [] },
	travelConfig: { revealMode: 'manual', modifierVisibility: 'visible', realms: [] },
};

// ---- 5. EMIT + schema-4 self-consistency ---------------------------------------------------------
async function emptyDir(dir) {
	await fs.rm(dir, { recursive: true, force: true });
	await fs.mkdir(dir, { recursive: true });
}

async function main() {
	// V3 GUARD: since V3 the shipped system JSON is maintained from the OWNER'S LIVE EXPORT
	// (Fabricate 1.9.4 normalizer schema — result ids, componentId echoes, plain-text descriptions),
	// which this brief-derived generator cannot reproduce. Worse, this generator's PACK emit
	// RENUMBERS item ids (proven: a full regen dangles 4 registeredItemUuid refs the live world
	// binds), so regenerating EITHER artefact over the V3 state breaks id sync with the live world.
	// Set FORCE_V2_SYSTEM=1 only to deliberately re-emit the whole V2 shape (packs included).
	const sysPath = path.join(SYS_DIR, 'rippers-hoplosphere-system.json');
	const existing = await fs.readFile(sysPath, 'utf8').catch(() => '');
	const v3Present = existing.includes('"fabricateVersion": "1.9.4"') && process.env.FORCE_V2_SYSTEM !== '1';
	if (!v3Present) {
		await emptyDir(PACK_DIR);
		await fs.mkdir(SYS_DIR, { recursive: true });
		for (const doc of itemDocs) {
			await fs.writeFile(path.join(PACK_DIR, `${doc.type}_${doc._id}.json`), JSON.stringify(doc, null, '\t') + '\n');
		}
		await fs.writeFile(sysPath, JSON.stringify(exportModel, null, '\t') + '\n');
	} else {
		console.warn('SKIP all emits: V3 (live-export-based) system JSON present — this generator cannot');
		console.warn('reproduce the live ids (its pack emit renumbers them). Edit src/packs + the system');
		console.warn('JSON surgically instead, or FORCE_V2_SYSTEM=1 to deliberately re-emit the V2 shape.');
	}

	// self-consistency pass over the schema-4 model
	const compIds = new Set(sysComponents.map((c) => c.id));
	const toolIds = new Set(sysTools.map((t) => t.id));
	const essIds = new Set(essenceDefinitions.map((e) => e.id));
	const recipeIds = new Set(sysRecipes.map((r) => r.id));
	const packIds = new Set(itemDocs.map((d) => d._id));
	const uuidOk = (u) => typeof u === 'string' && packIds.has(u.split('.').pop());
	const problems = [];

	for (const c of sysComponents) {
		if (!uuidOk(c.originItemUuid) || !uuidOk(c.registeredItemUuid)) problems.push(`component ${c.id}: unresolved item UUID`);
		for (const k of Object.keys(c.essences)) if (!essIds.has(k)) problems.push(`component ${c.id}: essence ${k} not defined`);
		for (const g of c.salvage.resultGroups) for (const r of g.results) if (!compIds.has(r.componentId)) problems.push(`component ${c.id}: salvage → ${r.componentId} not a component`);
	}
	for (const t of sysTools) if (!uuidOk(t.originItemUuid) || !uuidOk(t.registeredItemUuid)) problems.push(`tool ${t.id}: unresolved item UUID`);
	for (const r of sysRecipes) {
		if (r.ingredientSets.length < 1) problems.push(`recipe ${r.id}: no ingredient set`);
		if (r.resultGroups.length < 1) problems.push(`recipe ${r.id}: no result group`);
		if (!r.resultSelection && r.resultGroups.length !== 1) problems.push(`recipe ${r.id}: simple mode needs exactly 1 result group (has ${r.resultGroups.length})`);
		if (r.resultSelection?.provider === 'check') {
			const groupIds = new Set(r.resultGroups.map((g) => g.id));
			const outcomeIds = new Set(exportModel.system.craftingCheck.routed.fixedOutcomes.map((o) => o.id));
			if (!r.outcomeRouting || Object.keys(r.outcomeRouting).length === 0) problems.push(`recipe ${r.id}: routed by check but no outcomeRouting`);
			for (const [outcomeId, gid] of Object.entries(r.outcomeRouting || {})) {
				if (!outcomeIds.has(outcomeId)) problems.push(`recipe ${r.id}: outcomeRouting key ${outcomeId} not a routed outcome`);
				if (!groupIds.has(gid)) problems.push(`recipe ${r.id}: outcomeRouting → ${gid} not a result group`);
			}
		}
		for (const s of r.ingredientSets) {
			for (const k of Object.keys(s.essences)) problems.push(`recipe ${r.id}: essence ${k} left in the set-level map — it gates but never deducts`);
			for (const g of s.ingredientGroups) for (const o of g.options) {
				if (o.match.type === 'component' && !compIds.has(o.match.componentId)) problems.push(`recipe ${r.id}: ingredient ${o.match.componentId} not a component`);
				if (o.match.type === 'essence') {
					if (!essIds.has(o.match.essenceId)) problems.push(`recipe ${r.id}: essence ${o.match.essenceId} not defined`);
					if (!(Number(o.match.amount) > 0)) problems.push(`recipe ${r.id}: essence ${o.match.essenceId} needs a positive \`amount\` (not \`quantity\`)`);
				}
			}
		}
		for (const g of r.resultGroups) for (const p of g.results) if (!compIds.has(p.componentId)) problems.push(`recipe ${r.id}: product ${p.componentId} not a component`);
		for (const tid of r.toolIds) if (!toolIds.has(tid)) problems.push(`recipe ${r.id}: tool ${tid} not defined`);
	}
	for (const d of recipeItemDefinitions) {
		if (!uuidOk(d.originItemUuid) || !uuidOk(d.registeredItemUuid)) problems.push(`recipeItemDef ${d.id}: unresolved item UUID`);
		for (const rid of d.recipeIds) if (!recipeIds.has(rid)) problems.push(`recipeItemDef ${d.id}: recipe ${rid} not defined`);
	}

	console.log(`schemaVersion:        ${exportModel.schemaVersion} (fabricate ${exportModel.fabricateVersion})`);
	console.log(`Items (compendium):   ${itemDocs.length}`);
	console.log(`essenceDefinitions:   ${essenceDefinitions.length}`);
	console.log(`components:            ${sysComponents.length}`);
	console.log(`tools:                ${sysTools.length}`);
	console.log(`recipes:              ${sysRecipes.length}`);
	console.log(`recipeItemDefinitions:${recipeItemDefinitions.length}`);
	if (problems.length) { console.error('SELF-CONSISTENCY PROBLEMS:\n' + problems.join('\n')); process.exit(1); }
	console.log('Schema-4 self-consistency: OK');
}
main();
