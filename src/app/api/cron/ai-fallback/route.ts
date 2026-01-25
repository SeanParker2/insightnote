import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(request: Request) {
  // 1. 安全校验
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const supabase = await createClient();

    // 2. 检查最近 4 小时是否有新文章
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('id')
      .gt('published_at', fourHoursAgo)
      .limit(1);

    // 如果最近有文章，则不需要生成兜底内容
    if (recentPosts && recentPosts.length > 0) {
      return NextResponse.json({ success: true, message: 'Recent posts exist, skipping fallback.' });
    }

    // 3. 准备上下文数据
    // 尝试获取最新的市场行情，作为“盘中情绪”的素材
    const { data: marketData } = await supabase
      .from('market_prices')
      .select('symbol, name, price, change_percent')
      .in('symbol', ['000001.SS', '399001.SZ', 'CNY=X']) // 上证、深证、汇率
      .limit(5);

    let prompt = '';
    let fallbackType = 'history'; // history | market_mood

    // 策略选择逻辑：
    // 如果能获取到有效的市场数据（比如还在交易时间或刚收盘），则生成“盘中情绪”
    // 否则（比如周末、半夜），生成“历史上的今天”
    const hasMarketData = marketData && marketData.length > 0;
    
    if (hasMarketData) {
      fallbackType = 'market_mood';
      const marketSummary = marketData.map((m: any) => `${m.name}: ${m.price} (${m.change_percent > 0 ? '+' : ''}${m.change_percent}%)`).join(', ');
      
      prompt = `
        你是一名幽默风趣的 A 股交易员。现在市场比较平淡（过去4小时没有大新闻）。
        请根据当前的行情数据：${marketSummary}，写一篇简短的“盘中情绪按摩”文案。
        
        要求：
        1. 风格幽默、解压，给股民做“心理按摩”。
        2. 字数 150 字以内。
        3. 必须基于提供的行情数据进行吐槽或鼓励。
        
        输出格式 JSON：
        {
          "title": "幽默的短标题",
          "summary": "正文内容",
          "sentiment": "neutral",
          "tags": ["市场情绪", "段子"]
        }
      `;
    } else {
      fallbackType = 'history';
      const today = new Date();
      const dateString = `${today.getMonth() + 1}月${today.getDate()}日`;
      
      prompt = `
        你是一名博学的金融历史学家。现在市场处于真空期。
        请随机选取历史上今天（${dateString}）或临近日期发生的一件【金融/科技大事】，写一篇“历史上的今天”回顾。
        
        要求：
        1. 事件必须真实，且具有一定的启发性。
        2. 分析该事件对当下市场的启示。
        3. 字数 150 字以内。
        
        输出格式 JSON：
        {
          "title": "历史上的今天：[事件名]",
          "summary": "回顾与启示内容",
          "sentiment": "neutral",
          "tags": ["历史回顾", "金融史"]
        }
      `;
    }

    // 4. 调用 AI 生成
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4-turbo",
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('AI response empty');
    
    const aiContent = JSON.parse(content);

    // 5. 入库
    const uniqueSlug = `ai-fallback-${Date.now()}`;
    
    const newPost = {
      slug: uniqueSlug,
      title: aiContent.title,
      summary_tldr: aiContent.summary,
      content: aiContent.summary,
      is_premium: false,
      published_at: new Date().toISOString(),
      source_institution: 'InsightNote AI', // 明确标识来源
      source_date: new Date().toISOString(),
      tags: aiContent.tags || ['AI Generated'],
      sentiment: aiContent.sentiment || 'neutral',
      related_tickers: [],
      difficulty: 'easy',
      success_rate: null
    };

    const { error: insertError } = await supabase
      .from('posts')
      .insert(newPost);

    if (insertError) {
        console.error('Insert Error:', insertError);
        throw insertError;
    }

    return NextResponse.json({ 
      success: true, 
      type: fallbackType,
      data: newPost 
    });

  } catch (error: any) {
    console.error('Fallback Cron Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
