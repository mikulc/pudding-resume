import { useCallback, useEffect, useRef } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { useExitConfirm } from '../../components/common/ExitConfirmDialog';
import { triggerSave } from '../../components/common/SaveSync';
import { isLocalStorageEnabled } from '../../context/AuthContext';

interface EditorLeaveGuardOptions { isDirty: boolean; isLoggedIn: boolean; navigate: NavigateFunction; }

export function useEditorLeaveGuard({ isDirty, isLoggedIn, navigate }: EditorLeaveGuardOptions) {
  // Exit confirm dialog
  const { exitConfirm } = useExitConfirm();

  // Guard refs for browser back/forward interception
  const guardPushedRef = useRef(false);
  const dialogOpenRef = useRef(false);
  const leavingRef = useRef(false);


  // Intercept browser back/forward when dirty
  useEffect(() => {
    if (!isDirty) {
      // Clean up stale guard entry from history when the resume becomes saved
      if (guardPushedRef.current) {
        guardPushedRef.current = false;
        // Pop the guard entry silently (same URL, no visual change to user)
        window.history.back();
      }
      return;
    }

    // Push a single guard entry so browser back lands on it first
    if (!guardPushedRef.current) {
      window.history.pushState({ __exitGuard: true }, '', window.location.href);
      guardPushedRef.current = true;
    }

    const handlePopState = (_e: PopStateEvent) => {
      if (leavingRef.current) return;

      // If the guard entry is being popped, user is trying to leave via browser back.
      // dialogOpenRef check prevents re-entry when navigateAway() calls navigate(-2).
      if (!dialogOpenRef.current) {
        dialogOpenRef.current = true;
        exitConfirm({ isLoggedIn, localStoragePath: isLocalStorageEnabled() ? 'local' : '' }).then(async (choice) => {
          try {
            if (choice === 'save') {
              const saved = await triggerSave();
              if (!saved) {
                window.history.forward();
                return;
              }
              guardPushedRef.current = false;
              leavingRef.current = true;
              // Guard was just popped by browser back, so -1 goes to previous page
              navigate(-1);
            } else if (choice === 'discard') {
              guardPushedRef.current = false;
              leavingRef.current = true;
              // Guard was just popped by browser back, so -1 goes to previous page
              navigate(-1);
            } else {
              // Browser back already popped the guard entry. If the user cancels,
              // move forward to restore it as the current entry so later app-level
              // back actions still calculate the history offset correctly.
              window.history.forward();
            }
          } finally {
            dialogOpenRef.current = false;
          }
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty, exitConfirm, isLoggedIn, navigate]);

  const navigateBackFromToolbar = useCallback(async () => {
    if (dialogOpenRef.current) return;

    if (!isDirty) {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/resumes');
      }
      return;
    }

    dialogOpenRef.current = true;
    try {
      const choice = await exitConfirm({
        isLoggedIn,
        localStoragePath: isLocalStorageEnabled() ? 'local' : '',
      });

      if (choice === 'cancel') return;

      if (choice === 'save') {
        const saved = await triggerSave();
        if (!saved) return;
      }

      guardPushedRef.current = false;
      leavingRef.current = true;

      if (window.history.length > 2) {
        navigate(-2);
      } else {
        navigate('/resumes', { replace: true });
      }
    } finally {
      dialogOpenRef.current = false;
    }
  }, [exitConfirm, isDirty, isLoggedIn, navigate]);

  // beforeunload: warn when closing/refreshing browser tab with unsaved changes
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);


  return { navigateBackFromToolbar };
}
