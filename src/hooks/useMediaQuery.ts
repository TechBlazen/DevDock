import { useState, useEffect } from 'react';

/**
 * Subscribe to a CSS media query and re-render when it changes.
 * SSR-safe (returns false before mount when `window` is absent).
 *
 * Example: `const isDesktop = useMediaQuery('(min-width: 1024px)')`
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange(); // sync in case the query changed between render and effect
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

// Tailwind's default breakpoints, so JS and CSS agree on where layout flips.
export const BREAKPOINTS = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
} as const;
