import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiService } from '../../api/ai';
import { CANONICAL_AI_IMPORT_SCHEMA, parseTextWithAI } from './markdown';

vi.mock('../../api/ai', () => ({
  aiService: vi.fn(),
}));

const mockedAIService = vi.mocked(aiService);

describe('AI resume import schema', () => {
  beforeEach(() => {
    mockedAIService.mockReset();
  });

  it('matches the current canonical resume structure', () => {
    expect(CANONICAL_AI_IMPORT_SCHEMA).toContain('"details": ""');
    expect(CANONICAL_AI_IMPORT_SCHEMA).toContain('"description": ""');
    expect(CANONICAL_AI_IMPORT_SCHEMA).toContain('"customSections": []');
    expect(CANONICAL_AI_IMPORT_SCHEMA).toContain('"sectionConfig"');
    expect(CANONICAL_AI_IMPORT_SCHEMA).not.toContain('"courses"');
    expect(CANONICAL_AI_IMPORT_SCHEMA).not.toContain('"highlights"');
  });

  it('reports AI parsing and structure normalization progress', async () => {
    mockedAIService.mockResolvedValue({
      resume_data: {
        personalInfo: { fullName: 'Pudding' },
      },
    } as never);
    const updates: Array<{ stage: string; progress: number }> = [];

    await parseTextWithAI('Pudding resume content', (update) => updates.push(update));

    expect(updates).toEqual([
      { stage: 'parsing', progress: 62 },
      { stage: 'normalizing', progress: 84 },
      { stage: 'normalizing', progress: 90 },
    ]);
  });
});
