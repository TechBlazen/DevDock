import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { BuilderItem, BuilderItemType, MockMessage } from '../types';

interface BuilderStore {
  items: BuilderItem[];
  activeItemId: string | null;

  addItem: (item: Omit<BuilderItem, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateItem: (id: string, partial: Partial<BuilderItem>) => void;
  removeItem: (id: string) => void;
  setActiveItem: (id: string | null) => void;
  duplicateItem: (id: string) => string;

  getItemsForUser: (userId: string) => BuilderItem[];
  getAllItems: () => BuilderItem[];
}

export const useBuilderStore = create<BuilderStore>()(
  persist(
    (set, get) => ({
      items: [],
      activeItemId: null,

      addItem: (item) => {
        const id = nanoid();
        const now = new Date().toISOString();
        set((s) => ({ items: [...s.items, { ...item, id, createdAt: now, updatedAt: now }], activeItemId: id }));
        return id;
      },

      updateItem: (id, partial) =>
        set((s) => ({
          items: s.items.map((i) => i.id === id ? { ...i, ...partial, updatedAt: new Date().toISOString() } : i),
        })),

      removeItem: (id) =>
        set((s) => ({
          items: s.items.filter((i) => i.id !== id),
          activeItemId: s.activeItemId === id ? null : s.activeItemId,
        })),

      setActiveItem: (id) => set({ activeItemId: id }),

      duplicateItem: (id) => {
        const original = get().items.find((i) => i.id === id);
        if (!original) return '';
        const newId = nanoid();
        const now = new Date().toISOString();
        const copy: BuilderItem = { ...original, id: newId, name: `${original.name} (copy)`, createdAt: now, updatedAt: now, exportedTo: undefined };
        set((s) => ({ items: [...s.items, copy], activeItemId: newId }));
        return newId;
      },

      getItemsForUser: (userId) => get().items.filter((i) => i.userId === userId),
      getAllItems: () => get().items,
    }),
    {
      name: 'devdock-builder',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
    }
  )
);
