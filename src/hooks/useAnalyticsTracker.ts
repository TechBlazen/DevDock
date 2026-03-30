import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore, useAnalyticsStore } from '../store';

export function useAnalyticsTracker() {
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const trackPageView = useAnalyticsStore((s) => s.trackPageView);
  const trackError = useAnalyticsStore((s) => s.trackError);
  const prevPath = useRef('');

  // Track page views on route change
  useEffect(() => {
    if (!user || pathname === prevPath.current) return;
    prevPath.current = pathname;
    trackPageView(user.id, user.displayName, pathname);
  }, [pathname, user, trackPageView]);

  // Track global errors
  useEffect(() => {
    if (!user) return;

    const userId = user.id;
    const userName = user.displayName;

    const handleError = (event: ErrorEvent) => {
      trackError(userId, userName, event.message, event.error?.stack, window.location.pathname);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message ?? String(event.reason);
      const stack = event.reason?.stack;
      trackError(userId, userName, message, stack, window.location.pathname);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [user, trackError]);
}
