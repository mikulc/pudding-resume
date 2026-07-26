import { describe, expect, it } from 'vitest';
import { azureSidebarLayout } from './azure-sidebar';

describe('azureSidebarLayout', () => {
  it('uses the first preset color as its default', () => {
    expect(azureSidebarLayout.defaultColor).toBe('#3B82F6');
  });
});
