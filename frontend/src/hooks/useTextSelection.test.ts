import { describe, expect, it } from 'vitest';
import { findEditableAncestor } from './useTextSelection';

describe('findEditableAncestor', () => {
  it('only treats explicitly marked body content as editable rich text', () => {
    const entry = document.createElement('div');
    entry.dataset.section = 'work';
    entry.innerHTML = `
      <div class="entry-title-row">
        <span class="entity-title">布丁科技有限公司</span>
      </div>
      <ul data-section="work" data-entry-id="work-1" data-field="highlights">
        <li>负责正文内容</li>
      </ul>
    `;

    const title = entry.querySelector('.entity-title')?.firstChild ?? null;
    const body = entry.querySelector('li')?.firstChild ?? null;

    expect(findEditableAncestor(title)).toBeNull();
    expect(findEditableAncestor(body)).toMatchObject({
      section: 'work',
      entryId: 'work-1',
      field: 'highlights',
    });
  });
});
