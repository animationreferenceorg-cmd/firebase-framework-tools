'use server';

/**
 * @fileOverview A video recommendation AI agent.
 *
 * - videoRecommendations - A function that handles the video recommendation process.
 */

import {ai} from '@/ai/genkit';
import type { VideoRecommendationsInput, VideoRecommendationsOutput } from '@/ai/schemas';
import { VideoRecommendationsInputSchema, VideoRecommendationsOutputSchema } from '@/ai/schemas';

export async function videoRecommendations(input: VideoRecommendationsInput): Promise<VideoRecommendationsOutput> {
  return videoRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'videoRecommendationsPrompt',
  input: {schema: VideoRecommendationsInputSchema},
  output: {schema: VideoRecommendationsOutputSchema},
  prompt: `You are a video recommendation expert. Given a user's viewing history and genre preferences, you will recommend a list of videos that the user might like.

  The user's viewing history is:
  {{#each viewingHistory}}
  - {{this}}
  {{/each}}

  {{#if genrePreferences}}
  The user's genre preferences are:
  {{#each genrePreferences}}
  - {{this}}
  {{/each}}
  {{/if}}

  Recommend {{numberOfRecommendations}} videos.  Return only the video titles.`,
});

const videoRecommendationsFlow = ai.defineFlow(
  {
    name: 'videoRecommendationsFlow',
    inputSchema: VideoRecommendationsInputSchema,
    outputSchema: VideoRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
