import { describe, expect, it } from 'vitest';
import { calculateResumeMenuPosition, calculateResumeRenamePosition } from './useResumeMenu';

describe('calculateResumeMenuPosition', () => {
  it('keeps an above-positioned short menu next to its trigger', () => {
    const menuHeight = 142;
    const trigger = { top: 900, right: 660, bottom: 928 };

    const position = calculateResumeMenuPosition(
      trigger,
      { width: 2048, height: 984 },
      menuHeight,
    );

    expect(trigger.top - (position.top + menuHeight)).toBe(8);
    expect(position.left).toBe(512);
  });

  it('keeps a below-positioned menu next to its trigger', () => {
    const trigger = { top: 400, right: 1000, bottom: 428 };

    const position = calculateResumeMenuPosition(
      trigger,
      { width: 2048, height: 1200 },
      182,
    );

    expect(position.top - trigger.bottom).toBe(8);
    expect(position.left).toBe(852);
  });

  it('clamps the menu inside the viewport', () => {
    expect(calculateResumeMenuPosition(
      { top: 2, right: 90, bottom: 30 },
      { width: 320, height: 180 },
      170,
    )).toEqual({ top: 8, left: 8 });
  });
});

describe('calculateResumeRenamePosition', () => {
  it('keeps the wider rename popover inside a mobile viewport', () => {
    expect(calculateResumeRenamePosition(
      { top: 520, right: 390, bottom: 548 },
      { width: 390, height: 844 },
      142,
    )).toEqual({ top: 556, left: 142 });
  });
});
