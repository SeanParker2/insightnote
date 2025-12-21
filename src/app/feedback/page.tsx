import { FeedbackForm } from '@/components/feedback/FeedbackForm';

type FeedbackCategory = 'general' | 'bug' | 'feature' | 'billing';

function asSingleString(value: string | string[] | undefined) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

function isFeedbackCategory(value: string | undefined): value is FeedbackCategory {
  return value === 'general' || value === 'bug' || value === 'feature' || value === 'billing';
}

export default function FeedbackPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const categoryParam = asSingleString(searchParams?.category);
  const messageParam = asSingleString(searchParams?.message);
  const emailParam = asSingleString(searchParams?.email);

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <main className="max-w-7xl mx-auto px-6 py-10">
        <FeedbackForm
          defaultCategory={isFeedbackCategory(categoryParam) ? categoryParam : undefined}
          defaultMessage={typeof messageParam === 'string' ? messageParam : undefined}
          defaultEmail={typeof emailParam === 'string' ? emailParam : undefined}
        />
      </main>
    </div>
  );
}
