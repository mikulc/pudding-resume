import { describe, expect, it } from 'vitest';
import { normalizeDashboardData } from './admin';

describe('normalizeDashboardData', () => {
  it('normalizes nullable dashboard collections from older API responses', () => {
    const data = normalizeDashboardData({
      total_users: 1,
      today_new_users: 0,
      total_resumes: 0,
      today_ai_requests: 0,
      today_tokens: 0,
      month_tokens: 0,
      total_tokens: 0,
      active_users_30d: 0,
      model_usage: null,
      daily_new_users: null,
      daily_tokens: null,
    });

    expect(data.model_usage).toEqual([]);
    expect(data.daily_new_users).toEqual([]);
    expect(data.daily_tokens).toEqual([]);
  });
});
