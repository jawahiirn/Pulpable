'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  Loader2Icon,
  RotateCcwIcon,
} from 'lucide-react';
import { Project, ProjectStatus } from '@/generated/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTRPC } from '@/trpc/client';
import { toast } from 'sonner';

interface Props {
  project: Pick<
    Project,
    | 'id'
    | 'status'
    | 'generationStep'
    | 'generationProgress'
    | 'generationError'
  >;
}

const statusLabels: Record<ProjectStatus, string> = {
  QUEUED: 'Queued',
  RUNNING: 'Building',
  SUCCEEDED: 'Ready',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

export const GenerationStatus = ({ project }: Props) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isGenerating =
    project.status === ProjectStatus.QUEUED ||
    project.status === ProjectStatus.RUNNING;

  const retry = useMutation(
    trpc.projects.retry.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.projects.getOne.queryOptions({ id: project.id })
        );
        queryClient.invalidateQueries(
          trpc.messages.getMany.queryOptions({ projectId: project.id })
        );
      },
      onError: (error) => toast.error(error.message),
    })
  );

  if (isGenerating) {
    return (
      <div className="flex min-w-36 items-center gap-2" aria-live="polite">
        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-muted-foreground">
              {project.generationStep || statusLabels[project.status]}
            </span>
            <span className="text-muted-foreground">
              {project.generationProgress}%
            </span>
          </div>
          <Progress value={project.generationProgress} />
        </div>
      </div>
    );
  }

  if (project.status === ProjectStatus.FAILED) {
    return (
      <div className="flex items-center gap-2" aria-live="assertive">
        <Badge variant="destructive">
          <AlertCircleIcon /> {statusLabels[project.status]}
        </Badge>
        <Button
          size="sm"
          variant="outline"
          disabled={retry.isPending}
          onClick={() => retry.mutate({ id: project.id })}
        >
          <RotateCcwIcon className={retry.isPending ? 'animate-spin' : ''} />
          Retry
        </Button>
        {project.generationError && (
          <span className="text-xs text-destructive" role="alert">
            {project.generationError}
          </span>
        )}
      </div>
    );
  }

  return (
    <Badge variant="secondary" aria-live="polite">
      <CheckCircle2Icon /> {statusLabels[project.status]}
    </Badge>
  );
};
