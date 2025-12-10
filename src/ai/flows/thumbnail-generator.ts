'use server';

/**
 * @fileOverview A thumbnail generation AI agent.
 *
 * - generateThumbnail - A function that handles the thumbnail generation process.
 */

import {ai} from '@/ai/genkit';
import type { ThumbnailGeneratorInput, ThumbnailGeneratorOutput } from '@/ai/schemas';
import { ThumbnailGeneratorInputSchema, ThumbnailGeneratorOutputSchema } from '@/ai/schemas';

export async function generateThumbnail(input: ThumbnailGeneratorInput): Promise<ThumbnailGeneratorOutput> {
  return thumbnailGeneratorFlow(input);
}

const prompt = `Generate a thumbnail image for a video with the following title: {{{title}}}. The thumbnail should be visually appealing and relevant to the video title.`;

const thumbnailGeneratorFlow = ai.defineFlow(
  {
    name: 'thumbnailGeneratorFlow',
    inputSchema: ThumbnailGeneratorInputSchema,
    outputSchema: ThumbnailGeneratorOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: prompt.replace('{{{title}}}', input.title),
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });
    
    if (!media || !media.url) {
      throw new Error('Image generation failed.');
    }

    return {imageUrl: media.url};
  }
);
