-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Project"
ADD COLUMN "status" "ProjectStatus" NOT NULL DEFAULT 'QUEUED',
ADD COLUMN "generationStep" TEXT,
ADD COLUMN "generationProgress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "generationError" TEXT,
ADD COLUMN "generationAttempt" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "generationStartedAt" TIMESTAMP(3),
ADD COLUMN "generationCompletedAt" TIMESTAMP(3);
