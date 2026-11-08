import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getGenerationEnv, getServerEnv } from '@/lib/env';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const checks = {
    database: false,
    generation: false,
  };

  try {
    getServerEnv();
    checks.database = true;
  } catch {
    // Keep the response free of secret values and provider internals.
  }

  try {
    getGenerationEnv();
    checks.generation = true;
  } catch {
    // Keep the response free of secret values and provider internals.
  }

  const ok = Object.values(checks).every(Boolean);

  return NextResponse.json(
    { ok, checks },
    { status: ok ? 200 : 503 }
  );
}
