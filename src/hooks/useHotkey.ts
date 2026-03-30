import { useEffect } from 'react';

export function useHotkey(key: string, modifier: 'meta' | 'ctrl' | 'meta-or-ctrl', callback: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key.toLowerCase()) return;

      const modMatch =
        modifier === 'meta' ? e.metaKey :
        modifier === 'ctrl' ? e.ctrlKey :
        e.metaKey || e.ctrlKey;

      if (modMatch) {
        e.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, modifier, callback]);
}
