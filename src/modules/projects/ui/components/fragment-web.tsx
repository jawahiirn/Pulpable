import { useState } from 'react';
import { ExternalLinkIcon, RefreshCcwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Fragment } from '@/generated/prisma';
import { Hint } from '@/components/hint';

interface Props {
  data: Fragment;
}

export function FragmentWeb({ data }: Props) {
  const [fragmentKey, setFragmentKey] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const onOpenNewTab = () => {
    if (!data.sandboxUrl) return;
    window.open(data.sandboxUrl, '_blank');
  };

  const onRefresh = () => {
    setFragmentKey((prev) => prev + 1);
  };

  const onCopy = () => {
    if (!data.sandboxUrl) return;
    navigator.clipboard.writeText(data.sandboxUrl);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className={'flex flex-col w-full h-full'}>
      <div className="p-2 border-b border bg-sidebar flex items-center gap-x-2">
        <Hint text={'Click to refresh'}>
          <Button size={'sm'} variant={'outline'} onClick={onRefresh}>
            <RefreshCcwIcon />
          </Button>
        </Hint>
        <Hint align={'end'} side={'bottom'} text={'Click to copy'}>
          <Button
            className={'justify-start flex-1 text-start font-normal'}
            size={'sm'}
            variant={'outline'}
            onClick={onCopy}
            disabled={!data.sandboxUrl || copied}
          >
            <span className={'truncate'}>{data.sandboxUrl}</span>
          </Button>
        </Hint>
        <Hint text={'Open in a new tab'} side={'bottom'} align={'start'}>
          <Button
            disabled={!data.sandboxUrl}
            size={'sm'}
            variant={'outline'}
            onClick={onOpenNewTab}
          >
            <ExternalLinkIcon />
          </Button>
        </Hint>
      </div>
      <iframe
        key={fragmentKey}
        className={'h-full w-full'}
        sandbox={'allow-forms allow-scripts allow-same-origin'}
        loading={'lazy'}
        src={data.sandboxUrl}
      />
    </div>
  );
}
