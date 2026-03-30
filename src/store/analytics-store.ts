import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { PageView, ClientError } from '../types';

interface AnalyticsStore {
  pageViews: PageView[];
  errors: ClientError[];

  trackPageView: (userId: string, userName: string, path: string) => void;
  trackError: (userId: string, userName: string, message: string, stack: string | undefined, path: string) => void;
  clearPageViews: () => void;
  clearErrors: () => void;

  getVisitsByUser: () => { userId: string; userName: string; count: number }[];
  getVisitsByPage: () => { path: string; count: number }[];
  getVisitsByDay: () => { date: string; count: number }[];
  getErrorsByPage: () => { path: string; count: number }[];
  getActiveUsers: (hours: number) => { userId: string; userName: string; lastSeen: string }[];
  getRecentErrors: (limit: number) => ClientError[];
}

const MAX_PAGE_VIEWS = 1000;
const MAX_ERRORS = 200;

export const useAnalyticsStore = create<AnalyticsStore>()(
  persist(
    (set, get) => ({
      pageViews: [],
      errors: [],

      trackPageView: (userId, userName, path) => {
        const pv: PageView = { id: nanoid(), userId, userName, path, timestamp: new Date().toISOString() };
        set((s) => ({ pageViews: [pv, ...s.pageViews].slice(0, MAX_PAGE_VIEWS) }));
      },

      trackError: (userId, userName, message, stack, path) => {
        const err: ClientError = { id: nanoid(), userId, userName, message, stack, path, timestamp: new Date().toISOString() };
        set((s) => ({ errors: [err, ...s.errors].slice(0, MAX_ERRORS) }));
      },

      clearPageViews: () => set({ pageViews: [] }),
      clearErrors: () => set({ errors: [] }),

      getVisitsByUser: () => {
        const map = new Map<string, { userName: string; count: number }>();
        for (const pv of get().pageViews) {
          const entry = map.get(pv.userId) ?? { userName: pv.userName, count: 0 };
          entry.count++;
          map.set(pv.userId, entry);
        }
        return [...map.entries()].map(([userId, v]) => ({ userId, ...v })).sort((a, b) => b.count - a.count);
      },

      getVisitsByPage: () => {
        const map = new Map<string, number>();
        for (const pv of get().pageViews) {
          map.set(pv.path, (map.get(pv.path) ?? 0) + 1);
        }
        return [...map.entries()].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count);
      },

      getVisitsByDay: () => {
        const map = new Map<string, number>();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        for (const pv of get().pageViews) {
          if (new Date(pv.timestamp) < cutoff) continue;
          const date = pv.timestamp.slice(0, 10);
          map.set(date, (map.get(date) ?? 0) + 1);
        }
        return [...map.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
      },

      getErrorsByPage: () => {
        const map = new Map<string, number>();
        for (const e of get().errors) {
          map.set(e.path, (map.get(e.path) ?? 0) + 1);
        }
        return [...map.entries()].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count);
      },

      getActiveUsers: (hours) => {
        const cutoff = new Date(Date.now() - hours * 3600000).toISOString();
        const map = new Map<string, { userName: string; lastSeen: string }>();
        for (const pv of get().pageViews) {
          if (pv.timestamp < cutoff) continue;
          const existing = map.get(pv.userId);
          if (!existing || pv.timestamp > existing.lastSeen) {
            map.set(pv.userId, { userName: pv.userName, lastSeen: pv.timestamp });
          }
        }
        return [...map.entries()].map(([userId, v]) => ({ userId, ...v })).sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
      },

      getRecentErrors: (limit) => get().errors.slice(0, limit),
    }),
    {
      name: 'devdock-analytics',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ pageViews: s.pageViews, errors: s.errors }),
    }
  )
);
