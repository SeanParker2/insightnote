import { ButterflyNode } from '@/types';

export interface AnalysisResult {
  summary_tldr: string;
  tags: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  related_tickers: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  butterfly_nodes: Omit<ButterflyNode, 'id' | 'post_id' | 'created_at' | 'updated_at'>[];
}

export async function analyzeContent(text: string): Promise<AnalysisResult> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const lowerText = text.toLowerCase();

  // 1. Sentiment Analysis (Mock)
  let sentiment: AnalysisResult['sentiment'] = 'neutral';
  if (lowerText.includes('growth') || lowerText.includes('bull') || lowerText.includes('up') || lowerText.includes('增长') || lowerText.includes('看多') || lowerText.includes('上涨')) {
    sentiment = 'bullish';
  } else if (lowerText.includes('risk') || lowerText.includes('bear') || lowerText.includes('down') || lowerText.includes('风险') || lowerText.includes('看空') || lowerText.includes('下跌')) {
    sentiment = 'bearish';
  }

  // 2. Tags Extraction (Mock)
  const commonTags = [
    { en: 'AI', cn: 'AI' },
    { en: 'Macro', cn: '宏观' },
    { en: 'Crypto', cn: '加密货币' },
    { en: 'Tech', cn: '科技' },
    { en: 'Energy', cn: '能源' },
    { en: 'Fed', cn: '美联储' }
  ];
  const tags: string[] = [];
  
  commonTags.forEach(tag => {
    if (lowerText.includes(tag.en.toLowerCase()) || lowerText.includes(tag.cn)) {
      tags.push(tag.cn);
    }
  });
  
  if (tags.length === 0) tags.push('市场');

  // 3. Tickers Extraction (Mock)
  const tickerRegex = /\b[A-Z]{2,5}\b/g;
  const potentialTickers = text.match(tickerRegex) || [];
  // Filter out common words that look like tickers
  const commonWords = ['THE', 'AND', 'FOR', 'BUT', 'NOT', 'YES', 'WHO', 'WHY'];
  const related_tickers = Array.from(new Set(potentialTickers.filter(t => !commonWords.includes(t)))).slice(0, 5);

  // 4. Summary (Mock)
  const summary_tldr = text.slice(0, 150) + (text.length > 150 ? '...' : '');

  // 5. Difficulty (Mock)
  const difficulty = text.length > 2000 ? 'hard' : text.length > 1000 ? 'medium' : 'easy';

  // 6. Butterfly Nodes Generation (Mock)
  // Create a simple chain: Root -> Event -> Impact -> Ticker
  const nodes: AnalysisResult['butterfly_nodes'] = [
    {
      label: '核心事件',
      type: 'root',
      parent_id: null,
    },
    {
      label: '市场反应',
      type: 'event',
      parent_id: 'root-placeholder', // This will need to be linked in the UI logic
    },
    {
      label: '板块影响',
      type: 'impact',
      parent_id: 'event-placeholder',
    },
    {
      label: related_tickers[0] || 'SPY',
      type: 'ticker',
      parent_id: 'impact-placeholder',
    },
  ];

  return {
    summary_tldr,
    tags,
    sentiment,
    related_tickers,
    difficulty,
    butterfly_nodes: nodes,
  };
}
