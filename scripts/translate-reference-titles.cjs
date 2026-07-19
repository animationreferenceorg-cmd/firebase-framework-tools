// Translates Korean clip names + tags from src/app/references/data.ts to English
// using the Gemini API. Resumable: progress saved to scratch/reference-translations.json
// after every batch. Run with: node scripts/translate-reference-titles.cjs
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

// Auth via the Firebase service account (the GOOGLE_GENAI_API_KEY in .env.local is no longer valid)
const { GoogleAuth } = require('google-auth-library');
const auth = new GoogleAuth({
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/generative-language'],
});
let authClient;
async function getAuthHeaders() {
  if (!authClient) authClient = await auth.getClient();
  const { token } = await authClient.getAccessToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'x-goog-user-project': process.env.FIREBASE_PROJECT_ID,
  };
}

const MODEL = 'gemini-flash-latest';
const OUT_FILE = path.join(__dirname, '..', 'scratch', 'reference-translations.json');
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-퟿]/;

function loadClips() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'references', 'data.ts'), 'utf8');
  return eval(src.slice(src.indexOf('[', src.indexOf('export const CLIPS'))).replace(/;\s*$/, ''));
}

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); } catch { return { names: {}, tags: {} }; }
}
function saveProgress(p) {
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(p, null, 1));
}

const GLOSSARY = `Games/IP (use official English titles): 아케인=Arcane, 검은사막=Black Desert, 원신=Genshin Impact, 33원정대=Clair Obscur Expedition 33, 젠레스존제로=Zenless Zone Zero, 젤다의전설=The Legend of Zelda, 호라이즌=Horizon, 스트레인지매직=Strange Magic, 파이어엠블렘=Fire Emblem, 인게이지=Engage, 블레이드앤소울=Blade & Soul, 블소=Blade & Soul, 애스트럴체인=Astral Chain, 스타레일=Honkai Star Rail, 데스티니=Destiny, 세븐나이츠=Seven Knights, 나라카=Naraka, 명조=Wuthering Waves, 비스타즈=Beastars, 나루토=Naruto, 소울=Souls, 무쌍=Musou.
Animation terms: 연출=Cinematic, 리턴=Weapon Return, 한손=One-Handed, 양손=Two-Handed, 쌍수=Dual Wield, 교전=Combat, 전투=Battle, 시전=Cast, 피격=Hit Reaction, 내려찍기=Slam Attack, 내려치기=Downward Strike, 올려치기=Upward Strike, 회전베기=Spin Slash, 2타=Hit 2, 3타=Hit 3, 무빙홀드=Moving Hold, 일대일=1v1, 일대다=1vN, 막기=Block, 베기=Slash, 찌르기=Thrust, 휘두르기=Swing, 격투가=Brawler, 궁수=Archer, 소서러=Sorcerer, 둔기=Blunt Weapon, 봉=Staff Pole, 필살기=Ultimate Skill, 덤블링=Tumbling, 착지=Landing, 대기=Idle, 등장=Entrance, 버프=Buff, 레이아웃=Layout, 소셜=Social, 제스처=Gesture.`;

async function translateBatch(items, kind, attempt = 0) {
  const style = kind === 'names'
    ? 'Each item is a keyword-style animation clip title. Translate to a concise natural English title in Title Case, keeping word order, numbers, parentheses and Latin words (bip, max, 2d) as-is. Do not add words that are not implied.'
    : 'Each item is a short tag. Translate to a short lowercase English tag (1-3 words). Keep numbers and Latin words as-is.';
  const prompt = `Translate these ${items.length} Korean video-game animation reference ${kind === 'names' ? 'clip titles' : 'tags'} to English.
${style}
${GLOSSARY}
Return ONLY a JSON array of exactly ${items.length} strings, the translations in the same order.

${JSON.stringify(items)}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 16384, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });

  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 6) throw new Error(`Gemini error ${res.status} after ${attempt} retries`);
    const wait = Math.min(60000, 3000 * 2 ** attempt);
    console.log(`  HTTP ${res.status}, backing off ${wait / 1000}s...`);
    await new Promise(r => setTimeout(r, wait));
    return translateBatch(items, kind, attempt + 1);
  }
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  let arr;
  try { arr = JSON.parse(text); } catch { arr = null; }
  if (!Array.isArray(arr) || arr.length !== items.length || !arr.every(s => typeof s === 'string')) {
    if (attempt >= 3) throw new Error(`Bad response shape for batch (got ${Array.isArray(arr) ? arr.length : typeof arr})`);
    console.log('  Bad response shape, retrying batch...');
    await new Promise(r => setTimeout(r, 2000));
    return translateBatch(items, kind, attempt + 1);
  }
  return arr.map(s => s.trim());
}

async function run(kind, allItems, progress, batchSize) {
  const todo = allItems.filter(x => !progress[kind][x]);
  console.log(`${kind}: ${allItems.length} unique, ${todo.length} left to translate`);
  for (let i = 0; i < todo.length; i += batchSize) {
    const batch = todo.slice(i, i + batchSize);
    const out = await translateBatch(batch, kind);
    batch.forEach((ko, j) => { progress[kind][ko] = out[j]; });
    saveProgress(progress);
    console.log(`${kind}: ${Math.min(i + batchSize, todo.length)}/${todo.length} done`);
  }
}

(async () => {
  const clips = loadClips();
  const names = [...new Set(clips.map(c => c.name).filter(n => HANGUL.test(n)))];
  const tags = [...new Set(clips.flatMap(c => c.tags).filter(t => HANGUL.test(t)))];
  const progress = loadProgress();

  await run('names', names, progress, 80);
  await run('tags', tags, progress, 150);

  // Second pass: anything that still contains Hangul gets retried once, individually batched
  for (const kind of ['names', 'tags']) {
    const leftovers = Object.keys(progress[kind]).filter(k => HANGUL.test(progress[kind][k]));
    if (leftovers.length) {
      console.log(`${kind}: retrying ${leftovers.length} entries still containing Korean`);
      for (let i = 0; i < leftovers.length; i += 40) {
        const batch = leftovers.slice(i, i + 40);
        try {
          const out = await translateBatch(batch, kind);
          batch.forEach((ko, j) => { if (!HANGUL.test(out[j])) progress[kind][ko] = out[j]; });
          saveProgress(progress);
        } catch (e) { console.log('  retry pass failed:', e.message); }
      }
    }
  }

  const nDone = Object.keys(progress.names).length, tDone = Object.keys(progress.tags).length;
  const nBad = Object.values(progress.names).filter(v => HANGUL.test(v)).length;
  const tBad = Object.values(progress.tags).filter(v => HANGUL.test(v)).length;
  console.log(`DONE. names: ${nDone}/${names.length} (${nBad} still contain Korean), tags: ${tDone}/${tags.length} (${tBad} still contain Korean)`);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
