import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { BuilderItem, BuilderItemType } from '../types';
import type { SkillFileEntry } from '../lib/api';

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
  /** Create a BuilderItem pre-populated from a disk skill file. */
  loadFromDisk: (file: SkillFileEntry, userId: string, content: string) => string;
  /** Update the originalContent snapshot after a save/reload. */
  resetOriginalContent: (id: string, content: string) => void;
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

      loadFromDisk: (file, userId, content) => {
        const id = nanoid();
        const now = new Date().toISOString();
        const type: BuilderItemType = file.kind === 'agent' ? 'agent' : 'skill';
        const item: BuilderItem = {
          id, userId, type,
          name: file.name || file.relativePath,
          description: file.description,
          content,
          originalContent: content,
          sourcePath: file.path,
          sourceType: 'disk',
          mockConversation: [],
          tags: [file.provider],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ items: [...s.items, item], activeItemId: id }));
        return id;
      },

      resetOriginalContent: (id, content) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, originalContent: content, content, updatedAt: new Date().toISOString() } : i
          ),
        })),
    }),
    {
      name: 'devdock-builder',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
    }
  )
);
