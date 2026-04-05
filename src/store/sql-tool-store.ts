import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { DatabaseConnection, SavedQuery } from '../types';

interface SqlToolStore {
  connections: DatabaseConnection[];
  savedQueries: SavedQuery[];
  activeConnectionId: string | null;

  addConnection: (conn: Omit<DatabaseConnection, 'id' | 'createdAt'>) => string;
  updateConnection: (id: string, partial: Partial<DatabaseConnection>) => void;
  removeConnection: (id: string) => void;
  setActiveConnection: (id: string | null) => void;
  touchConnection: (id: string) => void;

  addSavedQuery: (query: Omit<SavedQuery, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateSavedQuery: (id: string, partial: Partial<SavedQuery>) => void;
  removeSavedQuery: (id: string) => void;

  getConnectionsForUser: (userId: string) => DatabaseConnection[];
  getSavedQueriesForUser: (userId: string) => SavedQuery[];
}

export const useSqlToolStore = create<SqlToolStore>()(
  persist(
    (set, get) => ({
      connections: [],
      savedQueries: [],
      activeConnectionId: null,

      addConnection: (conn) => {
        const id = nanoid();
        const full: DatabaseConnection = { ...conn, id, createdAt: new Date().toISOString() };
        set((s) => ({ connections: [...s.connections, full] }));
        return id;
      },

      updateConnection: (id, partial) =>
        set((s) => ({
          connections: s.connections.map((c) => c.id === id ? { ...c, ...partial } : c),
        })),

      removeConnection: (id) =>
        set((s) => ({
          connections: s.connections.filter((c) => c.id !== id),
          savedQueries: s.savedQueries.map((q) => q.connectionId === id ? { ...q, connectionId: undefined } : q),
          activeConnectionId: s.activeConnectionId === id ? null : s.activeConnectionId,
        })),

      setActiveConnection: (id) => set({ activeConnectionId: id }),

      touchConnection: (id) =>
        set((s) => ({
          connections: s.connections.map((c) => c.id === id ? { ...c, lastUsedAt: new Date().toISOString() } : c),
        })),

      addSavedQuery: (query) => {
        const id = nanoid();
        const now = new Date().toISOString();
        set((s) => ({ savedQueries: [...s.savedQueries, { ...query, id, createdAt: now, updatedAt: now }] }));
        return id;
      },

      updateSavedQuery: (id, partial) =>
        set((s) => ({
          savedQueries: s.savedQueries.map((q) => q.id === id ? { ...q, ...partial, updatedAt: new Date().toISOString() } : q),
        })),

      removeSavedQuery: (id) =>
        set((s) => ({ savedQueries: s.savedQueries.filter((q) => q.id !== id) })),

      getConnectionsForUser: (userId) => get().connections.filter((c) => c.userId === userId),
      getSavedQueriesForUser: (userId) => get().savedQueries.filter((q) => q.userId === userId),
    }),
    {
      name: 'devdock-sql-tool',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ connections: s.connections, savedQueries: s.savedQueries }),
    }
  )
);
