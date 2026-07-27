import i18next from 'i18next';
import { describe, expect, it } from 'vitest';
import resumeZh from './zh-CN/resume.json';

describe('resume locale interpolation', () => {
  it('renders the resume name in delete confirmations', async () => {
    const i18n = i18next.createInstance();
    await i18n.init({
      lng: 'zh-CN',
      resources: {
        'zh-CN': { resume: resumeZh },
      },
      defaultNS: 'resume',
    });

    expect(i18n.t('list.confirmDeleteCloud', { name: '前端工程师简历' }))
      .toBe('确定要删除「前端工程师简历」吗？删除后无法恢复。');
  });
});
