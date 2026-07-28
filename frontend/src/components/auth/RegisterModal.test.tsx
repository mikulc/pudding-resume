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
import { LoginModal } from './LoginModal';
import { ApiError } from '../../utils/api';

function completeArtworkEntrance() {
  document.querySelectorAll('.pudding-login-character').forEach((character) => {
    const animationEnd = new Event('animationend', { bubbles: true });
    Object.defineProperty(animationEnd, 'animationName', { value: 'pudding-character-in' });
    fireEvent(character, animationEnd);
  });
}

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

  it('does not expose the display name as a saved login username', () => {
    render(<RegisterModal open onClose={vi.fn()} onSwitchToLogin={vi.fn()} />);

    const usernameInput = document.querySelector<HTMLInputElement>('#register-username');

    expect(usernameInput?.getAttribute('type')).toBe('text');
    expect(usernameInput?.getAttribute('name')).toBe('nickname');
    expect(usernameInput?.getAttribute('autocomplete')).toBe('off');
  });

  it('replays the character entrance whenever an auth modal opens', () => {
    const firstRender = render(<RegisterModal open onClose={vi.fn()} onSwitchToLogin={vi.fn()} />);
    firstRender.unmount();

    render(<RegisterModal open onClose={vi.fn()} onSwitchToLogin={vi.fn()} />);

    expect(document.querySelector('.pudding-login-artwork')?.classList.contains('is-entry-settled')).toBe(false);
  });

  it('makes the characters look around instead of squinting at a password', () => {
    render(<RegisterModal open onClose={vi.fn()} onSwitchToLogin={vi.fn()} />);
    completeArtworkEntrance();

    fireEvent.focus(document.querySelector('#register-password')!);

    const characters = [...document.querySelectorAll('.pudding-login-character')];
    expect(characters).toHaveLength(4);
    expect(characters.every((character) => character.classList.contains('is-looking-around'))).toBe(true);
    expect(characters.some((character) => character.classList.contains('is-shy'))).toBe(false);
    expect(document.querySelectorAll('.pudding-login-pupil--tracking')).toHaveLength(8);
    expect(document.querySelectorAll('.pudding-login-pupil--wandering')).toHaveLength(8);
  });

  it('waits for the entrance to finish before applying an input reaction', () => {
    render(<RegisterModal open onClose={vi.fn()} onSwitchToLogin={vi.fn()} />);

    fireEvent.focus(document.querySelector('#register-email')!);

    const characters = [...document.querySelectorAll('.pudding-login-character')];
    expect(characters.some((character) => character.classList.contains('is-curious'))).toBe(false);

    completeArtworkEntrance();

    expect(characters.every((character) => character.classList.contains('is-curious'))).toBe(true);
  });

  it('keeps the character timeline running while validation shakes the faces', () => {
    render(<RegisterModal open onClose={vi.fn()} onSwitchToLogin={vi.fn()} />);

    const character = document.querySelector<HTMLElement>('.pudding-login-character')!;
    const body = character.querySelector<HTMLElement>('.pudding-login-character-body')!;
    const face = character.querySelector<HTMLElement>('.pudding-login-face')!;
    fireEvent.submit(document.querySelector('form')!);

    expect(character.classList.contains('is-shaking')).toBe(false);
    expect(body.classList.contains('is-shaking')).toBe(true);
    expect(face.classList.contains('is-shaking')).toBe(false);
    expect(document.querySelector('#register-username-error')?.textContent?.trim()).not.toBe('');
    expect(document.querySelector('#register-username')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.querySelector('.pudding-login-error')?.classList.contains('is-visible')).toBe(false);
  });

  it('places login validation below the corresponding input', () => {
    render(<LoginModal open onClose={vi.fn()} onSwitchToRegister={vi.fn()} />);

    fireEvent.submit(document.querySelector('form')!);

    expect(document.querySelector('#login-email-error')?.textContent?.trim()).not.toBe('');
    expect(document.querySelector('#login-email')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.querySelector('#login-password-error')?.textContent?.trim()).toBe('');
    expect(document.querySelector('.pudding-login-error')?.classList.contains('is-visible')).toBe(false);

    fireEvent.change(document.querySelector('#login-email')!, { target: { value: 'user@example.com' } });
    fireEvent.submit(document.querySelector('form')!);

    expect(document.querySelector('#login-email-error')?.textContent?.trim()).toBe('');
    expect(document.querySelector('#login-password-error')?.textContent?.trim()).not.toBe('');
    expect(document.querySelector('#login-password')?.getAttribute('aria-invalid')).toBe('true');
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

  it('shows an existing-email conflict below the email input without starting a countdown', async () => {
    mocks.sendRegistrationCode.mockRejectedValue(
      new ApiError('该邮箱已被注册', 409),
    );
    render(<RegisterModal open onClose={vi.fn()} onSwitchToLogin={vi.fn()} />);

    const emailInput = document.querySelector('#register-email')!;
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }));

    await waitFor(() => {
      expect(document.querySelector('#register-email-error')?.textContent?.trim())
        .toBe('该邮箱已被注册');
    });
    expect(emailInput.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '获取验证码' }).disabled).toBe(false);
    expect(mocks.showToast).toHaveBeenCalledWith('该邮箱已被注册', 'error');
  });
});
