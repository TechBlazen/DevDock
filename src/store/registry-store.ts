import { create } from 'zustand';
import type {
  RegistryItem, RegistryInstall, NewRegistryItemInput, ForumVote,
} from '../types';
import { registryApi } from '../lib/api';

// ─── Registry store (API-backed) ────────────────────────────────────────────
// Hot cache over the registry API, same posture as forum-store: loadItems()
// replaces the cache; mutations are optimistic with best-effort server sync,
// stashing syncError on failure. Voting reuses the forum wholesale-array
// convention (compute the post-toggle array locally, PUT it).

function applyVote(votes: ForumVote[], userId: string, value: 1 | -1): ForumVote[] {
  const existing = votes.find((v) => v.userId === userId);
  if (existing) {
    if (existing.value === value) return votes.filter((v) => v.userId !== userId); // toggle off
    return votes.map((v) => (v.userId === userId ? { ...v, value, createdAt: new Date().toISOString() } : v));
  }
  return [...votes, { userId, value, createdAt: new Date().toISOString() }];
}

interface RegistryStore {
  items: RegistryItem[];
  installs: RegistryInstall[];
  loading: boolean;
  syncError: string | null;

  loadItems: () => Promise<void>;
  loadInstalls: () => Promise<void>;

  createItem: (input: NewRegistryItemInput) => Promise<RegistryItem | null>;
  updateItem: (id: string, input: Partial<NewRegistryItemInput>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  submitItem: (id: string) => Promise<void>;
  approveItem: (id: string, opts?: { verified?: boolean; source?: string }) => Promise<void>;
  rejectItem: (id: string, reason: string) => Promise<void>;
  publishVersion: (id: string, version: string, changelog?: string, content?: string) => Promise<void>;
  voteItem: (id: string, userId: string, value: 1 | -1) => Promise<void>;
  installItem: (id: string) => Promise<void>;
  uninstallItem: (id: string) => Promise<void>;

  // Selectors
  isInstalled: (id: string) => boolean;
}

export const useRegistryStore = create<RegistryStore>((set, get) => ({
  items: [],
  installs: [],
  loading: false,
  syncError: null,

  loadItems: async () => {
    set({ loading: true, syncError: null });
    try {
      const items = (await registryApi.list()) as RegistryItem[];
      set({ items, loading: false });
    } catch (e) {
      set({ loading: false, syncError: e instanceof Error ? e.message : String(e) });
    }
  },

  loadInstalls: async () => {
    try {
      const installs = (await registryApi.installs()) as RegistryInstall[];
      set({ installs });
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : String(e) });
    }
  },

  createItem: async (input) => {
    try {
      const created = (await registryApi.create(input as unknown as Record<string, unknown>)) as RegistryItem;
      set((s) => ({ items: [created, ...s.items] }));
      return created;
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },

  updateItem: async (id, input) => {
    try {
      const updated = (await registryApi.update(id, input as unknown as Record<string, unknown>)) as RegistryItem;
      set((s) => ({ items: s.items.map((it) => (it.id === id ? { ...it, ...updated } : it)) }));
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : String(e) });
    }
  },

  removeItem: async (id) => {
    set((s) => ({ items: s.items.filter((it) => it.id !== id) }));
    try {
      await registryApi.remove(id);
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : String(e) });
    }
  },

  submitItem: async (id) => {
    try {
      const updated = (await registryApi.submit(id)) as RegistryItem;
      set((s) => ({ items: s.items.map((it) => (it.id === id ? { ...it, ...updated } : it)) }));
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : String(e) });
    }
  },

  approveItem: async (id, opts) => {
    try {
      const updated = (await registryApi.approve(id, opts as Record<string, unknown> | undefined)) as RegistryItem;
      set((s) => ({ items: s.items.map((it) => (it.id === id ? { ...it, ...updated } : it)) }));
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : String(e) });
    }
  },

  rejectItem: async (id, reason) => {
    try {
      const updated = (await registryApi.reject(id, reason)) as RegistryItem;
      set((s) => ({ items: s.items.map((it) => (it.id === id ? { ...it, ...updated } : it)) }));
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : String(e) });
    }
  },

  publishVersion: async (id, version, changelog, content) => {
    try {
      await registryApi.publishVersion(id, { version, changelog, content });
      set((s) => ({ items: s.items.map((it) => (it.id === id ? { ...it, latestVersion: version } : it)) }));
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : String(e) });
    }
  },

  voteItem: async (id, userId, value) => {
    const item = get().items.find((it) => it.id === id);
    if (!item) return;
    const votes = applyVote(item.votes, userId, value);
    set((s) => ({ items: s.items.map((it) => (it.id === id ? { ...it, votes } : it)) }));
    try {
      await registryApi.vote(id, votes);
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : String(e) });
    }
  },

  installItem: async (id) => {
    // Optimistic: bump count + add a local install marker.
    set((s) => ({ items: s.items.map((it) => (it.id === id ? { ...it, installCount: it.installCount + 1, installed: true } : it)) }));
    try {
      const install = (await registryApi.install(id)) as RegistryInstall;
      set((s) => ({ installs: s.installs.some((i) => i.itemId === id) ? s.installs : [install, ...s.installs] }));
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : String(e) });
    }
  },

  uninstallItem: async (id) => {
    set((s) => ({
      items: s.items.map((it) => (it.id === id ? { ...it, installCount: Math.max(0, it.installCount - 1), installed: false } : it)),
      installs: s.installs.filter((i) => i.itemId !== id),
    }));
    try {
      await registryApi.uninstall(id);
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : String(e) });
    }
  },

  isInstalled: (id) => get().installs.some((i) => i.itemId === id),
}));
