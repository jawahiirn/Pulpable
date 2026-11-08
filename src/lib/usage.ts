import { RateLimiterPrisma } from 'rate-limiter-flexible';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

const FREE_POINTS = 5;
const SUBSCRIPTION_POINTS = 100;
const DURATION = 30 * 24 * 60 * 60; // 30 days
const GENERATION_COST = 1;

export async function getUsageTracker() {
  const { has } = await auth();
  const hasSubscription = has({ plan: 'pro' });

  return new RateLimiterPrisma({
    storeClient: prisma,
    tableName: 'Usage',
    points: hasSubscription ? SUBSCRIPTION_POINTS : FREE_POINTS,
    duration: DURATION,
  });
}
export async function consumeCredits() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('User not authenticated');
  }
  const usageTracker = await getUsageTracker();
  return usageTracker.consume(userId, GENERATION_COST);
}

export async function getUsageStatus() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('User not authenticated');
  }
  const usageTracker = await getUsageTracker();
  return await usageTracker.get(userId);
}
