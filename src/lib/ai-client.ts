import OpenAI from 'openai';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY?.trim() ?? '';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

export const deepseek = new OpenAI({
  baseURL: DEEPSEEK_BASE_URL,
  apiKey: DEEPSEEK_API_KEY,
});

export const DEEPSEEK_MODEL = 'deepseek-chat';

export function isDeepSeekConfigured(): boolean {
  return DEEPSEEK_API_KEY.length > 0;
}
