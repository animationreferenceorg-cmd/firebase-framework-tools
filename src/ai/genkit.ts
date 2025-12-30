import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Debugging API Key visibility
console.log('Genkit Init - Env Vars Check:');
console.log('GOOGLE_GENAI_API_KEY:', process.env.GOOGLE_GENAI_API_KEY ? 'Set' : 'Missing');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set' : 'Missing');
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'Set' : 'Missing');

export const ai = genkit({
  plugins: [googleAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  })],
  model: 'googleai/gemini-2.0-flash',
});
