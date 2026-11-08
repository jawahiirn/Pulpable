import { createTRPCRouter, protectedProcedure } from '@/trpc/init';
import { MessageRole, MessageType } from '@/generated/prisma';
import { z } from 'zod';
import { inngest } from '@/inngest/client';
import { prisma } from '@/lib/db';
import { TRPCError } from '@trpc/server';
import { consumeCredits } from '@/lib/usage';
import { ProjectStatus } from '@/generated/prisma';

export const messagesRouter = createTRPCRouter({
  //  Create MESSAGE
  create: protectedProcedure
    .input(
      z.object({
        value: z
          .string()
          .min(1, { message: 'Prompt is required' })
          .max(10000, 'Prompt is too long'),
        projectId: z.string().min(1, { message: 'Project Id is required' }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.projectId,
          userId: ctx.auth.userId,
        },
      });

      if (!existingProject) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      if (
        existingProject.status === ProjectStatus.QUEUED ||
        existingProject.status === ProjectStatus.RUNNING
      ) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Please wait for the current generation to finish.',
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

      // Create a message
      const createdMessage = await prisma.message.create({
        data: {
          projectId: existingProject.id,
          content: input.value,
          role: MessageRole.USER,
          type: MessageType.RESULT,
        },
      });
      await prisma.project.update({
        where: { id: existingProject.id },
        data: {
          status: ProjectStatus.QUEUED,
          generationStep: 'Queued',
          generationProgress: 0,
          generationError: null,
          generationStartedAt: null,
          generationCompletedAt: null,
        },
      });
      try {
        await inngest.send({
          name: 'code-agent/run',
          data: {
            value: input.value,
            projectId: input.projectId,
          },
        });
      } catch {
        await prisma.project.update({
          where: { id: existingProject.id },
          data: {
            status: ProjectStatus.FAILED,
            generationStep: 'Could not start generation',
            generationError: 'The generation job could not be queued.',
            generationCompletedAt: new Date(),
          },
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not start generation. Please try again.',
        });
      }
      return createdMessage;
    }),
  // GET MESSAGES
  getMany: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1, { message: 'Project Id is required' }),
      })
    )
    .query(async ({ input, ctx }) => {
      return prisma.message.findMany({
        where: {
          projectId: input.projectId,
          project: {
            userId: ctx.auth.userId,
          },
        },
        include: {
          fragment: true,
        },
        orderBy: {
          updatedAt: 'asc',
        },
      });
    }),
});
