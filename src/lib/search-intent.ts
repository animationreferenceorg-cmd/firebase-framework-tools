import type { Video } from './types';

/**
 * Animation reference search engine.
 *
 * Design rules (precision first — artists want exactly what they typed):
 *  1. The query is parsed into recognised CONCEPTS (storyboard, turnaround,
 *     walk cycle, …) plus leftover free-text words.
 *  2. Every specific concept in the query is a HARD GATE: a reference only
 *     matches if its own metadata (title, tags, categories, description) shows
 *     evidence of that concept. "storyboard" returns storyboards only.
 *  3. Broad concepts (character design, vis dev) only gate when they are the
 *     only thing searched for; otherwise they just boost ranking.
 *  4. With no recognised concept, every meaningful query word must appear
 *     (stemmed, whole-word) somewhere in the reference's metadata.
 *  5. Source or media type alone never makes something relevant.
 */

export type ReferenceTab = '3d-models' | 'character-design' | 'animations' | 'visdev';

export interface SearchIntent {
  rawQuery: string;
  normalizedQuery: string;
  /** Meaningful free-text words (stemmed) left after concept phrases are removed. */
  tokens: string[];
  /** Recognised concept ids, most specific first. */
  concepts: string[];
  /** Human readable phrases for the recognised concepts (used for external filtering). */
  synonyms: string[];
  boostMediaType?: 'model3d' | 'video' | 'image';
  boostTab?: ReferenceTab;
  externalQueries: {
    /** null = this concept does not exist on Sketchfab, skip the request. */
    sketchfab: string | null;
    sketchfabAnimated?: boolean;
    sketchfabCategory?: string;
    artstation: string[];
    pinterest: string[];
    /** Empty = skip Sakugabooru. */
    sakugabooru: string[];
    wikimedia: boolean;
    archive: boolean;
  };
}

interface ConceptDef {
  id: string;
  label: string;
  /** Broad concepts only gate when nothing more specific was searched. */
  broad?: boolean;
  /**
   * Whether a mention in the free-text description counts as evidence. Off by
   * default because descriptions mention words like "run" or "fire" casually.
   */
  descriptionOk?: boolean;
  /** Patterns detected (and consumed) in the user's query. */
  query: RegExp[];
  /** Strong evidence patterns applied to normalised reference metadata. */
  content: RegExp[];
  /** Structural evidence that does not depend on text (e.g. it IS a 3D model). */
  structural?: (video: Video) => boolean;
  mediaType?: 'model3d' | 'video' | 'image';
  tab?: ReferenceTab;
  external: {
    sketchfab: string | null;
    sketchfabAnimated?: boolean;
    sketchfabCategory?: string;
    artstation: string[];
    sakugabooru: string[];
    wikimedia?: boolean;
    archive?: boolean;
  };
}

const is3DStructural = (v: Video) => {
  const anyV = v as any;
  return anyV.mediaType === 'model3d' || v.source === 'sketchfab' || String(v.id || '').startsWith('sf_');
};

/**
 * Ordered most-specific first: phrases are consumed from the query in this
 * order, so "character turnaround" is claimed by turnaround before
 * character-design can see the word "character".
 */
