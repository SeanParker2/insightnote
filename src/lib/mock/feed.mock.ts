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
  author: "高盛 • 全球宏观",
  title: "大轮动：资金从科技股流向公用事业股",
  summary: "随着 AI 基础设施需求触及电力极限，聪明的资金正在转移。我们要分析高盛最新的 100 页报告，解释为什么枯燥的公用事业股将成为新的英伟达。",
  readTime: "5 分钟阅读",
  chartData: [40, 50, 45, 60],
};

export const latestFeed: FeedItem[] = [
  {
    id: "feed-1",
    time: "10:42",
    category: "SaaS / 云计算",
    title: '摩根士丹利：「40法则」已死',
    summary: "机构投资者正在改变指标。自由现金流（FCF）收益率现在是软件估值溢价的主导因素。",
  },
  {
    id: "feed-2",
    date: "昨天",
    isPro: true,
    title: "红杉资本：生成式 AI 第二幕",
    summary: "独家解读红杉关于应用层机会的内部备忘录，探讨应用层的新机遇。",
  },
];
