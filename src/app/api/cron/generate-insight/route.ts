import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { createClient } from '@/lib/supabase/server';
import { timingSafeCompare } from '@/lib/crypto';
import { deepseek, DEEPSEEK_MODEL, isDeepSeekConfigured } from '@/lib/ai-client';
import { buildGenerateInsightPrompt } from '@/lib/prompts';

const parser = new Parser();

// 东方财富 宏观经济 RSS
const RSS_URL = 'http://www.eastmoney.com/rss/hongguan.xml';

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
    // 2. 获取 RSS
    const feed = await parser.parseURL(RSS_URL);
    // 只处理最新的一条，或者前几条
    // 这里为了演示，我们只取第一条，实际生产中应该遍历并检查去重
    const latestItem = feed.items[0]; 

    if (!latestItem || !latestItem.title) {
      return NextResponse.json({ success: false, error: 'No RSS items found' });
    }

    const supabase = await createClient();

    // 3. 检查去重 (根据原文链接或标题)
    // 假设 posts 表有一个 source_url 字段，或者我们用 slug 做简单的去重检查
    // 这里我们简单生成一个 slug 预检
    const slugBase = latestItem.title.slice(0, 20).replace(/\s+/g, '-'); // 简单处理
    // 实际去重应该查数据库
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('title', latestItem.title) // 简单用标题查重
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, message: 'Already processed', title: latestItem.title });
    }

    const { system, user } = buildGenerateInsightPrompt(
      latestItem.title ?? '',
      latestItem.contentSnippet || latestItem.content || '',
    );

    const completion = await deepseek.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      model: DEEPSEEK_MODEL,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('AI response empty');
    
    const aiAnalysis = JSON.parse(content);

    // 5. 构造入库数据
    // 需要生成一个唯一的 slug
    const uniqueSlug = `ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newPost = {
      slug: uniqueSlug,
      title: aiAnalysis.title || latestItem.title,
      summary_tldr: aiAnalysis.summary,
      content: latestItem.content || latestItem.contentSnippet || aiAnalysis.summary, // 保留原文或使用摘要作为正文
      is_premium: false,
      published_at: new Date().toISOString(),
      source_institution: 'AI Insight (EastMoney)',
      source_date: latestItem.isoDate || new Date().toISOString(),
      tags: aiAnalysis.related_sectors || [],
      sentiment: aiAnalysis.sentiment || 'neutral',
      related_tickers: aiAnalysis.related_tickers || [],
      difficulty: 'easy',
      success_rate: null
    };

    // 6. 存入 Supabase
    const { error: insertError } = await supabase
      .from('posts')
      .insert(newPost);

    if (insertError) {
        console.error('Insert Error:', insertError);
        throw insertError;
    }

    return NextResponse.json({ success: true, data: newPost });

  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
