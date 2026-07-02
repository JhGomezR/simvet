import {genkit} from 'genkit';
import {disableGenkitOTelInitialization} from 'genkit/tracing';
import {googleAI} from '@genkit-ai/google-genai';

disableGenkitOTelInitialization();

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});
