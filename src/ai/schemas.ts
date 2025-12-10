/**
 * @fileOverview This file contains the Zod schemas and TypeScript types for the AI flows.
 */

import { z } from 'genkit';

// Schemas for video-recommendations.ts
export const VideoRecommendationsInputSchema = z.object({
  viewingHistory: z
    .array(z.string())
    .describe('The list of video titles that the user has watched recently.'),
  genrePreferences: z
    .array(z.string())
    .optional()
    .describe('The list of genres that the user prefers.'),
  numberOfRecommendations: z
    .number()
    .default(5)
    .describe('The number of video recommendations to return.'),
});
export type VideoRecommendationsInput = z.infer<typeof VideoRecommendationsInputSchema>;

export const VideoRecommendationsOutputSchema = z.object({
  recommendations: z
    .array(z.string())
    .describe('The list of recommended video titles.'),
});
export type VideoRecommendationsOutput = z.infer<typeof VideoRecommendationsOutputSchema>;

// Schemas for thumbnail-generator.ts
export const ThumbnailGeneratorInputSchema = z.object({
  title: z.string().describe('The title of the video.'),
});
export type ThumbnailGeneratorInput = z.infer<typeof ThumbnailGeneratorInputSchema>;

export const ThumbnailGeneratorOutputSchema = z.object({
  imageUrl: z.string().url().describe('The URL of the generated thumbnail image.'),
});
export type ThumbnailGeneratorOutput = z.infer<typeof ThumbnailGeneratorOutputSchema>;
