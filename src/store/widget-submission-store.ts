import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { WidgetSubmission, WidgetContentConfig } from '../types';

interface WidgetSubmissionDraft {
  title: string;
  icon: string;
  description: string;
  defaultSize: 'sm' | 'md' | 'lg';
  content: WidgetContentConfig;
  submittedBy: string;
  submittedByName: string;
}

interface WidgetSubmissionStore {
  submissions: WidgetSubmission[];
  submitWidget: (draft: WidgetSubmissionDraft) => void;
  approveSubmission: (id: string, adminUserId: string) => void;
  rejectSubmission: (id: string, adminUserId: string, reason: string) => void;
}

export const useWidgetSubmissionStore = create<WidgetSubmissionStore>()(
  persist(
    (set) => ({
      submissions: [],

      submitWidget: (draft) =>
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
    }),
    {
      name: 'devdock-widget-submissions',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
