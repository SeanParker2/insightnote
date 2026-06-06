import { deepseek, DEEPSEEK_MODEL, isDeepSeekConfigured } from '@/lib/ai-client';

export interface AICallOptions {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json_object' | 'text';
}

export interface AICallResult<T = any> {
  success: boolean;
  data?: T;
  raw?: string;
  error?: string;
}

export async function callAI<T = any>(options: AICallOptions): Promise<AICallResult<T>> {
  if (!isDeepSeekConfigured()) {
    return { success: false, error: 'AI not configured' };
  }

  try {
    const completion = await deepseek.chat.completions.create({
      messages: [
        { role: 'system', content: options.system },
        { role: 'user', content: options.user },
      ],
      model: DEEPSEEK_MODEL,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1024,
      response_format: options.responseFormat ? { type: options.responseFormat } : undefined,
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'Empty response from AI' };
    }

    if (options.responseFormat === 'json_object') {
      try {
        const data = JSON.parse(content) as T;
        return { success: true, data, raw: content };
      } catch {
        return { success: false, error: 'Invalid JSON response', raw: content };
      }
    }

    return { success: true, data: content as T, raw: content };
  } catch (error: any) {
    return { success: false, error: error.message || 'AI call failed' };
  }
}

export async function callAIWithFallback<T>(
  options: AICallOptions,
  fallback: T
): Promise<T> {
  const result = await callAI<T>(options);
  return result.success ? result.data! : fallback;
}
