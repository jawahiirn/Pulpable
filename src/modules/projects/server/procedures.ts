import { createTRPCRouter, protectedProcedure } from '@/trpc/init';
import { z } from 'zod';
import { inngest } from '@/inngest/client';
import { prisma } from '@/lib/db';
import { generateSlug } from 'random-word-slugs';
import { TRPCError } from '@trpc/server';
import { consumeCredits } from '@/lib/usage';
import { ProjectStatus } from '@/generated/prisma';
import { getGenerationEnv } from '@/lib/env';
import {
  classifyGenerationError,
  getSafeGenerationError,
  logGenerationError,
} from '@/lib/generation-errors';

async function queueGeneration(projectId: string, value: string) {
  try {
    getGenerationEnv();
    await inngest.send({
      name: 'code-agent/run',
      data: {
        value,
        projectId,
      },
    });
  } catch (error) {
    const errorCode = classifyGenerationError(error);
    logGenerationError(projectId, error, errorCode);
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: ProjectStatus.FAILED,
        generationStep: 'Could not start generation',
        generationError: getSafeGenerationError(errorCode),
        generationErrorCode: errorCode,
        generationCompletedAt: new Date(),
      },
    });

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Could not start generation. Please try again.',
    });
  }
}

export const projectsRouter = createTRPCRouter({
  //  CREATE PROJECT
  create: protectedProcedure
    .input(
      z.object({
        value: z
          .string()
          .min(1, { message: 'Prompt is required' })
          .max(10000, 'Prompt is too long'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        getGenerationEnv();
      } catch (error) {
        logGenerationError('preflight', error, 'CONFIGURATION_ERROR');
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: getSafeGenerationError('CONFIGURATION_ERROR'),
        });
      }

      try {
        await consumeCredits();
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Something went wrong',
          });
        } else {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message:
              'You have exceeded past the limit of your available credits.',
          });
        }
      }

      const createdProject = await prisma.project.create({
        data: {
          userId: ctx.auth.userId,
          name: generateSlug(2, {
            format: 'kebab',
          }),
          status: ProjectStatus.QUEUED,
          generationStep: 'Queued',
          messages: {
            create: {
              content: input.value,
              role: 'USER',
              type: 'RESULT',
            },
          },
        },
      });
      await queueGeneration(createdProject.id, input.value);

      return createdProject;
    }),
  // GET SINGLE PROJECT
  getOne: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const project = await prisma.project.findUnique({
        where: {
          userId: ctx.auth.userId,
          id: input.id,
        },
      });
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }
      return project;
    }),
  retry: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.id,
          userId: ctx.auth.userId,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      if (
        project.status === ProjectStatus.QUEUED ||
        project.status === ProjectStatus.RUNNING
      ) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This project is already being generated.',
        });
      }

      const lastUserMessage = await prisma.message.findFirst({
        where: {
          projectId: project.id,
          role: 'USER',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!lastUserMessage) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'There is no prompt to retry.',
        });
      }

      const queuedProject = await prisma.project.update({
        where: { id: project.id },
        data: {
          status: ProjectStatus.QUEUED,
          generationStep: 'Queued',
          generationProgress: 0,
          generationError: null,
          generationErrorCode: null,
          generationStartedAt: null,
          generationCompletedAt: null,
        },
      });

      await queueGeneration(project.id, lastUserMessage.content);
      return queuedProject;
    }),
  // GET PROJECTS
  getMany: protectedProcedure.query(async ({ ctx }) => {
    return prisma.project.findMany({
      where: {
        userId: ctx.auth.userId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }),
});
