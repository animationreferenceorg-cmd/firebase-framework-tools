import { inferAnimationCategoryAndTags } from '@/lib/reference-discovery';

export const ALLOWED_CATEGORIES = [
  'Acting',
  'Body Mechanics',
  'Combat',
  'Creature',
  'Locomotion',
  'Lip Sync',
  'FX / VFX',
] as const;

export type AnimationCategory = (typeof ALLOWED_CATEGORIES)[number];

export interface GemmaTaxonomyResult {
  category: AnimationCategory;
  subCategory: string;
  tags: string[];
  subject: string;
  cameraAngle: string;
  energy: string;
  aiSummary: string;
  provider: 'openrouter-gemma4-free' | 'google-gemma4-free' | 'heuristic';
  model: string;
}

// Strictly FREE OpenRouter Gemma 4 multimodal models — never call paid models
const OPENROUTER_FREE_GEMMA_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
] as const;

const SYSTEM_PROMPT = `You are an expert senior character animator cataloging animation reference clips for AnimationReference.org.
Analyze the provided reference image (if present) and metadata, then return ONLY valid JSON with no markdown fences:
{
  "category": one of ["Acting", "Body Mechanics", "Combat", "Creature", "Locomotion", "Lip Sync", "FX / VFX"],
  "subCategory": short 2-3 word animation sub-category (e.g. "Walk Cycle", "Sword Fight", "Heavy Lift", "Quadruped Run", "Facial Acting"),
  "tags": array of 6 to 12 lowercase hyphenated search tags useful to animators (action, pose, weight, body mechanics, subject, style),
  "subject": one of ["biped", "quadruped", "creature", "animal", "fx", "props", "crowd"],
  "cameraAngle": one of ["wide", "medium", "close-up", "tracking", "low-angle", "high-angle", "static"],
  "energy": one of ["subtle", "medium", "high-action"],
  "aiSummary": concise 1-sentence description of the motion/pose for animation study
}`;

function normalizeCategory(raw: unknown, fallback: string): AnimationCategory {
  const s = String(raw || '').trim().toLowerCase();
  for (const cat of ALLOWED_CATEGORIES) {
    if (cat.toLowerCase() === s) return cat;
  }
  if (s.includes('combat') || s.includes('fight') || s.includes('action')) return 'Combat';
  if (s.includes('locomotion') || s.includes('walk') || s.includes('run') || s.includes('parkour')) return 'Locomotion';
  if (s.includes('creature') || s.includes('animal') || s.includes('quadruped')) return 'Creature';
  if (s.includes('mechanic') || s.includes('weight') || s.includes('acrobat') || s.includes('dance')) return 'Body Mechanics';
  if (s.includes('lip') || s.includes('dialogue') || s.includes('speech')) return 'Lip Sync';
  if (s.includes('fx') || s.includes('vfx') || s.includes('cloth') || s.includes('water') || s.includes('fire')) return 'FX / VFX';
  for (const cat of ALLOWED_CATEGORIES) {
    if (cat.toLowerCase() === fallback.toLowerCase()) return cat;
  }
  return 'Acting';
}

function cleanTag(raw: unknown): string {
  return String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/^#/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseJsonFromText(rawText: string): Record<string, any> | null {
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function callOpenRouterGemma4Free(
  promptText: string,
  imageDataUrl: string | null,
  timeoutMs: number
): Promise<{ parsed: Record<string, any>; model: string } | null> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;

  for (const model of OPENROUTER_FREE_GEMMA_MODELS) {
    try {
      const userContent: any[] = [{ type: 'text', text: promptText }];
      if (imageDataUrl) {
        userContent.push({ type: 'image_url', image_url: { url: imageDataUrl } });
      }

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://animationreference.org',
          'X-Title': 'AnimationReference.org Auto-Taxonomy',
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 420,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent },
          ],
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const text = String(data?.choices?.[0]?.message?.content || '');
      const parsed = parseJsonFromText(text);
      if (parsed) return { parsed, model };
    } catch {
      continue;
    }
  }
  return null;
}

