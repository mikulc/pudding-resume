import { useNavigate } from 'react-router-dom';

/**
 * Custom hook that safely navigates back.
 *
 * When a page URL is copied and opened in a new tab/window, the browser
 * history length is 1, so navigate(-1) would go nowhere useful. In normal
 * SPA navigation, each pushState increments history.length.
 *
 * Checking document.referrer is unreliable in SPAs because client-side
 * routing (pushState) does NOT update the referrer.
 *
 * @param fallbackPath - Path to navigate to when there's no history (default: '/')
 * @returns A function that safely goes back or falls back to the given path
 */
export function useGoBack(fallbackPath: string = '/') {
  const navigate = useNavigate();

  const goBack = () => {
    // window.history.length starts at 1 for a new tab / direct URL open.
    // Each SPA pushState navigation increments it, so length > 1 means
    // there's at least one prior history entry to go back to.
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return goBack;
}
