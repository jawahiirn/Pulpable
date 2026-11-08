import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { ChevronDownIcon, ChevronLeftIcon, SunMoonIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuPortal,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSub,
} from '@/components/ui/dropdown-menu';
import { GenerationStatus } from '@/modules/projects/ui/components/generation-status';

interface Props {
  projectId: string;
}

export const ProjectHeader = ({ projectId }: Props) => {
  const trpc = useTRPC();
  const { data: project } = useSuspenseQuery(
    trpc.projects.getOne.queryOptions(
      { id: projectId },
      { refetchInterval: 1500 }
    )
  );
  const { setTheme, theme } = useTheme();

  return (
    <header className={'p-2 flex justify-between items-center gap-3 border-b'}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={'ghost'}
            size={'sm'}
            className={
              'focus-visible:ring-0 hover:bg-transparent hover:opacity-75 transition-opacity pl-2!'
            }
          >
            <Image src={'/logo.svg'} width={18} height={18} alt={'Pulpable'} />
            <span className="text-sm font-medium">{project.name}</span>
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side={'bottom'} align={'start'}>
          <DropdownMenuItem asChild>
            <Link href={'/'}>
              <ChevronLeftIcon />
              <span>Go to Dashboard</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={'gap-2'}>
              <SunMoonIcon className={'size-4 text-muted-foreground'} />
              <span>Appearance</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                  <DropdownMenuRadioItem value={'light'}>
                    <span>Light</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value={'dark'}>
                    <span>Dark</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value={'system'}>
                    <span>System</span>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
      <GenerationStatus project={project} />
    </header>
  );
};