export const REFERENCE_CONCEPTS: ConceptDef[] = [
  {
    id: 'storyboard',
    label: 'Storyboards',
    descriptionOk: true,
    query: [/\bstory\s*boards?(ing)?\b/, /\bthumbnail\s*boards?\b/, /\bbeat\s*boards?\b/, /\bboard\s*panels?\b/],
    content: [/\bstory\s*board(s|ing|ed|er|ers)?\b/, /\bthumbnail\s*boards?\b/, /\bbeat\s*boards?\b/, /\bboard\s*panels?\b/],
    mediaType: 'image',
    tab: 'visdev',
    external: { sketchfab: null, artstation: ['storyboard', 'storyboard panels', 'animation storyboard'], sakugabooru: [] },
  },
  {
    id: 'animatic',
    label: 'Animatics',
    descriptionOk: true,
    query: [/\banimatics?\b/, /\bstory\s*reels?\b/, /\bleica\s*reels?\b/],
    content: [/\banimatics?\b/, /\bstory\s*reels?\b/, /\bleica\s*reels?\b/],
    mediaType: 'video',
    tab: 'animations',
    external: { sketchfab: null, artstation: ['animatic', 'storyboard animatic'], sakugabooru: [] },
  },
  {
    id: 'turnaround',
    label: 'Character Turnarounds',
    descriptionOk: true,
    query: [
      /\b(character\s*)?turn\s*arounds?\b/,
      /\b(character\s*)?turntables?\b/,
      /\b(character\s*|model\s*)sheets?\b/,
      /\b(character\s*)?rotations?\b/,
      /\b360(\s*(view|turn|spin|rotation))?\b/,
      /\borthographic(\s*views?)?\b/,
      /\bfront\s*(and\s*)?side\s*(and\s*)?back\b/,
    ],
    content: [
      /\bturn\s*arounds?\b/,
      /\bturntables?\b/,
      /\bmodel\s*sheets?\b/,
      /\bcharacter\s*sheets?\b/,
      /\bcharacter\s*rotations?\b/,
      /\b360\s*(view|turn|spin|rotation|degree)s?\b/,
      /\borthographic\b/,
      /\bfront\s*(and\s*)?side\s*(and\s*)?back\b/,
    ],
    tab: 'character-design',
    external: {
      sketchfab: 'character turnaround',
      sketchfabAnimated: false,
      sketchfabCategory: 'characters-creatures',
      artstation: ['character turnaround', 'turnaround sheet', 'character model sheet'],
      sakugabooru: [],
    },
  },
  {
    id: 'expression-sheet',
    label: 'Expression Sheets',
    query: [/\bexpressions?(\s*(sheets?|charts?|stud(y|ies)))?\b/, /\bfacial\s*expressions?\b/, /\bemotions?\b/],
    content: [/\bexpressions?\s*(sheets?|charts?|stud(y|ies))\b/, /\bfacial\s*expressions?\b/, /\bexpressions?\b/, /\bemotions?\b/],
    tab: 'character-design',
    external: { sketchfab: null, artstation: ['expression sheet', 'facial expressions character'], sakugabooru: [] },
  },
  {
    id: 'lip-sync',
    label: 'Lip Sync & Dialogue',
    descriptionOk: true,
    query: [/\blip\s*sync(ing)?\b/, /\bmouth\s*(shapes?|charts?)\b/, /\bphonemes?\b/, /\bvisemes?\b/, /\bdialogue\b/],
    content: [/\blip\s*sync(ing)?\b/, /\bmouth\s*(shapes?|charts?)\b/, /\bphonemes?\b/, /\bvisemes?\b/, /\bdialogue\b/],
    mediaType: 'video',
    tab: 'animations',
    external: { sketchfab: null, artstation: ['lip sync animation', 'mouth chart'], sakugabooru: ['lip_sync'] },
  },
  {
    id: 'acting',
    label: 'Character Acting',
    query: [/\b(character\s*)?acting\b/, /\bpantomime\b/],
    content: [/\bacting\b/, /\bpantomime\b/],
    mediaType: 'video',
    tab: 'animations',
    external: { sketchfab: null, artstation: ['character acting animation'], sakugabooru: ['character_acting'] },
  },
  {
    id: 'walk-cycle',
    label: 'Walk Cycles',
    query: [/\bwalk(s|ing)?(\s*cycles?)?\b/, /\bstrut(ting)?\b/, /\bsneak(ing)?(\s*walk)?\b/],
    content: [/\bwalk(s|ing|ed)?\b/, /\bwalk\s*cycles?\b/, /\bstrut(s|ting)?\b/, /\bsneak(s|ing)?\b/],
    mediaType: 'video',
    tab: 'animations',
    external: { sketchfab: 'walk cycle', sketchfabAnimated: true, artstation: ['walk cycle animation'], sakugabooru: ['walking'], wikimedia: true },
  },
  {
    id: 'run-cycle',
    label: 'Run Cycles',
    query: [/\brun(s|ning)?(\s*cycles?)?\b/, /\bsprint(s|ing)?\b/, /\bjog(s|ging)?\b/],
    content: [/\brun(s|ning)?\b/, /\brun\s*cycles?\b/, /\bsprint(s|ing)?\b/, /\bjog(s|ging)?\b/],
    mediaType: 'video',
    tab: 'animations',
    external: { sketchfab: 'run cycle', sketchfabAnimated: true, artstation: ['run cycle animation'], sakugabooru: ['running'], wikimedia: true },
  },
  {
    id: 'jump',
    label: 'Jumps & Landings',
    query: [/\bjump(s|ing)?\b/, /\bleap(s|ing)?\b/, /\blandings?\b/],
    content: [/\bjump(s|ing|ed)?\b/, /\bleap(s|ing)?\b/, /\blandings?\b/],
    mediaType: 'video',
    tab: 'animations',
    external: { sketchfab: 'jump animation', sketchfabAnimated: true, artstation: ['jump animation'], sakugabooru: ['jumping'], archive: true },
  },
  {
    id: 'body-mechanics',
    label: 'Body Mechanics',
    query: [
      /\bbody\s*mechanics?\b/,
      /\bmechanics\b/,
      /\bweight(\s*(shift|lift|study))?\b/,
      /\bheavy\s*lift(ing)?\b/,
      /\blift(s|ing)?\b/,
      /\bpush(es|ing)?\b/,
      /\bpull(s|ing)?\b/,
      /\bthrow(s|ing)?\b/,
      /\bparkour\b/,
      /\bacrobatics?\b/,
    ],
    content: [
      /\bbody\s*mechanics?\b/,
      /\bweight\s*(shift|lift|study|studies)\b/,
      /\bheavy\s*(lift|object|box)s?\b/,
      /\blift(s|ing)?\b/,
      /\bpush(es|ing)?\b/,
      /\bpull(s|ing)?\b/,
      /\bthrow(s|ing)?\b/,
      /\bparkour\b/,
      /\bacrobatics?\b/,
    ],
    mediaType: 'video',
    tab: 'animations',
    external: { sketchfab: 'body mechanics animation', sketchfabAnimated: true, artstation: ['body mechanics animation'], sakugabooru: ['acrobatics'], archive: true },
  },
  {
    id: 'combat',
    label: 'Combat & Fight',
    query: [
      /\bcombat\b/,
      /\bfight(s|ing)?(\s*(scenes?|choreography))?\b/,
      /\bsword(s|play)?(\s*fight)?\b/,
      /\bkatana\b/,
      /\bpunch(es|ing)?\b/,
      /\bkick(s|ing)?\b/,
      /\bmartial\s*arts?\b/,
      /\bduels?\b/,
      /\bmelee\b/,
      /\bbattle\b/,
    ],
    content: [
      /\bcombat\b/,
      /\bfight(s|ing|er|ers)?\b/,
      /\bsword(s|play)?\b/,
      /\bkatana\b/,
      /\bpunch(es|ing)?\b/,
      /\bkick(s|ing)?\b/,
      /\bmartial\s*arts?\b/,
      /\bduels?\b/,
      /\bmelee\b/,
      /\bbattle\b/,
    ],
    mediaType: 'video',
    tab: 'animations',
    external: { sketchfab: 'sword combat animation', sketchfabAnimated: true, artstation: ['combat animation', 'fight animation'], sakugabooru: ['fighting'], archive: true },
  },
  {
    id: 'dance',
    label: 'Dance',
    query: [/\bdanc(e|es|ing|er|ers)\b/, /\bchoreograph(y|ies)\b/],
    content: [/\bdanc(e|es|ing|er|ers)\b/, /\bchoreograph(y|ies)\b/],
    mediaType: 'video',
    tab: 'animations',
    external: { sketchfab: 'dance animation', sketchfabAnimated: true, artstation: ['dance animation'], sakugabooru: ['dancing'] },
  },
  {
    id: 'creature',
    label: 'Creatures & Animals',
    query: [/\bcreatures?\b/, /\bquadrupeds?\b/, /\banimals?\b/, /\bmonsters?\b/, /\bdragons?\b/, /\bhorses?\b/, /\bdogs?\b/, /\bcats?\b/, /\bbirds?\b/, /\bwol(f|ves)\b/, /\bbeasts?\b/],
    content: [/\bcreatures?\b/, /\bquadrupeds?\b/, /\banimals?\b/, /\bmonsters?\b/, /\bdragons?\b/, /\bhorses?\b/, /\bdogs?\b/, /\bcats?\b/, /\bbirds?\b/, /\bwol(f|ves)\b/, /\bbeasts?\b/],
    external: { sketchfab: 'creature animal', sketchfabAnimated: true, artstation: ['creature design', 'quadruped animation'], sakugabooru: ['animals'], wikimedia: true },
  },
  {
    id: 'smear',
    label: 'Smears',
    descriptionOk: true,
    query: [/\bsmears?(\s*frames?)?\b/],
    content: [/\bsmears?\b/],
    mediaType: 'video',
    tab: 'animations',
    external: { sketchfab: null, artstation: ['smear frames animation'], sakugabooru: ['smears'] },
  },
  {
    id: 'vfx',
    label: 'VFX & Effects',
    query: [/\bvfx\b/, /\bfx\b/, /\beffects?\b/, /\bimpact\s*frames?\b/, /\bexplosions?\b/, /\bfire\b/, /\bsmoke\b/, /\blightning\b/, /\bwater\b/, /\bliquid\b/, /\bdebris\b/, /\bsparks?\b/, /\bmagic\b/],
    content: [/\bvfx\b/, /\bfx\b/, /\beffects?\b/, /\bimpact\s*frames?\b/, /\bexplosions?\b/, /\bfire\b/, /\bsmoke\b/, /\blightning\b/, /\bwater\b/, /\bliquid\b/, /\bdebris\b/, /\bsparks?\b/, /\bmagic\b/],
    mediaType: 'video',
    tab: 'animations',
    external: { sketchfab: 'vfx effect', sketchfabAnimated: true, artstation: ['2d fx animation', 'vfx animation'], sakugabooru: ['effects'] },
  },
  {
    id: 'hair-cloth',
    label: 'Hair & Cloth',
    query: [/\bhair\b/, /\bcloth(ing|es)?\b/, /\bfabric\b/, /\bcapes?\b/, /\bsecondary\s*(motion|action)\b/, /\boverlap(ping)?(\s*action)?\b/],
    content: [/\bhair\b/, /\bcloth(ing|es)?\b/, /\bfabric\b/, /\bcapes?\b/, /\bsecondary\s*(motion|action)\b/, /\boverlap(ping)?\s*action\b/],
    mediaType: 'video',
    tab: 'animations',
    external: { sketchfab: null, artstation: ['hair animation', 'cloth simulation animation'], sakugabooru: ['hair'] },
  },
  {
    id: 'timing-spacing',
    label: 'Timing & Spacing',
    query: [/\btiming(\s*(and\s*)?spacing)?\b/, /\bspacing(\s*charts?)?\b/, /\bbouncing\s*balls?\b/, /\bball\s*bounces?\b/],
    content: [/\btiming\b/, /\bspacing\b/, /\bbouncing\s*balls?\b/, /\bball\s*bounces?\b/],
    mediaType: 'video',
    tab: 'animations',
    external: { sketchfab: null, artstation: ['timing and spacing animation', 'bouncing ball animation'], sakugabooru: [] },
  },
  {
    id: 'keys-breakdowns',
    label: 'Keys & Breakdowns',
    descriptionOk: true,
    query: [/\bkey\s*frames?\b/, /\bkeys?\s*(and\s*)?breakdowns?\b/, /\bbreakdowns?\b/, /\bin\s*betweens?\b/, /\binbetween(s|ing)?\b/, /\bkey\s*poses?\b/],
    content: [/\bkey\s*frames?\b/, /\bbreakdowns?\b/, /\bin\s*betweens?\b/, /\binbetween(s|ing)?\b/, /\bkey\s*poses?\b/, /\bgenga\b/],
    tab: 'animations',
    external: { sketchfab: null, artstation: ['animation keyframes', 'key poses animation'], sakugabooru: ['genga'] },
  },
  {
    id: 'pose',
    label: 'Poses & Gesture',
    query: [/\bposes?(\s*(references?|sheets?))?\b/, /\bposing\b/, /\bgestures?(\s*(drawings?|stud(y|ies)|sketch(es)?))?\b/, /\bline\s*of\s*action\b/],
    content: [/\bposes?\b/, /\bposing\b/, /\bgestures?\b/, /\bline\s*of\s*action\b/, /\bposemuse\b/],
    tab: 'character-design',
    external: { sketchfab: null, artstation: ['pose reference', 'gesture drawing'], sakugabooru: [], wikimedia: true },
  },
  {
    id: 'anatomy',
    label: 'Anatomy',
    descriptionOk: true,
    query: [/\banatom(y|ical)\b/, /\becorche\b/, /\bmuscles?\b/, /\bskeleton\b/],
    content: [/\banatom(y|ical)\b/, /\becorche\b/, /\bmuscles?\b/, /\bskeleton\b/],
    tab: 'character-design',
    external: { sketchfab: 'anatomy', sketchfabAnimated: false, artstation: ['anatomy study', 'anatomy reference'], sakugabooru: [], wikimedia: true },
  },
  {
    id: 'color-script',
    label: 'Color Scripts & Keys',
    descriptionOk: true,
    query: [/\bcolou?r\s*(scripts?|keys?|stud(y|ies))\b/, /\blighting\s*(keys?|stud(y|ies))\b/],
    content: [/\bcolou?r\s*(scripts?|keys?|stud(y|ies))\b/, /\blighting\s*(keys?|stud(y|ies))\b/],
    mediaType: 'image',
    tab: 'visdev',
    external: { sketchfab: null, artstation: ['color script', 'color keys animation'], sakugabooru: [] },
  },
  {
    id: 'background-layout',
    label: 'Backgrounds & Layout',
    query: [/\blayouts?\b/, /\bbackgrounds?(\s*(art|design|paintings?))?\b/, /\benvironments?(\s*(design|art|concepts?))?\b/, /\bbg\s*(art|design|paintings?)\b/],
    content: [/\blayouts?\b/, /\bbackgrounds?\b/, /\benvironments?\b/, /\bbg\s*(art|design|paintings?)\b/],
    mediaType: 'image',
    tab: 'visdev',
    external: { sketchfab: 'environment', sketchfabAnimated: false, artstation: ['background painting animation', 'environment design'], sakugabooru: ['background_animation'] },
  },
  {
    id: 'prop-design',
    label: 'Prop Design',
    query: [/\bprops?(\s*(design|sheets?|concepts?))?\b/, /\bweapon\s*designs?\b/, /\bvehicle\s*designs?\b/],
    content: [/\bprops?\b/, /\bweapon\s*designs?\b/, /\bvehicle\s*designs?\b/],
    tab: 'visdev',
    external: { sketchfab: 'prop', sketchfabAnimated: false, artstation: ['prop design', 'prop sheet'], sakugabooru: [] },
  },
  {
    id: 'rig',
    label: 'Rigs',
    query: [/\brig(s|ged|ging)?\b/],
    content: [/\brig(s|ged|ging)?\b/],
    tab: '3d-models',
    external: { sketchfab: 'rigged character', sketchfabAnimated: false, artstation: ['character rig'], sakugabooru: [] },
  },
  {
    id: '3d-model',
    label: '3D Models',
    query: [/\b3d(\s*models?)?\b/, /\bsketchfab\b/, /\bmesh(es)?\b/, /\bsculpt(s|ure|ures)?\b/, /\blow\s*poly\b/],
    content: [/\b3d\s*models?\b/, /\bsculpt(s|ure|ures)?\b/, /\blow\s*poly\b/],
    structural: is3DStructural,
    mediaType: 'model3d',
    tab: '3d-models',
    external: { sketchfab: 'character', sketchfabAnimated: false, artstation: ['3d character model'], sakugabooru: [] },
  },
  {
    id: 'character-design',
    label: 'Character Design',
    broad: true,
    query: [/\bcharacter\s*(designs?|concepts?|art)\b/, /\bcharacterdesign\b/],
    content: [/\bcharacter\s*(designs?|concepts?)\b/, /\bcharacterdesign(references)?\b/],
    tab: 'character-design',
    external: { sketchfab: null, artstation: ['character design'], sakugabooru: [] },
  },
  {
    id: 'visdev',
    label: 'Visual Development',
    broad: true,
    query: [/\bvis\s*dev\b/, /\bvisual\s*development\b/, /\bconcept\s*art\b/, /\bkey\s*art\b/],
    content: [/\bvis\s*dev\b/, /\bvisual\s*development\b/, /\bconcept\s*art\b/, /\bkey\s*art\b/],
    tab: 'visdev',
    external: { sketchfab: null, artstation: ['visual development', 'concept art'], sakugabooru: [] },
  },
  // --- STUDIOS & PRODUCTION HOUSES ---
  {
    id: 'studio-pixar',
    label: 'Pixar Animation',
    broad: false,
    descriptionOk: true,
    query: [/\bpixar\b/],
    content: [/\bpixar\b/],
    external: { sketchfab: null, artstation: ['pixar animation study'], sakugabooru: [] },
  },
  {
    id: 'studio-disney',
    label: 'Walt Disney Animation',
    broad: false,
    descriptionOk: true,
    query: [/\bdisney\b/, /\bwalt\s*disney\b/],
    content: [/\bdisney\b/, /\bwalt\s*disney\b/],
    external: { sketchfab: null, artstation: ['disney animation reference'], sakugabooru: [] },
  },
  {
    id: 'studio-ghibli',
    label: 'Studio Ghibli',
    broad: false,
    descriptionOk: true,
    query: [/\bghibli\b/, /\bhayao\s*miyazaki\b/, /\bmiyazaki\b/],
    content: [/\bghibli\b/, /\bhayao\s*miyazaki\b/, /\bmiyazaki\b/],
    external: { sketchfab: null, artstation: ['studio ghibli art reference'], sakugabooru: ['studio_ghibli'] },
  },
  {
    id: 'studio-dreamworks',
    label: 'DreamWorks Animation',
    broad: false,
    descriptionOk: true,
    query: [/\bdreamworks\b/],
    content: [/\bdreamworks\b/],
    external: { sketchfab: null, artstation: ['dreamworks animation'], sakugabooru: [] },
  },
  {
    id: 'studio-sony',
    label: 'Sony Pictures Animation',
    broad: false,
    descriptionOk: true,
    query: [/\bsony\s*animation\b/, /\bspiderverse\b/, /\bspider\s*verse\b/, /\binto\s*the\s*spider\s*verse\b/, /\bacross\s*the\s*spider\s*verse\b/],
    content: [/\bsony\s*animation\b/, /\bspiderverse\b/, /\bspider\s*verse\b/, /\binto\s*the\s*spider\s*verse\b/, /\bacross\s*the\s*spider\s*verse\b/],
    external: { sketchfab: 'spiderverse', sketchfabAnimated: true, artstation: ['spiderverse animation style'], sakugabooru: [] },
  },
  {
    id: 'studio-trigger',
    label: 'Studio Trigger',
    broad: false,
    descriptionOk: true,
    query: [/\btrigger\b/, /\bstudio\s*trigger\b/, /\bkill\s*la\s*kill\b/, /\bgurren\s*lagann\b/, /\bcyberpunk\s*edgerunners\b/],
    content: [/\btrigger\b/, /\bstudio\s*trigger\b/, /\bkill\s*la\s*kill\b/, /\bgurren\s*lagann\b/, /\bcyberpunk\s*edgerunners\b/],
    external: { sketchfab: null, artstation: ['studio trigger style'], sakugabooru: ['trigger', 'gainax'] },
  },
  {
    id: 'studio-mappa',
    label: 'MAPPA',
    broad: false,
    descriptionOk: true,
    query: [/\bmappa\b/, /\bjujutsu\s*kaisen\b/, /\bjjk\b/, /\bchainsaw\s*man\b/],
    content: [/\bmappa\b/, /\bjujutsu\s*kaisen\b/, /\bjjk\b/, /\bchainsaw\s*man\b/],
    external: { sketchfab: null, artstation: ['mappa animation style'], sakugabooru: ['mappa'] },
  },
  {
    id: 'studio-ufotable',
    label: 'Ufotable',
    broad: false,
    descriptionOk: true,
    query: [/\bufotable\b/, /\bdemon\s*slayer\b/, /\bkimetsu\b/, /\bfate\s*stay\s*night\b/],
    content: [/\bufotable\b/, /\bdemon\s*slayer\b/, /\bkimetsu\b/, /\bfate\s*stay\s*night\b/],
    external: { sketchfab: null, artstation: ['ufotable effects reference'], sakugabooru: ['ufotable'] },
  },
  {
    id: 'studio-fortiche',
    label: 'Fortiche / Arcane',
    broad: false,
    descriptionOk: true,
    query: [/\bfortiche\b/, /\barcane\b/, /\bleague\s*of\s*legends\b/],
    content: [/\bfortiche\b/, /\barcane\b/, /\bleague\s*of\s*legends\b/],
    external: { sketchfab: 'arcane', sketchfabAnimated: true, artstation: ['arcane style visdev'], sakugabooru: [] },
  },

  // --- POPULAR FRANCHISES & CHARACTERS (IPs) ---
  {
    id: 'ip-transformers',
    label: 'Transformers & Mecha Transformation',
    broad: false,
    descriptionOk: true,
    query: [/\btransformers?\b/, /\boptimus(\s*prime)?\b/, /\bbumblebee\b/, /\bdecepticons?\b/, /\bautobots?\b/, /\bmegatron\b/],
    content: [/\btransformers?\b/, /\boptimus(\s*prime)?\b/, /\bbumblebee\b/, /\bdecepticons?\b/, /\bautobots?\b/, /\bmegatron\b/, /\bmecha\s*transformation\b/],
    tab: '3d-models',
    external: { sketchfab: 'transformers robot', sketchfabAnimated: true, artstation: ['transformers animation reference', 'transformers mecha'], sakugabooru: ['mecha', 'transformations'] },
  },
  {
    id: 'ip-toystory',
    label: 'Toy Story & Pixar Toys',
    broad: false,
    descriptionOk: true,
    query: [/\btoy\s*story\b/, /\bwoody\b/, /\bbuzz\s*lightyear\b/, /\blightyear\b/],
    content: [/\btoy\s*story\b/, /\bwoody\b/, /\bbuzz\s*lightyear\b/, /\blightyear\b/],
    external: { sketchfab: 'toy story woody buzz', sketchfabAnimated: true, artstation: ['toy story character reference'], sakugabooru: [] },
  },
  {
    id: 'ip-spider-man',
    label: 'Spider-Man & Web-slinging',
    broad: false,
    descriptionOk: true,
    query: [/\bspider\s*man\b/, /\bspiderman\b/, /\bmiles\s*morales\b/, /\bpeter\s*parker\b/, /\bweb\s*sling(ing)?\b/],
    content: [/\bspider\s*man\b/, /\bspiderman\b/, /\bmiles\s*morales\b/, /\bpeter\s*parker\b/, /\bweb\s*sling(ing)?\b/],
    external: { sketchfab: 'spiderman animation', sketchfabAnimated: true, artstation: ['spiderman animation reference'], sakugabooru: [] },
  },
  {
    id: 'ip-dragon-ball',
    label: 'Dragon Ball & Shonen Blasts',
    broad: false,
    descriptionOk: true,
    query: [/\bdragon\s*ball\b/, /\bdbz\b/, /\bgoku\b/, /\bvegeta\b/, /\bkamehameha\b/, /\bsuper\s*saiyan\b/],
    content: [/\bdragon\s*ball\b/, /\bdbz\b/, /\bgoku\b/, /\bvegeta\b/, /\bkamehameha\b/, /\bsuper\s*saiyan\b/],
    external: { sketchfab: 'goku dbz', sketchfabAnimated: true, artstation: ['dragon ball fx animation'], sakugabooru: ['dragon_ball'] },
  },
  {
    id: 'ip-naruto',
    label: 'Naruto & Ninja Action',
    broad: false,
    descriptionOk: true,
    query: [/\bnaruto\b/, /\bsasuke\b/, /\bkakashi\b/, /\brasengan\b/, /\btaijutsu\b/],
    content: [/\bnaruto\b/, /\bsasuke\b/, /\bkakashi\b/, /\brasengan\b/, /\btaijutsu\b/],
    external: { sketchfab: 'naruto ninja', sketchfabAnimated: true, artstation: ['naruto combat animation'], sakugabooru: ['naruto'] },
  },

  // --- ANIMATION STYLES & MEDIUMS ---
  {
    id: 'style-2d',
    label: '2D Hand-Drawn Animation',
    broad: true,
    query: [/\b2d(\s*animation)?\b/, /\btrad(itional)?(\s*animation)?\b/, /\bhand\s*drawn\b/, /\bframe\s*by\s*frame\b/, /\bcel\b/],
    content: [/\b2d\b/, /\btrad(itional)?\b/, /\bhand\s*drawn\b/, /\bframe\s*by\s*frame\b/, /\bcel\b/, /\bsakuga\b/],
    tab: 'animations',
    external: { sketchfab: null, artstation: ['2d animation reference'], sakugabooru: [] },
  },
  {
    id: 'style-3d',
    label: '3D CGI & Computer Animation',
    broad: true,
    query: [/\b3d(\s*animation)?\b/, /\bcgi\b/, /\bcomputer\s*animation\b/, /\bblender\b/, /\bmaya\b/],
    content: [/\b3d\b/, /\bcgi\b/, /\bblender\b/, /\bmaya\b/, /\bmodel3d\b/],
    tab: 'animations',
    external: { sketchfab: 'animation', sketchfabAnimated: true, artstation: ['3d animation study'], sakugabooru: ['cgi'] },
  },
  {
    id: 'style-stop-motion',
    label: 'Stop Motion & Claymation',
    broad: false,
    descriptionOk: true,
    query: [/\bstop\s*motion\b/, /\bclaymation\b/, /\bpuppet\s*animation\b/, /\baardman\b/, /\blat\s*ka\b/, /\blaika\b/],
    content: [/\bstop\s*motion\b/, /\bclaymation\b/, /\bpuppet\s*animation\b/, /\baardman\b/, /\blaika\b/],
    external: { sketchfab: null, artstation: ['stop motion puppet reference'], sakugabooru: ['stop_motion'] },
  },
  {
    id: 'style-anime',
    label: 'Anime & Sakuga Animation',
    broad: true,
    query: [/\banime\b/, /\bsakuga\b/, /\bmanga\b/, /\bjapanese\s*animation\b/],
    content: [/\banime\b/, /\bsakuga\b/, /\bmanga\b/, /\bsakugabooru\b/],
    tab: 'animations',
    external: { sketchfab: 'anime character', sketchfabAnimated: true, artstation: ['anime animation study'], sakugabooru: [] },
  },

  // --- ANIMATION PRINCIPLES (The 12 Principles of Animation) ---
  {
    id: 'principle-squash-stretch',
    label: 'Squash & Stretch',
    broad: false,
    descriptionOk: true,
    query: [/\bsquash(\s*(and|&)\s*stretch)?\b/, /\bstretch\b/],
    content: [/\bsquash\s*(and|&)?\s*stretch\b/, /\bsquash\b/, /\bstretch\b/],
    external: { sketchfab: null, artstation: ['squash and stretch animation'], sakugabooru: [] },
  },
  {
    id: 'principle-anticipation',
    label: 'Anticipation',
    broad: false,
    descriptionOk: true,
    query: [/\banticipation\b/, /\bwind\s*up\b/, /\bpre\s*action\b/],
    content: [/\banticipation\b/, /\bwind\s*up\b/],
    external: { sketchfab: null, artstation: ['anticipation animation reference'], sakugabooru: [] },
  },
  {
    id: 'principle-follow-through',
    label: 'Follow Through & Overlapping Action',
    broad: false,
    descriptionOk: true,
    query: [/\bfollow\s*through\b/, /\boverlap(ping)?\b/, /\bdrag\b/, /\bsettl(e|ing)\b/],
    content: [/\bfollow\s*through\b/, /\boverlap(ping)?\s*(action|motion)?\b/, /\bdrag\b/, /\bsettling\b/],
    external: { sketchfab: null, artstation: ['follow through overlapping action'], sakugabooru: [] },
  },
  {
    id: 'principle-arcs',
    label: 'Arcs of Motion',
    broad: false,
    descriptionOk: true,
    query: [/\barcs?(\s*of\s*motion)?\b/, /\btrajector(y|ies)\b/],
    content: [/\barcs?\s*(of\s*motion)?\b/, /\btrajector(y|ies)\b/],
    external: { sketchfab: null, artstation: ['arcs animation reference'], sakugabooru: [] },
  },
  {
    id: 'principle-staging',
    label: 'Staging & Silhouette',
    broad: false,
    descriptionOk: true,
    query: [/\bstaging\b/, /\bsilhouettes?\b/],
    content: [/\bstaging\b/, /\bsilhouettes?\b/],
    external: { sketchfab: null, artstation: ['character silhouette staging'], sakugabooru: [] },
  },
];

