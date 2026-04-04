import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { PluginSubmission, PluginCategory } from '../types';

interface PluginSubmissionDraft {
  name: string;
  description: string;
  version: string;
  author: string;
  icon: string;
  category: PluginCategory;
  tags: string[];
  submittedBy: string;
  submittedByName: string;
}

interface PluginSubmissionStore {
  submissions: PluginSubmission[];
  submitPlugin: (draft: PluginSubmissionDraft) => void;
  approveSubmission: (id: string, adminUserId: string) => void;
  rejectSubmission: (id: string, adminUserId: string, reason: string) => void;
  deleteSubmission: (id: string) => void;
}

export const usePluginSubmissionStore = create<PluginSubmissionStore>()(
  persist(
    (set) => ({
      submissions: [],

      submitPlugin: (draft) =>
        set((s) => ({
          submissions: [
            {
              ...draft,
              id: nanoid(),
              status: 'pending',
              submittedAt: new Date().toISOString(),
            },
            ...s.submissions,
          ],
        })),

      approveSubmission: (id, adminUserId) =>
        set((s) => ({
          submissions: s.submissions.map((sub) =>
            sub.id === id
              ? { ...sub, status: 'approved' as const, reviewedBy: adminUserId, reviewedAt: new Date().toISOString() }
              : sub
          ),
        })),

      rejectSubmission: (id, adminUserId, reason) =>
        set((s) => ({
          submissions: s.submissions.map((sub) =>
            sub.id === id
              ? { ...sub, status: 'rejected' as const, reviewedBy: adminUserId, reviewedAt: new Date().toISOString(), rejectionReason: reason }
              : sub
          ),
        })),

      deleteSubmission: (id) =>
        set((s) => ({
          submissions: s.submissions.filter((sub) => sub.id !== id),
        })),
    }),
    {
      name: 'devdock-plugin-submissions',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
