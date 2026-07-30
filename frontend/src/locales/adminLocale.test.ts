import { describe, expect, it } from 'vitest';
import adminZh from './zh-CN/admin.json';

describe('admin locale', () => {
  it('keeps the user management subtitle intact', () => {
    expect(adminZh.users.subtitle).toBe('\u7ba1\u7406\u8d26\u6237\u3001\u914d\u989d\u4e0e\u767b\u5f55\u72b6\u6001');
  });
});
