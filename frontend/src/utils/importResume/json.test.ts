import { describe, expect, it } from 'vitest';
import { importFromJSON } from './json';

function jsonFile(value: unknown, name = 'resume.json'): File {
  return {
    name,
    text: async () => JSON.stringify(value),
  } as File;
}

describe('importFromJSON personal information compatibility', () => {
  it('reports file reading and structure normalization progress', async () => {
    const updates: Array<{ stage: string; progress: number }> = [];

    await importFromJSON(jsonFile({ personalInfo: { fullName: 'Pudding' } }), (update) => {
      updates.push(update);
    });

    expect(updates).toEqual([
      { stage: 'reading', progress: 8 },
      { stage: 'normalizing', progress: 68 },
    ]);
  });

  it('migrates legacy content fields while preserving legacy header settings', async () => {
    const result = await importFromJSON(jsonFile({
      content: {
        personalInfo: {
          fullName: '布丁',
          jobStatus: '随时到岗',
          jobTarget: '前端工程师',
          location: '深圳',
          customFields: { GitHub: '@pudding' },
          fieldOrder: ['fullName', 'GitHub'],
          displayMode: 'text',
          photoLayout: 'right',
          photoLayoutCustomized: true,
        },
      },
    }));

    expect(result.resumeData.personalInfo).toMatchObject({
      jobSearchStatus: '随时到岗',
      targetRole: '前端工程师',
      preferredLocation: '深圳',
      customFields: [
        { id: 'custom-legacy-1', label: 'GitHub', value: '@pudding' },
      ],
    });
    expect(result.settings?.personalHeader).toMatchObject({
      fieldDisplayMode: 'text',
      photoLayout: 'right',
      photoLayoutCustomized: true,
    });
    expect(result.resumeData.personalInfo).not.toHaveProperty('displayMode');
  });

  it('reads the new grouped document settings format', async () => {
    const result = await importFromJSON(jsonFile({
      content: {
        personalInfo: { fullName: 'Pudding' },
      },
      settings: {
        personalInfoLayout: {
          fieldDisplayMode: 'none',
          photoLayout: 'left',
        },
      },
    }));

    expect(result.settings?.personalHeader.fieldDisplayMode).toBe('none');
    expect(result.settings?.personalHeader.photoLayout).toBe('left');
  });

  it('drops retired certification and portfolio modules from legacy JSON', async () => {
    const result = await importFromJSON(jsonFile({
      content: {
        personalInfo: { fullName: 'Pudding' },
        certifications: [{ id: 'cert-1', name: 'Example', date: '2024-01' }],
        portfolio: [{ id: 'work-1', name: 'Example', link: '', description: '' }],
        sectionOrder: ['personal', 'certifications', 'portfolio', 'summary'],
        sectionTitles: { certifications: '证书', portfolio: '作品' },
        hiddenSections: ['certifications', 'portfolio'],
      },
    }));

    expect(result.resumeData).not.toHaveProperty('certifications');
    expect(result.resumeData).not.toHaveProperty('portfolio');
    expect(result.resumeData.sectionConfig).toEqual({
      order: ['personal', 'summary'],
      titleOverrides: {},
      hidden: [],
    });
  });
});
