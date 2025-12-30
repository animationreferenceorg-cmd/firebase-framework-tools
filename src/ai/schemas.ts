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

// Schemas for video-categorization.ts
export const CategorizeVideoInputSchema = z.object({
  title: z.string().describe('The title of the video'),
  description: z.string().optional().describe('The description of the video'),
  thumbnailUrl: z.string().url().optional().describe('The URL of the video thumbnail image'),
  existingCategories: z.array(z.string()).describe('List of existing category names'),
});
export type CategorizeVideoInput = z.infer<typeof CategorizeVideoInputSchema>;

export const CategorizeVideoOutputSchema = z.object({
  suggestedCategory: z.string().describe('The best matching category name from the existing list, or a new category name if none fit.'),
  isNewCategory: z.boolean().describe('True if the suggested category is not in the existing list.'),
  confidence: z.number().describe('Confidence score between 0 and 1.'),
  reasoning: z.string().describe('Short explanation for the categorization.'),
  suggestedTags: z.array(z.string()).describe('List of 3-5 suggested tags for this video.'),
  generatedDescription: z.string().describe('A compelling, SEO-friendly description of the video content. Describe what the characters are doing and the animation style.'),
  identifiedSource: z.string().optional().describe('The movie, show, or studio this animation is likely from, if identifiable.'),
});
export type CategorizeVideoOutput = z.infer<typeof CategorizeVideoOutputSchema>;
