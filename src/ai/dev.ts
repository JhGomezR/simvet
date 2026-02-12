import { config } from 'dotenv';
config();

import '@/ai/flows/generate-personalized-case-feedback.ts';
import '@/ai/flows/generate-dynamic-owner-responses.ts';
import '@/ai/flows/analyze-cohort-errors.ts';
import '@/ai/flows/analyze-triage-performance.ts';