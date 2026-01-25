export interface FeedItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  timestamp?: string;
  tickers?: string[];
  // Legacy fields for compatibility
  time?: string;
  date?: string;
  isPro?: boolean;
  isMustRead?: boolean;
  author?: string;
  readTime?: string;
  chartData?: number[];
}

export const MOCK_FEED_ITEMS: FeedItem[] = [
  { 
    id: '1', 
    title: '高盛2026策略：超配A股，外资回流是大概率事件', 
    summary: '随着美元周期见顶，新兴市场流动性改善，不仅是港股，沪深300的核心资产估值修复空间巨大...', 
    category: '外资动向', 
    timestamp: '2小时前', 
    tickers: ['300300.SS', 'HSI'] 
  }, 
  { 
    id: '2', 
    title: '华为产业链深度：Mate 70 发布在即，哪些细分龙头最受益？', 
    summary: '不仅仅是光学和屏幕，本次关注重点在于纯国产的射频芯片供应链...', 
    category: '硬科技', 
    timestamp: '4小时前', 
    tickers: ['688xxx.SS', '002xxx.SZ'] 
  } 
];

// Compatibility exports
export const heroArticle: FeedItem = {
  id: "hero-1",
  isMustRead: true,
  author: "高盛 • 全球宏观",
  title: "大轮动：资金从科技股流向公用事业股",
  summary: "随着 AI 基础设施需求触及电力极限，聪明的资金正在转移。我们要分析高盛最新的 100 页报告，解释为什么枯燥的公用事业股将成为新的英伟达。",
  readTime: "5 分钟阅读",
  chartData: [40, 50, 45, 60],
  category: "深度研报",
  timestamp: "今日"
};

export const latestFeed = MOCK_FEED_ITEMS;
