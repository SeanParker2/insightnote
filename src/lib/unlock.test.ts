import { isUnlocked } from './unlock';

describe('isUnlocked', () => {
  test('returns the db-provided is_unlocked', () => {
    expect(isUnlocked({ is_unlocked: true })).toBe(true);
    expect(isUnlocked({ is_unlocked: false })).toBe(false);
  });
});

