import { z } from 'zod';

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
});

const generationEnvSchema = z.object({
  OPENAI_API_KEY: z.string().trim().min(1, 'OPENAI_API_KEY is required'),
  E2B_API_KEY: z.string().trim().min(1, 'E2B_API_KEY is required'),
  INNGEST_EVENT_KEY: z.string().trim().optional(),
  INNGEST_SIGNING_KEY: z.string().trim().optional(),
  OPENAI_CODE_MODEL: z.string().trim().min(1).default('gpt-6.1-sol'),
  OPENAI_SUMMARY_MODEL: z.string().trim().min(1).default('gpt-6-luna'),
});

export function getServerEnv() {
  const result = serverEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
  });

  if (!result.success) {
    throw new Error(
      `Invalid server environment: ${result.error.issues
        .map((issue) => issue.message)
        .join(', ')}`
    );
  }

  return result.data;
}

export function getGenerationEnv() {
  const result = generationEnvSchema.safeParse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    E2B_API_KEY: process.env.E2B_API_KEY,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
    OPENAI_CODE_MODEL: process.env.OPENAI_CODE_MODEL,
    OPENAI_SUMMARY_MODEL: process.env.OPENAI_SUMMARY_MODEL,
  });

  if (!result.success) {
    throw new Error(
      `Missing generation configuration: ${result.error.issues
        .map((issue) => issue.message)
        .join(', ')}`
    );
  }

  const missingProductionKeys =
    process.env.NODE_ENV === 'production'
      ? [
          ['INNGEST_EVENT_KEY', result.success && result.data.INNGEST_EVENT_KEY],
          [
            'INNGEST_SIGNING_KEY',
            result.success && result.data.INNGEST_SIGNING_KEY,
          ],
        ]
          .filter(([, value]) => !value)
          .map(([key]) => key)
      : [];

  if (missingProductionKeys.length > 0) {
    throw new Error(
      `Missing generation configuration: ${missingProductionKeys.join(', ')}`
    );
  }

  return result.data;
}
