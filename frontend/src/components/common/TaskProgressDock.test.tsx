import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { TaskProgressDock } from './TaskProgressDock';

describe('TaskProgressDock', () => {
  afterEach(() => {
    cleanup();
    document.getElementById('task-progress-dock-root')?.remove();
  });

  it('keeps the desktop dock at the bottom right and centers its mobile layout', () => {
    render(
      <TaskProgressDock
        visible
        status="loading"
        title="Translating resume"
        description="Please wait"
      />,
    );

    const root = document.getElementById('task-progress-dock-root');

    expect(root?.classList.contains('bottom-6')).toBe(true);
    expect(root?.classList.contains('right-6')).toBe(true);
    expect(root?.classList.contains('max-md:inset-x-3')).toBe(true);
    expect(root?.classList.contains('max-md:bottom-[84px]')).toBe(true);
    expect(root?.classList.contains('max-md:right-auto')).toBe(false);
  });
});