async function callGoogleGemma4Free(
  promptText: string,
  imageBase64: { mimeType: string; data: string } | null,
  timeoutMs: number
): Promise<{ parsed: Record<string, any>; model: string } | null> {
  const apiKey = (process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;

  const model = 'gemma-4-31b-it';
  try {
    const parts: any[] = [{ text: `${SYSTEM_PROMPT}\n\n${promptText}` }];
    if (imageBase64) {
      parts.push({ inline_data: { mime_type: imageBase64.mimeType, data: imageBase64.data } });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 420 },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const text = String(data?.candidates?.[0]?.content?.parts?.[0]?.text || '');
    const parsed = parseJsonFromText(text);
    if (parsed) return { parsed, model };
  } catch {
    return null;
  }
  return null;
}

/**
 * Analyze a reference clip (image buffer or thumbnail URL + metadata) using free
 * Gemma 4 multimodal models (OpenRouter `:free` or Google AI Studio free tier),
 * falling back cleanly to the deterministic animation taxonomy classifier.
 */
export async function categorizeReferenceWithGemma4(input: {
  title?: string | null;
  description?: string | null;
  boardName?: string | null;
  suppliedCategory?: string | null;
  suppliedTags?: string[] | null;
  thumbnailUrl?: string | null;
  imageBuffer?: Buffer | null;
  imageMimeType?: string | null;
  timeoutMs?: number;
}): Promise<GemmaTaxonomyResult> {
  const timeoutMs = input.timeoutMs ?? 9000;
  const heuristic = inferAnimationCategoryAndTags({
    title: input.title,
    description: `${input.description || ''} ${input.boardName || ''}`.trim(),
    tags: input.suppliedTags,
    suppliedCategory: input.suppliedCategory,
  });

  // Prepare optional image payload for Gemma 4 vision analysis
  let imageDataUrl: string | null = null;
  let imageBase64: { mimeType: string; data: string } | null = null;
  if (input.imageBuffer && input.imageBuffer.length > 0 && input.imageBuffer.length <= 4 * 1024 * 1024) {
    const mime = input.imageMimeType || 'image/jpeg';
    const b64 = input.imageBuffer.toString('base64');
    imageDataUrl = `data:${mime};base64,${b64}`;
    imageBase64 = { mimeType: mime, data: b64 };
  } else if (input.thumbnailUrl && input.thumbnailUrl.startsWith('https://')) {
    imageDataUrl = input.thumbnailUrl;
    try {
      const thumbRes = await fetch(input.thumbnailUrl, { signal: AbortSignal.timeout(4000) });
      if (thumbRes.ok) {
        const mime = thumbRes.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
        const buf = Buffer.from(await thumbRes.arrayBuffer());
        if (buf.length > 0 && buf.length <= 4 * 1024 * 1024) {
          imageBase64 = { mimeType: mime, data: buf.toString('base64') };
        }
      }
    } catch {
      // Proceed with URL / metadata only
    }
  }

  const promptText = [
    `Title: ${input.title || 'Untitled'}`,
    input.boardName ? `Moodboard Name: ${input.boardName}` : '',
    input.description ? `Description: ${input.description}` : '',
    input.suppliedTags?.length ? `User Tags: ${input.suppliedTags.join(', ')}` : '',
    input.suppliedCategory ? `User Selected Category: ${input.suppliedCategory}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  let aiResp: { parsed: Record<string, any>; model: string; provider: 'openrouter-gemma4-free' | 'google-gemma4-free' } | null = null;

  const orRes = await callOpenRouterGemma4Free(promptText, imageDataUrl, timeoutMs);
  if (orRes) {
    aiResp = { ...orRes, provider: 'openrouter-gemma4-free' };
  } else {
    const gRes = await callGoogleGemma4Free(promptText, imageBase64, timeoutMs);
    if (gRes) {
      aiResp = { ...gRes, provider: 'google-gemma4-free' };
    }
  }

  if (!aiResp) {
    return {
      category: normalizeCategory(heuristic.category, 'Acting'),
      subCategory: '',
      tags: Array.from(new Set([...(input.suppliedTags || []).map(cleanTag), ...heuristic.inferredTags])).filter(Boolean).slice(0, 24),
      subject: 'biped',
      cameraAngle: 'medium',
      energy: 'medium',
      aiSummary: '',
      provider: 'heuristic',
      model: 'local-taxonomy',
    };
  }

  const p = aiResp.parsed;
  const aiTags = Array.isArray(p.tags) ? p.tags.map(cleanTag).filter(Boolean) : [];
  const mergedTags = Array.from(
    new Set([
      ...(input.suppliedTags || []).map(cleanTag),
      ...aiTags,
      ...heuristic.inferredTags,
      cleanTag(p.subCategory),
      cleanTag(p.subject),
      cleanTag(p.cameraAngle),
    ])
  )
    .filter(Boolean)
    .slice(0, 28);

  return {
    category: normalizeCategory(p.category, heuristic.category),
    subCategory: String(p.subCategory || '').trim().slice(0, 60),
    tags: mergedTags,
    subject: String(p.subject || 'biped').trim().toLowerCase().slice(0, 32),
    cameraAngle: String(p.cameraAngle || 'medium').trim().toLowerCase().slice(0, 32),
    energy: String(p.energy || 'medium').trim().toLowerCase().slice(0, 32),
    aiSummary: String(p.aiSummary || '').trim().slice(0, 240),
    provider: aiResp.provider,
    model: aiResp.model,
  };
}
