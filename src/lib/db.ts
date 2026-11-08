import { PrismaClient } from '@/generated/prisma';
import { getServerEnv } from '@/lib/env';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

getServerEnv();

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
