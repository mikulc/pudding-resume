import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiService } from '../../api/ai';
import { importFromPDF } from './pdf';

vi.mock('../../api/ai', () => ({
  aiService: vi.fn(),
}));

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage: async (pageNumber: number) => ({
        getTextContent: async () => ({
          items: [{
            str: `Resume page ${pageNumber}`,
            transform: [1, 0, 0, 12, 0, 100],
            width: 80,
            height: 12,
          }],
        }),
      }),
    }),
  })),
}));

const mockedAIService = vi.mocked(aiService);

describe('PDF resume import progress', () => {
  beforeEach(() => {
    mockedAIService.mockReset();
    mockedAIService.mockResolvedValue({
      resume_data: { personalInfo: { fullName: 'Pudding' } },
    } as never);
  });

  it('reports each extracted page before AI parsing and normalization', async () => {
    const updates: Array<{ stage: string; progress: number; current?: number; total?: number }> = [];
    const file = {
      name: 'resume.pdf',
      arrayBuffer: async () => new ArrayBuffer(8),
    } as File;

    await importFromPDF(file, (update) => updates.push(update));

    expect(updates).toEqual([
      { stage: 'reading', progress: 6 },
      { stage: 'extracting', progress: 14, current: 0, total: 2 },
      { stage: 'extracting', progress: 35, current: 1, total: 2 },
      { stage: 'extracting', progress: 56, current: 2, total: 2 },
      { stage: 'parsing', progress: 62 },
      { stage: 'normalizing', progress: 84 },
      { stage: 'normalizing', progress: 90 },
    ]);
  });
});