const CONCEPT_BY_ID = new Map(REFERENCE_CONCEPTS.map((c) => [c.id, c]));

export function getConceptLabel(id: string): string {
  return CONCEPT_BY_ID.get(id)?.label || id;
}

/** Words that never narrow a search on an animation reference site. */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'for', 'and', 'or', 'in', 'on', 'with', 'to', 'by', 'from', 'my', 'some', 'good', 'best', 'cool',
  'reference', 'references', 'ref', 'refs', 'example', 'examples', 'inspiration', 'inspo', 'idea', 'ideas',
  'video', 'videos', 'clip', 'clips', 'image', 'images', 'picture', 'pictures', 'pic', 'pics',
  'animation', 'animations', 'animated', 'anim', 'animator', 'animators', 'art', 'artwork', 'drawing', 'drawings',
  'cycle', 'cycles', 'sheet', 'sheets', 'study', 'studies', 'character', 'characters', 'design', 'designs',
]);

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[_\-/.,:;!?#()[\]{}"'`|+*]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Light English stemmer — enough to match walk/walks/walking, story/stories. */
function stem(word: string): string {
  let w = word;
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 4 && /(sses|xes|ches|shes)$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  if (w.length > 4 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

function wordSet(text: string): Set<string> {
  const set = new Set<string>();
  for (const w of text.split(' ')) {
    if (!w) continue;
    set.add(w);
    set.add(stem(w));
  }
  return set;
}

// ---------------------------------------------------------------------------
// Reference profiling / classification (the "tagging" side)
// ---------------------------------------------------------------------------

type EvidenceLocation = 'title' | 'tags' | 'structural' | 'description';

interface ReferenceProfile {
  title: string;
  tags: string;
  description: string;
  titleWords: Set<string>;
  tagWords: Set<string>;
  descWords: Set<string>;
  concepts: Map<string, EvidenceLocation>;
}

const profileCache = new WeakMap<object, ReferenceProfile>();

function profileReference(video: Video): ReferenceProfile {
  const cached = profileCache.get(video as object);
  if (cached) return cached;

  const title = normalizeText(video.title || '');
  const tags = normalizeText([...(video.tags || []), ...(video.categories || []), ...(video.categoryIds || [])].join(' | '));
  const description = normalizeText(video.description || '');

  const concepts = new Map<string, EvidenceLocation>();
  for (const concept of REFERENCE_CONCEPTS) {
    let location: EvidenceLocation | null = null;
    if (concept.content.some((re) => re.test(title))) location = 'title';
    else if (concept.content.some((re) => re.test(tags))) location = 'tags';
    else if (concept.structural?.(video)) location = 'structural';
    else if (concept.descriptionOk && concept.content.some((re) => re.test(description))) location = 'description';
    if (location) concepts.set(concept.id, location);
  }

  const profile: ReferenceProfile = {
    title,
    tags,
    description,
    titleWords: wordSet(title),
    tagWords: wordSet(tags),
    descWords: wordSet(description),
    concepts,
  };
  profileCache.set(video as object, profile);
  return profile;
}

/**
 * Concept ids a reference genuinely belongs to, derived from its own metadata.
 * Use these as clean, consistent tags (e.g. when importing external results).
 */
export function classifyReference(video: Video): string[] {
  return Array.from(profileReference(video).concepts.keys());
}

/** Classify arbitrary text (title + tags + description) into concept ids. */
export function classifyText(text: string): string[] {
  const normalized = normalizeText(text);
  return REFERENCE_CONCEPTS.filter((c) => c.content.some((re) => re.test(normalized))).map((c) => c.id);
}

/**
 * Generates an extensive list of rich, human-friendly tags for any media item
 * by scanning its title, tags, description, author, and source against our
 * animation taxonomy (mechanics, studios, franchises, styles, principles).
 */
export function generateRichTags(item: {
  title?: string;
  tags?: string[];
  description?: string;
  authorName?: string;
  author_name?: string;
  source?: string;
  categories?: string[];
}): string[] {
  const title = item.title || '';
  const ownTags = item.tags || [];
  const desc = item.description || '';
  const author = item.authorName || item.author_name || '';
  const source = item.source || '';
  const cats = item.categories || [];

  const combinedText = `${title} | ${ownTags.join(' ')} | ${desc} | ${author} | ${source} | ${cats.join(' ')}`;
  const matchedConcepts = classifyText(combinedText);

  const richTags = new Set<string>();

  // Add recognized concept labels and slugs
  for (const cid of matchedConcepts) {
    const concept = CONCEPT_BY_ID.get(cid);
    if (concept) {
      richTags.add(concept.id);
      // Add cleaned short label
      const cleanLabel = concept.label.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      richTags.add(cleanLabel);
    }
  }

  // Preserve existing clean tags
  for (const t of ownTags) {
    const clean = t.toLowerCase().trim();
    if (clean && clean.length > 1 && !STOPWORDS.has(clean)) {
      richTags.add(clean);
    }
  }

  return Array.from(richTags);
}

// ---------------------------------------------------------------------------
// Query parsing
// ---------------------------------------------------------------------------

export function parseSearchIntent(query: string): SearchIntent {
  const rawQuery = (query || '').trim();
  const normalizedQuery = normalizeText(rawQuery);

  // Consume concept phrases from the query, most specific first.
  let residual = ` ${normalizedQuery} `;
  const matched: ConceptDef[] = [];
  for (const concept of REFERENCE_CONCEPTS) {
    let hit = false;
    for (const re of concept.query) {
      const global = new RegExp(re.source, 'g');
      if (global.test(residual)) {
        hit = true;
        residual = residual.replace(new RegExp(re.source, 'g'), ' ');
      }
    }
    if (hit) matched.push(concept);
  }

  const residualWords = residual.split(' ').filter(Boolean);
  let tokens = residualWords.filter((w) => !STOPWORDS.has(w) && w.length > 1).map(stem);

  // A query made only of generic words ("animation") still has to match something.
  if (matched.length === 0 && tokens.length === 0) {
    tokens = normalizedQuery.split(' ').filter((w) => w.length > 1).map(stem);
  }

  const specific = matched.filter((c) => !c.broad);
  const primary = specific[0] || matched[0];

  const artstation = Array.from(
    new Set([
      // The raw query first keeps extra words ("female", "robot") in play.
      ...(normalizedQuery ? [normalizedQuery] : []),
      ...(primary?.external.artstation.slice(0, 2) || [`${normalizedQuery} reference`]),
    ])
  ).filter(Boolean);

  const externalQueries: SearchIntent['externalQueries'] = {
    sketchfab: primary
      ? primary.external.sketchfab === null
        ? null
        : tokens.length
          ? `${tokens.join(' ')} ${primary.external.sketchfab}`
          : primary.external.sketchfab
      : normalizedQuery || null,
    sketchfabAnimated: primary ? primary.external.sketchfabAnimated : undefined,
    sketchfabCategory: primary?.external.sketchfabCategory,
    artstation,
    pinterest: [normalizedQuery],
    sakugabooru: primary ? primary.external.sakugabooru : normalizedQuery ? [normalizedQuery.replace(/\s+/g, '_')] : [],
    wikimedia: primary ? Boolean(primary.external.wikimedia) : true,
    archive: primary ? Boolean(primary.external.archive) : true,
  };

  return {
    rawQuery,
    normalizedQuery,
    tokens,
    concepts: matched.map((c) => c.id),
    synonyms: matched.map((c) => c.label.toLowerCase()),
    boostMediaType: primary?.mediaType,
    boostTab: primary?.tab,
    externalQueries,
  };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const CONCEPT_EVIDENCE_SCORE: Record<EvidenceLocation, number> = {
  title: 100,
  tags: 80,
  structural: 70,
  description: 35,
};

/**
 * Relevance of a reference to a parsed query. 0 means "not a match — exclude".
 */
export function scoreVideoRelevance(video: Video, intent: SearchIntent): number {
  if (!intent.normalizedQuery) return 100;

  const profile = profileReference(video);
  const concepts = intent.concepts.map((id) => CONCEPT_BY_ID.get(id)).filter(Boolean) as ConceptDef[];
  const specific = concepts.filter((c) => !c.broad);
  const gating = specific.length > 0 ? specific : concepts;
  const boosting = specific.length > 0 ? concepts.filter((c) => c.broad) : [];

  let score = 0;

  // 1. Hard concept gates.
  for (const concept of gating) {
    const location = profile.concepts.get(concept.id);
    if (!location) return 0;
    score += CONCEPT_EVIDENCE_SCORE[location];
  }

  // 2. Broad concepts only boost when a specific one is present.
  for (const concept of boosting) {
    const location = profile.concepts.get(concept.id);
    if (location) score += CONCEPT_EVIDENCE_SCORE[location] / 3;
  }

  // 3. Free-text words: required when no concept was recognised, boosts otherwise.
  if (intent.tokens.length > 0) {
    let matchedCount = 0;
    for (const token of intent.tokens) {
      if (profile.titleWords.has(token)) {
        score += 30;
        matchedCount++;
      } else if (profile.tagWords.has(token)) {
        score += 22;
        matchedCount++;
      } else if (profile.descWords.has(token)) {
        score += 8;
        matchedCount++;
      }
    }
    if (concepts.length === 0 && matchedCount < intent.tokens.length) return 0;
    if (matchedCount === intent.tokens.length) score += 25;
  }

  // 4. Exact phrase bonuses.
  const q = intent.normalizedQuery;
  if (profile.title === q) score += 80;
  else if (q.length > 2 && ` ${profile.title} `.includes(` ${q} `)) score += 40;
  if (q.length > 2 && ` ${profile.tags} `.includes(` ${q} `)) score += 25;

  // 5. Prefer references whose primary evidence is strong over incidental mentions.
  if (gating.length > 0 && gating.every((c) => profile.concepts.get(c.id) === 'title')) score += 20;

  return Math.max(score, 1);
}
