import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../utils/i18n';

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  sendRegistrationCode: vi.fn(),
  verifyRegistrationCode: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    register: mocks.register,
    registrationEmailCodeEnabled: true,
    registrationConfigStatus: 'enabled',
    sendRegistrationCode: mocks.sendRegistrationCode,
    verifyRegistrationCode: mocks.verifyRegistrationCode,
  }),
}));

vi.mock('../common/Toast', () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

import { RegisterModal } from './RegisterModal';

describe('RegisterModal email verification', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyRegistrationCode.mockResolvedValue({
      registration_ticket: 'ticket-123',
      expires_in: 600,
    });
    mocks.register.mockResolvedValue(undefined);
  });

  it('exchanges the code for a ticket before creating the account', async () => {
    const onClose = vi.fn();
    render(<RegisterModal open onClose={onClose} onSwitchToLogin={vi.fn()} />);

    fireEvent.change(document.querySelector('#register-username')!, { target: { value: '测试' } });
    fireEvent.change(document.querySelector('#register-email')!, { target: { value: 'user@example.com' } });
    fireEvent.change(document.querySelector('#register-code')!, { target: { value: '123456' } });
    fireEvent.change(document.querySelector('#register-password')!, { target: { value: 'secret123' } });
    fireEvent.change(document.querySelector('#register-confirm-password')!, { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: '注册' }));

    await waitFor(() => {
      expect(mocks.verifyRegistrationCode).toHaveBeenCalledWith('user@example.com', '123456');
      expect(mocks.register).toHaveBeenCalledWith({
        username: '测试',
        email: 'user@example.com',
        password: 'secret123',
        registration_ticket: 'ticket-123',
      });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('sends an email code without a human-verification token', async () => {
    mocks.sendRegistrationCode.mockResolvedValue({
      message: 'ok',
      retry_after: 60,
    });
    render(<RegisterModal open onClose={vi.fn()} onSwitchToLogin={vi.fn()} />);

    fireEvent.change(document.querySelector('#register-email')!, { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }));

    await waitFor(() => {
      expect(mocks.sendRegistrationCode).toHaveBeenCalledWith('user@example.com');
    });
  });
});
