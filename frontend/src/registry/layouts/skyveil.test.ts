import { describe, expect, it } from 'vitest';
import { skyveilLayout } from './skyveil';

describe('skyveilLayout', () => {
  it('binds personal information icons to the selected theme color', () => {
    expect(skyveilLayout.personalInfoClass).toBe('skyveil-contact-icon');
    expect(skyveilLayout.css).toMatch(
      /\.skyveil-contact-icon\s*\{[^}]*color:\s*var\(--theme-border\)\s*!important/s,
    );
  });
});
