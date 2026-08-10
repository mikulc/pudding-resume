import { afterEach, describe, expect, it } from 'vitest';
import { inlineAllStyles } from './domStyles';

describe('inlineAllStyles', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('preserves inline CSS variables required by exported layout decorations', () => {
    const original = document.createElement('div');
    original.id = '__export_root__';
    original.style.setProperty('--resume-page-margin', '15mm');
    original.style.setProperty('--personal-photo-height', '80px');
    original.style.setProperty('--resume-page-slice-height', '1009px');
    document.body.appendChild(original);

    const clone = original.cloneNode(true) as HTMLElement;
    inlineAllStyles(clone);

    expect(clone.style.getPropertyValue('--resume-page-margin')).toBe('15mm');
    expect(clone.style.getPropertyValue('--personal-photo-height')).toBe('80px');
    expect(clone.style.getPropertyValue('--resume-page-slice-height')).toBe('1009px');
  });
});
