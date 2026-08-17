import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FloatingContentEditor } from './FloatingContentEditor';

const mocks = vi.hoisted(() => ({
  aiPolish: vi.fn(),
  showToast: vi.fn(),
  validateAIConfig: vi.fn(),
}));

vi.mock('react-i18next', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-i18next')>(),
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../api/ai', () => ({ aiPolish: mocks.aiPolish }));
vi.mock('../../utils/aiConfig', () => ({
  getAIConfig: () => ({ baseUrl: '', apiKey: '', modelName: '' }),
  validateAIConfig: mocks.validateAIConfig,
}));
vi.mock('../../context/ResumeContext', () => ({
  useAppUI: () => ({
    ui: { editorOpen: true, mobileDockMode: 'edit' },
    uiDispatch: vi.fn(),
  }),
}));
vi.mock('../../context/LongTextEditorContext', () => ({
  useLongTextEditor: () => ({ registerEditor: vi.fn(), unregisterEditor: vi.fn() }),
}));
vi.mock('../../context/FloatingEditorContext', () => ({
  useFloatingEditor: () => ({
    config: {
      editorKey: 'work:fixture:description',
      title: 'Edit description',
      text: 'Content long enough for optimization.',
      highlightIndex: 0,
      totalCount: 1,
    },
    anchorRect: new DOMRect(0, 0, 100, 30),
    isOpen: true,
    close: vi.fn(),
    getCallbacks: () => ({
      onTextChange: vi.fn(),
      onSave: vi.fn(),
      onCancel: vi.fn(),
    }),
  }),
  registerFloatingEditorComplete: vi.fn(),
}));
vi.mock('../common/ConfirmModal', () => ({
  useConfirm: () => ({ confirm: vi.fn() }),
}));
vi.mock('../common/Toast', () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

describe('FloatingContentEditor AI optimization', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    mocks.showToast.mockClear();
    mocks.aiPolish.mockReset().mockRejectedValue(new Error('API config missing'));
    mocks.validateAIConfig.mockReset().mockReturnValue({ ok: false, message: 'missing' });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('only shows a toast when AI configuration is missing', async () => {
    render(<FloatingContentEditor />);

    fireEvent.click(await screen.findByRole('button', { name: 'longTextEditor.aiOptimizeShort' }));

    await waitFor(() => {
      expect(mocks.showToast).toHaveBeenCalledWith('longTextEditor.toast.aiConfigMissing', 'error');
    });
    expect(mocks.aiPolish).not.toHaveBeenCalled();
    expect(screen.queryByText('longTextEditor.aiOptimize.errorTitle')).toBeNull();
    expect(screen.getByLabelText('longTextEditor.richTextAria')).toBeTruthy();
  });
});
