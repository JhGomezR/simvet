import { config } from 'dotenv';
config();

import '@/ai/flows/generate-personalized-case-feedback.ts';
import '@/ai/flows/generate-dynamic-owner-responses.ts';
import '@/ai/flows/analyze-cohort-errors.ts';
import '@/ai/flows/analyze-triage-performance.ts';
// SimVet Clinical
import '@/ai/flows/extract-clinical-data.ts';
import '@/ai/flows/summarize-clinical-history.ts';
import '@/ai/flows/generate-simulation-from-history.ts';