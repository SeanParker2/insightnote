import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { timingSafeCompare } from '@/lib/crypto';
import { deepseek, DEEPSEEK_MODEL, isDeepSeekConfigured } from '@/lib/ai-client';
import { buildMarketMoodPrompt, buildHistoryPrompt } from '@/lib/prompts';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim() ?? '';
  if (!cronSecret) {
    return new Response('Server misconfigured', { status: 500 });
  }
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token || !timingSafeCompare(token, cronSecret)) {
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
    let systemPrompt = '';
    let fallbackType = 'history'; // history | market_mood

    // 策略选择逻辑：
    // 如果能获取到有效的市场数据（比如还在交易时间或刚收盘），则生成“盘中情绪”
    // 否则（比如周末、半夜），生成“历史上的今天”
    const hasMarketData = marketData && marketData.length > 0;
    
    if (hasMarketData) {
      fallbackType = 'market_mood';
      const marketSummary = marketData.map((m: { name: string; price: number; change_percent: number }) => `${m.name}: ${m.price} (${m.change_percent > 0 ? '+' : ''}${m.change_percent}%)`).join(', ');
      
      const { system, user } = buildMarketMoodPrompt(marketSummary);
      prompt = user;
      systemPrompt = system;
    } else {
      fallbackType = 'history';
      const today = new Date();
      const dateString = `${today.getMonth() + 1}月${today.getDate()}日`;
      
      const { system, user } = buildHistoryPrompt(dateString);
      prompt = user;
      systemPrompt = system;
    }

    // 4. 调用 AI 生成
    const completion = await deepseek.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      model: DEEPSEEK_MODEL,
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
