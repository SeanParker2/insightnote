import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Playfair_Display } from '@/lib/fonts';

const playfair = Playfair_Display({ subsets: ['latin'] });

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <article className="prose prose-slate max-w-none prose-headings:font-serif prose-headings:text-brand-900 prose-p:text-slate-700 prose-p:leading-relaxed prose-a:text-brand-gold hover:prose-a:text-brand-900 prose-blockquote:border-l-brand-gold prose-blockquote:bg-brand-gold/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-th:text-brand-900 prose-th:uppercase prose-th:text-xs prose-th:tracking-wider">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({...props}) => <h1 className={`${playfair.className} text-3xl font-bold mt-8 mb-4`} {...props} />,
          h2: ({...props}) => <h2 className={`${playfair.className} text-2xl font-bold mt-8 mb-4 border-b border-slate-200 pb-2`} {...props} />,
          h3: ({...props}) => <h3 className={`${playfair.className} text-xl font-bold mt-6 mb-3`} {...props} />,
          table: ({...props}) => (
            <div className="overflow-x-auto my-8 border border-slate-200 rounded-lg">
              <table className="min-w-full divide-y divide-slate-200" {...props} />
            </div>
          ),
          thead: ({...props}) => <thead className="bg-slate-50" {...props} />,
          th: ({...props}) => <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider" {...props} />,
          td: ({...props}) => <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 border-t border-slate-100" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
