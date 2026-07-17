'use server';

/**
 * @fileOverview A video categorization and auto-tagging AI agent.
 *
 * - categorizeVideo - A function that handles the video categorization process.
 */

import { ai } from '@/ai/genkit';
import type { CategorizeVideoInput, CategorizeVideoOutput } from '@/ai/schemas';
import { CategorizeVideoInputSchema, CategorizeVideoOutputSchema } from '@/ai/schemas';

export async function categorizeVideo(input: CategorizeVideoInput): Promise<CategorizeVideoOutput> {
  return videoCategorizationFlow(input);
}

const categorizationPrompt = ai.definePrompt({
  name: 'videoCategorizationPrompt',
  input: { schema: CategorizeVideoInputSchema },
  output: { schema: CategorizeVideoOutputSchema },
  prompt: `You are an expert animation archivist and categorizer for an animation reference library.
  Your task is to analyze the video titled "{{title}}" and describe/categorize it.

  Original Description:
  "{{description}}"

  Thumbnail URL:
  "{{thumbnailUrl}}"

  Existing Categories:
  {{#each existingCategories}}
  - {{this}}
  {{/each}}

  Based on the video title, description, and thumbnail, please:
  1. Determine the best matching category from the existing list, or suggest a new category name if none fit (e.g. 2D Animation, 3D Animation, Stop Motion, FX Animation, Character Acting, Combat, Lip Sync, Creature, etc.).
  2. Generate a compelling, SEO-friendly description of the video content. Describe the character movement, timing, spacing, and key performance details that would be helpful for an animator studying this as reference.
  3. Identify the movie, TV show, short film, animator, or studio this animation is from, if possible.
  4. Suggest 3-5 relevant tags (e.g., body mechanics, squash and stretch, spacing, weight, etc.).
  5. Provide a confidence score and short reasoning.`,
});

const videoCategorizationFlow = ai.defineFlow(
  {
    name: 'videoCategorizationFlow',
    inputSchema: CategorizeVideoInputSchema,
    outputSchema: CategorizeVideoOutputSchema,
  },
  async input => {
    const { output } = await categorizationPrompt(input);
    if (!output) {
      throw new Error('Video categorization failed.');
    }
    return output;
  }
);
