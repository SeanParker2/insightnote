export interface FeedItem {
  id: string;
  time?: string;
  date?: string;
  category?: string;
  title: string;
  summary: string;
  isPro?: boolean;
  isMustRead?: boolean;
  author?: string;
  readTime?: string;
  chartData?: number[]; // For Hero section visualization
}

export const heroArticle: FeedItem = {
  id: "hero-1",
  isMustRead: true,
  author: "Goldman Sachs • Global Macro",
  title: "The Great Rotation: Capital Flow Reversal from Tech to Utilities",
  summary: "As AI infrastructure demands hit physical power limits, smart money is moving. We analyze Goldman's latest 100-page report on why boring utility stocks are the new Nvidia.",
  readTime: "5 min read",
  chartData: [40, 50, 45, 60],
};

export const latestFeed: FeedItem[] = [
  {
    id: "feed-1",
    time: "10:42 AM",
    category: "SaaS / Cloud",
    title: 'Morgan Stanley: The "Rule of 40" is Dead',
    summary: "Institutional investors are shifting metrics. Free Cash Flow (FCF) yield is now the dominant factor for valuation premiums in software.",
  },
  {
    id: "feed-2",
    date: "Yesterday",
    isPro: true,
    title: "Sequoia Capital: Generative AI Act II",
    summary: "Exclusive breakdown of Sequoia's internal memo on the application layer opportunities.",
  },
];
