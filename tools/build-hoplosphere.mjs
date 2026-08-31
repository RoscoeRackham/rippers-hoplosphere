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

// THE SCORCH — street (STUB). 2 shards of any aspect + scrap glass, in the breakable crucible.
// Routed by CHECK into Ruined / Crude / Sound (brief §5). §9#5: FU crits can't be dice-group triggers,
// so the tier is decided by an EXTERNAL roll then craftRecipe(resultOptionId) — see the shipped macro.
// V2 approximation: three independent resultOptions. Ingredients consumed on failure.
addRecipe({
	slug: 'the-scorch', name: 'The Scorch',
	cardNote: 'Street work. 2 shards of ANY aspect + scrap glass, in the street crucible. Routed by check into Ruined / Crude / Sound — pick the result option matching an EXTERNAL FU check (macro-driven; TODO(V3): native check tier bands, §9#5). Ingredients consumed on failure. A Crude sphere can never coagulate.',
	requirement: req({ catalysts: { 'tool-crucible': 1 }, ingredients: { 'matrix-scrapglass': 1 }, essences: { shard: 2 } }),
	results: [
		res({ id: 'ruined', name: 'Ruined — slag', results: { 'scrap-slag': 1 } }),
		res({ id: 'crude', name: 'Crude — uncombinable sphere', results: { 'sphere-street-crude': 1 } }),
		res({ id: 'sound', name: 'Sound — coagulable sphere', results: { 'sphere-street-sound': 1 } }),
	],
});

// ---- 4. ASSEMBLE + EMIT --------------------------------------------------------------------------
const exportModel = {
	version: 'V2',
	craftingSystem: {
		id: SYSTEM_ID,
		details: {
			name: 'Rippers — Harvested Hoplospheres',
			summary: 'Monster material → shards → hoplospheres, plus the accessory setting recipe.',
			description: 'The Lodge’s harvested-hoplosphere economy for Rippers Unmasked. Aspects are essences; shards refine into spheres; matrices set banes; remnants set accessories. Built from the hoplosphere-economy brief (source-faithful; no invented rules values). Some runtime fields (progressive salvage yield, per-system check DLs, Scorch tier bands, the Susurrus gathering environment) are STUBBED pending the installed build’s V3 export envelope — search TODO(V3).',
			author: 'Austin (cubemail.exe) — Rippers Unmasked',
		},
		disabled: false,
	},
	essences,
	components,
	recipes,
};

async function emptyDir(dir) {
	await fs.rm(dir, { recursive: true, force: true });
	await fs.mkdir(dir, { recursive: true });
}

async function main() {
	await emptyDir(PACK_DIR);
	await fs.mkdir(SYS_DIR, { recursive: true });
	// one JSON per Foundry Item
	for (const doc of itemDocs) {
		const fname = `${doc.type}_${doc._id}.json`;
		await fs.writeFile(path.join(PACK_DIR, fname), JSON.stringify(doc, null, '\t') + '\n');
	}
	// the crafting-system file
	await fs.writeFile(path.join(SYS_DIR, 'rippers-hoplosphere-system.json'), JSON.stringify(exportModel, null, '\t') + '\n');

	// integrity checks
	const compIds = new Set(components.map((c) => c.id));
	const essIds = new Set(essences.map((e) => e.id));
	const problems = [];
	for (const r of recipes) {
		for (const opt of r.requirementOptions) {
			for (const k of Object.keys(opt.ingredients)) if (!compIds.has(k)) problems.push(`${r.id}: ingredient ${k} not a component`);
			for (const k of Object.keys(opt.catalysts)) if (!compIds.has(k)) problems.push(`${r.id}: catalyst ${k} not a component`);
			for (const k of Object.keys(opt.essences)) if (!essIds.has(k)) problems.push(`${r.id}: essence ${k} not an essence`);
		}
		for (const opt of r.resultOptions) for (const k of Object.keys(opt.results)) if (!compIds.has(k)) problems.push(`${r.id}: product ${k} not a component`);
	}
	for (const c of components) for (const opt of c.salvageOptions) for (const k of Object.keys(opt.results)) if (!compIds.has(k)) problems.push(`${c.id}: salvage ${k} not a component`);
	for (const c of components) for (const k of Object.keys(c.essences)) if (!essIds.has(k)) problems.push(`${c.id}: essence ${k} not an essence`);

	console.log(`Items:     ${itemDocs.length}`);
	console.log(`Essences:  ${essences.length}`);
	console.log(`Components:${components.length}`);
	console.log(`Recipes:   ${recipes.length}`);
	if (problems.length) { console.error('INTEGRITY PROBLEMS:\n' + problems.join('\n')); process.exit(1); }
	console.log('Referential integrity: OK');
}
main();
