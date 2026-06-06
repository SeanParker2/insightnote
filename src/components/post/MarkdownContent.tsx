import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { playfair } from '@/lib/fonts';

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <article className="prose-dark max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({...props}) => <h1 className={`${playfair.className} text-3xl font-bold mt-8 mb-4`} {...props} />,
          h2: ({...props}) => <h2 className={`${playfair.className} text-2xl font-bold mt-8 mb-4 border-b border-border-default pb-2`} {...props} />,
          h3: ({...props}) => <h3 className={`${playfair.className} text-xl font-bold mt-6 mb-3`} {...props} />,
          table: ({...props}) => (
            <div className="overflow-x-auto my-8 border border-border-default rounded-lg">
              <table className="min-w-full divide-y divide-border-default" {...props} />
            </div>
          ),
          thead: ({...props}) => <thead className="bg-surface-2" {...props} />,
          th: ({...props}) => <th className="px-6 py-3 text-left text-xs font-bold text-text-primary uppercase tracking-wider" {...props} />,
          td: ({...props}) => <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary border-t border-border-default" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
