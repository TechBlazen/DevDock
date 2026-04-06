import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export interface VaultEntry {
  id: string;
  userId: string;
  title: string;
  username: string;
  password: string;        // stored in localStorage — NOT production-secure
  url?: string;
  notes?: string;
  category: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VaultStore {
  entries: VaultEntry[];

  addEntry: (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateEntry: (id: string, partial: Partial<VaultEntry>) => void;
  removeEntry: (id: string) => void;
  toggleFavorite: (id: string) => void;

  getEntriesForUser: (userId: string) => VaultEntry[];
}

export const useVaultStore = create<VaultStore>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) => {
        const id = nanoid();
        const now = new Date().toISOString();
        set((s) => ({ entries: [...s.entries, { ...entry, id, createdAt: now, updatedAt: now }] }));
        return id;
      },

      updateEntry: (id, partial) =>
        set((s) => ({
          entries: s.entries.map((e) => e.id === id ? { ...e, ...partial, updatedAt: new Date().toISOString() } : e),
        })),

      removeEntry: (id) =>
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

      toggleFavorite: (id) =>
        set((s) => ({
          entries: s.entries.map((e) => e.id === id ? { ...e, favorite: !e.favorite } : e),
        })),

      getEntriesForUser: (userId) => get().entries.filter((e) => e.userId === userId),
    }),
    {
      name: 'devdock-vault',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ entries: s.entries }),
    }
  )
);

// ─── Password Generator ─────────────────────────────────────────────────────
export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

export function generatePassword(opts: PasswordOptions): string {
  let chars = '';
  if (opts.uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (opts.lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (opts.numbers) chars += '0123456789';
  if (opts.symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

  const array = new Uint32Array(opts.length);
  crypto.getRandomValues(array);
  return Array.from(array, (v) => chars[v % chars.length]).join('');
}

export function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', color: '#ef4444' };
  if (score <= 3) return { score, label: 'Fair', color: '#f59e0b' };
  if (score <= 4) return { score, label: 'Good', color: '#3b82f6' };
  return { score, label: 'Strong', color: '#22c55e' };
}
