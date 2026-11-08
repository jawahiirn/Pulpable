import { z } from 'zod';

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
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
