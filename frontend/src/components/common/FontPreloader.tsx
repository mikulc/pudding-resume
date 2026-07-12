import { useEffect } from 'react';
import { registerFontFamily } from '../../config/fontRegistry';

interface FontPreloaderProps {
  fontFamilyId: string;
}

/**
 * Registers the selected custom font for resume pages.
 * Loads the full font files from the backend.
 */
export function FontPreloader({ fontFamilyId }: FontPreloaderProps) {
  useEffect(() => {
    void registerFontFamily(fontFamilyId);
  }, [fontFamilyId]);

  return null;
}
