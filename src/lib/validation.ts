export function validateSymbol(symbol: string): boolean {
  if (!symbol || typeof symbol !== 'string') return false;
  // Allow formats: AAPL, 000001.SS, BTC-USD, ^GSPC
  return /^[A-Z0-9.\-\^]{1,20}$/i.test(symbol);
}

export function validateAction(action: string): action is 'buy' | 'sell' | 'hold' | 'add' | 'reduce' {
  return ['buy', 'sell', 'hold', 'add', 'reduce'].includes(action);
}

export function validateConfidence(confidence: unknown): confidence is 1 | 2 | 3 | 4 | 5 {
  return typeof confidence === 'number' && confidence >= 1 && confidence <= 5 && Number.isInteger(confidence);
}

export function validateEmotionState(emotion: string): boolean {
  const validEmotions = ['confident', 'neutral', 'anxious', 'greedy', 'fearful', 'fomo', 'regretful', 'euphoric'];
  return validEmotions.includes(emotion);
}

export function sanitizeForAI(text: string, maxLength: number = 2000): string {
  return text
    .replace(/[<>]/g, '') // Remove potential HTML
    .slice(0, maxLength)
    .trim();
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidEmail(email: string): boolean {
  return validateEmail(email);
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: '密码至少 8 位' };
  }
  if (password.length > 128) {
    return { valid: false, error: '密码不能超过 128 位' };
  }
  return { valid: true };
}
