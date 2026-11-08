import { MessageRole, MessageType, Fragment } from '@/generated/prisma';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Image from 'next/image';
import { ChevronRightIcon, Code2Icon } from 'lucide-react';

interface Props {
  content: string;
  role: MessageRole;
  fragment: Fragment | null;
  createdAt: Date;
  onFragmentClick: (fragment: Fragment) => void;
  type: MessageType;
  isActiveFragment: boolean;
}

export const MessageCard = ({
  content,
  role,
  fragment,
  createdAt,
  isActiveFragment,
  onFragmentClick,
  type,
}: Props) => {
  if (role === 'ASSISTANT')
    return (
      <AssistantMessage
        content={content}
        fragment={fragment}
        isActiveFragment={isActiveFragment}
        createdAt={createdAt}
        type={type}
        onFragmentClick={onFragmentClick}
      />
    );
  return <UserMessage content={content} />;
};

interface UserMessageProps {
  content: string;
}
const UserMessage = ({ content }: UserMessageProps) => {
  return (
    <div className={'flex justify-end pb-4 pr-2 pl-10'}>
      <Card className="rounded-lg bg-muted p-3 shadow-none border-none max-w-[80%] break-words">
        {content}
      </Card>
    </div>
  );
};

interface AssistantMessageProps {
  content: string;
  fragment: Fragment | null;
  createdAt: Date;
  type: MessageType;
  isActiveFragment: boolean;
  onFragmentClick: (fragment: Fragment) => void;
}

const AssistantMessage = ({
  content,
  fragment,
  createdAt,
  onFragmentClick,
  type,
  isActiveFragment,
}: AssistantMessageProps) => {
  return (
    <div
      className={cn(
        'flex flex-col group px-2 pb-4',
        type === 'ERROR' && 'text-red-500 dark:text-red-700'
      )}
    >
      <div className="flex items-center gap-3 pl-2 mb-2">
        <Image
          src={'/logo.svg'}
          alt={'pulpable'}
          width={18}
          height={18}
          className={'shrink-0 '}
        />
        <span className="text-sm font-medium">Pulpable</span>
        <span className="text-xs pl-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          {format(createdAt, "HH:mm 'on' MM dd, yyyy")}
        </span>
      </div>
      <div className="pl-8.5 flex flex-col gap-y-4">
        <span>{content}</span>
        {fragment && type === 'RESULT' && (
          <FragmentCard
            fragment={fragment}
            isActiveFragment={isActiveFragment}
            onFragmentClick={onFragmentClick}
          />
        )}
      </div>
    </div>
  );
};

interface FragmentCardProps {
  fragment: Fragment;
  isActiveFragment: boolean;
  onFragmentClick: (fragment: Fragment) => void;
}

const FragmentCard = ({
  fragment,
  isActiveFragment,
  onFragmentClick,
}: FragmentCardProps) => {
  return (
    <button
      className={cn(
        'flex items-start text-start gap-2 border rounded-lg bg-muted w-fit p-3 hover:bg-secondary transition-colors',
        isActiveFragment &&
          'bg-primary text-primary-foreground border-primary hover:bg-primary'
      )}
      onClick={() => onFragmentClick(fragment)}
    >
      <Code2Icon className={'size-4 mt-0.5'} />
      <div className="flex flex-col flex-1">
        <span className={'text-sm font-medium line-clamp-1'}>
          {fragment.title}
        </span>
      </div>
      <div className="flex items-center justify-center mt-0.5">
        <ChevronRightIcon className={'size-4'} />
      </div>
    </button>
  );
};
