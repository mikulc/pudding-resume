import { describe, expect, it } from 'vitest';
import { isCustomSectionId, isResumeEntryId } from '../../types/resume';
import { ensureDefaults } from './validation';

describe('ensureDefaults for AI resume imports', () => {
  it('returns a complete canonical resume for a non-object AI response', () => {
    expect(ensureDefaults(null)).toMatchObject({
      personalInfo: {
        fullName: '',
        customFields: [],
        fieldConfig: {
          order: expect.any(Array),
          hidden: [],
          labelOverrides: {},
          iconOverrides: {},
        },
      },
      summary: '',
      education: [],
      workExperience: [],
      projects: [],
      skills: '',
      honors: [],
      customSections: [],
      sectionConfig: {
        order: expect.any(Array),
        titleOverrides: {},
        hidden: [],
      },
    });
  });

  it('normalizes current, legacy, and irregular AI fields without leaking partial entries', () => {
    const result = ensureDefaults({
      personalInfo: {
        fullName: '布丁',
        jobTarget: '前端工程师',
      },
      summary: '个人简介',
      education: [{ school: '示例大学', courses: '主修课程', startDate: '2020/9' }, null],
      workExperience: [{ company: '示例公司', highlights: ['负责平台', '提升性能'] }],
      projects: [{ name: '简历项目', description: '项目描述' }],
      skills: ['TypeScript', 'React'],
      honors: [{ name: '优秀员工' }, null],
      customSections: [{ id: 'legacy-custom', name: '社区经历', content: '维护项目' }, null],
      sectionConfig: {
        order: ['personal', 'legacy-custom'],
        titleOverrides: { 'legacy-custom': '开源贡献' },
        hidden: ['legacy-custom'],
      },
    });

    expect(result.personalInfo.targetRole).toBe('前端工程师');
    expect(result.skills).toBe('1. TypeScript\n2. React');
    expect(result.education).toHaveLength(1);
    expect(result.education[0]).toMatchObject({
      school: '示例大学',
      major: '',
      degree: '',
      startDate: '2020-09',
      endDate: '',
      details: '主修课程',
    });
    expect(isResumeEntryId(result.education[0].id)).toBe(true);
    expect(result.workExperience[0]).toMatchObject({
      company: '示例公司',
      location: '',
      position: '',
      description: '1. 负责平台\n2. 提升性能',
    });
    expect(result.projects[0]).toMatchObject({
      name: '简历项目',
      role: '',
      startDate: '',
      endDate: '',
      link: '',
      description: '项目描述',
    });
    expect(result.honors).toHaveLength(1);
    expect(result.honors[0]).toMatchObject({ name: '优秀员工', date: '' });
    expect(result.customSections).toHaveLength(1);
    expect(isCustomSectionId(result.customSections[0].id)).toBe(true);
    expect(result.sectionConfig).toEqual({
      order: ['personal', result.customSections[0].id],
      titleOverrides: { [result.customSections[0].id]: '开源贡献' },
      hidden: [result.customSections[0].id],
    });
  });
});
