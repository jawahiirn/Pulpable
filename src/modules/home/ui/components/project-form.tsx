'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { z } from 'zod';
import TextareaAutosize from 'react-textarea-autosize';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUpIcon, Loader2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Form, FormField } from '@/components/ui/form';
import { useTRPC } from '@/trpc/client';
import { useRouter } from 'next/navigation';
import { PROJECT_TEMPLATES } from '@/modules/home/constants';
import { useClerk } from '@clerk/nextjs';
import { toast } from 'sonner';

const formSchema = z.object({
  value: z
    .string()
    .min(1, { message: 'Value is required' })
    .max(10000, { message: 'Value is too long' }),
});

export const ProjectForm = () => {
  const router = useRouter();
  const [isFocused, setIsFocused] = useState(false);
  const trpc = useTRPC();
  const clerk = useClerk();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: '',
    },
  });

  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        form.reset();
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        queryClient
          .invalidateQueries(trpc.usage.status.queryOptions())
          .then(() => router.push(`/projects/${data.id}`));
      },
      onError: (err) => {
        if (err.data?.code === 'TOO_MANY_REQUESTS') router.push('/pricing');
        else if (err.data?.code === 'UNAUTHORIZED') {
          clerk.openSignIn();
        } else {
          toast.error(err.message);
        }
      },
    })
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await createProject.mutateAsync({
      value: values.value,
    });
  };

  const onSelect = (value: string) => {
    form.setValue('value', value, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
  };

  const isPending = createProject.isPending;
  const isDisabled = isPending || !form.formState.isValid;
  return (
    <Form {...form}>
      <section className={'space-y-6'}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn(
            'relative border p-4 pt-1 bg-sidebar dark:bg-sidebar rounded-xl transition-all ',
            isFocused && 'shadow-xs'
          )}
        >
          <FormField
            name="value"
            render={({ field }) => (
              <TextareaAutosize
                {...field}
                disabled={isPending}
                aria-label="Describe the app you want to build"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                minRows={2}
                maxRows={8}
                className={
                  'pt-4 resize-none border-none w-full outline-none bg-transparent '
                }
                placeholder={'What would you like to build'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    form.handleSubmit(onSubmit)(e);
                  }
                }}
              />
            )}
            control={form.control}
          />
          <div className="flex gap-x-2 items-center justify-between pt-2">
            <div className="text-[10px] text-muted-foreground font-mono">
              <kbd
                className={
                  'ml-auto pointer-events-none inline-flex h-6 rounded-xs select-none items-center bg-muted px-1.5 font-mono font-medium text-muted-foreground border gap-1 text-[10px] '
                }
              >
                <span className={'size-3'}>&#8984;</span> Enter
              </kbd>
              &nbsp; to submit
            </div>
            <Button
              disabled={isDisabled}
              className={cn(
                'size-8 rounded-full',
                isDisabled && 'bg-muted-foreground border'
              )}
            >
              {isPending ? (
                <Loader2Icon className={'size-4 animate-spin'} />
              ) : (
                <ArrowUpIcon />
              )}
            </Button>
          </div>
        </form>
        <div className="flex-wrap justify-center gap-2 hidden md:flex max-w-3xl">
          {PROJECT_TEMPLATES.map((template) => (
            <Button
              key={template.title}
              variant={'outline'}
              size={'sm'}
              className={'bg-white dark:bg-sidebar'}
              onClick={() => onSelect(template.prompt)}
            >
              {template.emoji} {template.title}
            </Button>
          ))}
        </div>
      </section>
    </Form>
  );
};
