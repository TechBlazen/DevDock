import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { ForumThread, ForumAnswer, ForumCategory, ForumUserReputation, FeatureRequest } from '../types';
import { getTier } from '../lib/forum-constants';

// ─── Seed Data ──────────────────────────────────────────────────────────────
const now = new Date();
const ago = (hours: number) => new Date(now.getTime() - hours * 3600000).toISOString();

const seedThreads: ForumThread[] = [
  {
    id: 'ft1', title: 'How to configure MCP servers for local development?', body: '## Problem\nI\'m trying to set up MCP servers locally for development but the stdio transport keeps timing out.\n\n## What I\'ve tried\n- Running `npx @modelcontextprotocol/server-filesystem` directly\n- Setting the port in the config to 3001\n- Checking if the process is actually spawning\n\nAny help would be appreciated!', category: 'how-to', tags: ['Engineering', 'Node.js'],
    authorId: 'seed-alice', authorName: 'Alice Chen', authorAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=AC',
    votes: [{ userId: 'seed-bob', value: 1, createdAt: ago(20) }, { userId: 'seed-carol', value: 1, createdAt: ago(18) }, { userId: 'seed-dave', value: 1, createdAt: ago(10) }],
    answers: [
      { id: 'fa1', threadId: 'ft1', authorId: 'seed-bob', authorName: 'Bob Martinez', authorAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=BM', body: 'The stdio transport doesn\'t use ports — it communicates via stdin/stdout. Make sure your `command` field in the MCP config points to the correct binary.\n\n```json\n{\n  "command": "npx",\n  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]\n}\n```\n\nAlso check that you\'re not buffering stdout in the child process.', votes: [{ userId: 'seed-alice', value: 1, createdAt: ago(17) }, { userId: 'seed-carol', value: 1, createdAt: ago(15) }, { userId: 'seed-dave', value: 1, createdAt: ago(8) }, { userId: 'seed-eve', value: 1, createdAt: ago(5) }], isAccepted: true, createdAt: ago(19), updatedAt: ago(19) },
      { id: 'fa2', threadId: 'ft1', authorId: 'seed-carol', authorName: 'Carol Davis', authorAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=CD', body: 'If you\'re on macOS, also check that you don\'t have a zombie node process holding the port. Run `lsof -i :3001` to verify.', votes: [{ userId: 'seed-alice', value: 1, createdAt: ago(16) }], isAccepted: false, createdAt: ago(17), updatedAt: ago(17) },
    ],
    viewCount: 45, acceptedAnswerId: 'fa1', createdAt: ago(24), updatedAt: ago(17),
  },
  {
    id: 'ft2', title: '[Bug] Terraform plan fails with Azure provider 4.x', body: '## Description\nAfter upgrading the Azure provider to 4.x, `terraform plan` fails with:\n\n```\nError: Invalid provider configuration\n│ Provider "registry.terraform.io/hashicorp/azurerm" requires explicit configuration.\n```\n\n## Environment\n- Terraform 1.7.4\n- Azure Provider 4.0.1\n- macOS 14.3\n\nAnyone else hitting this?', category: 'bug', tags: ['DevOps', 'Terraform', 'Azure'],
    authorId: 'seed-dave', authorName: 'Dave Wilson', authorAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=DW',
    votes: [{ userId: 'seed-alice', value: 1, createdAt: ago(60) }, { userId: 'seed-bob', value: 1, createdAt: ago(55) }, { userId: 'seed-carol', value: 1, createdAt: ago(50) }, { userId: 'seed-eve', value: 1, createdAt: ago(45) }, { userId: 'seed-frank', value: 1, createdAt: ago(30) }, { userId: 'seed-grace', value: 1, createdAt: ago(20) }, { userId: 'seed-henry', value: 1, createdAt: ago(10) }],
    answers: [
      { id: 'fa3', threadId: 'ft2', authorId: 'seed-eve', authorName: 'Eve Taylor', authorAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=ET', body: 'Azure provider 4.x requires the `features {}` block even if empty. Add this to your provider config:\n\n```hcl\nprovider "azurerm" {\n  features {}\n}\n```\n\nThis was a breaking change in 4.0.', votes: [{ userId: 'seed-dave', value: 1, createdAt: ago(48) }, { userId: 'seed-alice', value: 1, createdAt: ago(46) }, { userId: 'seed-bob', value: 1, createdAt: ago(40) }, { userId: 'seed-frank', value: 1, createdAt: ago(25) }, { userId: 'seed-grace', value: 1, createdAt: ago(15) }], isAccepted: false, createdAt: ago(50), updatedAt: ago(50) },
      { id: 'fa4', threadId: 'ft2', authorId: 'seed-frank', authorName: 'Frank Lee', authorAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=FL', body: 'Also check your `required_providers` block — v4 changed the source format. See the migration guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide', votes: [{ userId: 'seed-dave', value: 1, createdAt: ago(42) }, { userId: 'seed-carol', value: 1, createdAt: ago(35) }], isAccepted: false, createdAt: ago(44), updatedAt: ago(44) },
      { id: 'fa5', threadId: 'ft2', authorId: 'seed-bob', authorName: 'Bob Martinez', authorAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=BM', body: 'We hit the same issue. The fix is the `features {}` block as Eve mentioned. We also had to update our CI pipeline image to include the new provider version.', votes: [{ userId: 'seed-dave', value: 1, createdAt: ago(38) }], isAccepted: false, createdAt: ago(40), updatedAt: ago(40) },
    ],
    viewCount: 120, acceptedAnswerId: null, createdAt: ago(72), updatedAt: ago(40),
  },
  {
    id: 'ft4', title: 'Best practices for Kubernetes pod security policies', body: '## Question\nWe\'re migrating to GKE and need to set up pod security policies. What are the current best practices?\n\nSpecifically:\n- Should we use Pod Security Admission or a third-party tool like OPA/Gatekeeper?\n- What baseline policies should every cluster have?\n- How do you handle exceptions for system namespaces?', category: 'discussion', tags: ['Security', 'Kubernetes', 'GCP'],
    authorId: 'seed-eve', authorName: 'Eve Taylor', authorAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=ET',
    votes: [{ userId: 'seed-alice', value: 1, createdAt: ago(40) }, { userId: 'seed-bob', value: 1, createdAt: ago(35) }, { userId: 'seed-dave', value: 1, createdAt: ago(30) }, { userId: 'seed-frank', value: 1, createdAt: ago(20) }, { userId: 'seed-grace', value: 1, createdAt: ago(10) }],
    answers: [
      { id: 'fa7', threadId: 'ft4', authorId: 'seed-frank', authorName: 'Frank Lee', authorAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=FL', body: 'PSPs are deprecated since K8s 1.21 and removed in 1.25. Use **Pod Security Admission** (built-in) for baseline enforcement:\n\n```yaml\napiVersion: v1\nkind: Namespace\nmetadata:\n  labels:\n    pod-security.kubernetes.io/enforce: baseline\n    pod-security.kubernetes.io/warn: restricted\n```\n\nFor more granular policies, use **OPA Gatekeeper** alongside PSA.', votes: [{ userId: 'seed-eve', value: 1, createdAt: ago(38) }, { userId: 'seed-alice', value: 1, createdAt: ago(33) }, { userId: 'seed-dave', value: 1, createdAt: ago(28) }], isAccepted: true, createdAt: ago(39), updatedAt: ago(39) },
      { id: 'fa8', threadId: 'ft4', authorId: 'seed-grace', authorName: 'Grace Kim', authorAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=GK', body: 'Adding to Frank\'s answer — for GKE specifically, enable **Workload Identity** and **Binary Authorization**. GKE also has built-in security posture features under the Security tab.', votes: [{ userId: 'seed-eve', value: 1, createdAt: ago(25) }, { userId: 'seed-frank', value: 1, createdAt: ago(22) }], isAccepted: false, createdAt: ago(30), updatedAt: ago(30) },
    ],
    viewCount: 67, acceptedAnswerId: 'fa7', createdAt: ago(48), updatedAt: ago(30),
  },
  {
    id: 'ft5', title: 'Python service failing health checks in staging', body: '## Issue\nOur FastAPI service passes health checks locally but fails in the staging GKE cluster. The liveness probe returns 503 after ~30 seconds.\n\n## Setup\n- FastAPI 0.110.0\n- Gunicorn + Uvicorn workers\n- Health endpoint: `GET /health` returns `{"status": "ok"}`\n- Pod resources: 256Mi memory, 250m CPU\n\nLogs show no errors. The pod gets killed by OOMKiller occasionally.', category: 'question', tags: ['Platform', 'Python', 'Docker', 'Kubernetes'],
    authorId: 'seed-grace', authorName: 'Grace Kim', authorAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=GK',
    votes: [{ userId: 'seed-bob', value: 1, createdAt: ago(8) }, { userId: 'seed-dave', value: 1, createdAt: ago(5) }],
    answers: [],
    viewCount: 23, acceptedAnswerId: null, createdAt: ago(12), updatedAt: ago(12),
  },
  {
    id: 'ft6', title: 'How to set up OpenTelemetry tracing with Go services?', body: '## Goal\nI want to add distributed tracing to our Go microservices using OpenTelemetry and send traces to Jaeger.\n\n## Current setup\n- Go 1.22\n- gRPC services\n- No current observability\n\nLooking for a step-by-step guide or recommended libraries.', category: 'how-to', tags: ['Engineering', 'Go', 'Monitoring'],
    authorId: 'seed-bob', authorName: 'Bob Martinez', authorAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=BM',
    votes: [{ userId: 'seed-alice', value: 1, createdAt: ago(140) }, { userId: 'seed-carol', value: 1, createdAt: ago(130) }, { userId: 'seed-dave', value: 1, createdAt: ago(120) }, { userId: 'seed-eve', value: 1, createdAt: ago(110) }, { userId: 'seed-frank', value: 1, createdAt: ago(100) }, { userId: 'seed-grace', value: 1, createdAt: ago(80) }, { userId: 'seed-henry', value: 1, createdAt: ago(60) }, { userId: 'seed-iris', value: 1, createdAt: ago(40) }],
    answers: [
      { id: 'fa9', threadId: 'ft6', authorId: 'seed-alice', authorName: 'Alice Chen', authorAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=AC', body: 'Here\'s the recommended setup for Go + OTel + gRPC:\n\n1. Install the SDK:\n```bash\ngo get go.opentelemetry.io/otel\ngo get go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp\ngo get go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc\n```\n\n2. Initialize the tracer provider in your `main.go`\n3. Add the gRPC interceptor: `grpc.UnaryInterceptor(otelgrpc.UnaryServerInterceptor())`\n4. Set `OTEL_EXPORTER_OTLP_ENDPOINT` to your Jaeger collector\n\nThe `otelgrpc` package auto-creates spans for every RPC call.', votes: [{ userId: 'seed-bob', value: 1, createdAt: ago(135) }, { userId: 'seed-dave', value: 1, createdAt: ago(118) }, { userId: 'seed-eve', value: 1, createdAt: ago(105) }, { userId: 'seed-frank', value: 1, createdAt: ago(90) }, { userId: 'seed-grace', value: 1, createdAt: ago(70) }, { userId: 'seed-henry', value: 1, createdAt: ago(55) }], isAccepted: true, createdAt: ago(138), updatedAt: ago(138) },
    ],
    viewCount: 156, acceptedAnswerId: 'fa9', createdAt: ago(168), updatedAt: ago(138),
  },
];

// ─── Feature Request Seed Data ──────────────────────────────────────────────
const seedFeatureRequests: FeatureRequest[] = [
  {
    id: 'fr1', title: 'Support for GitLab repositories', description: '## Proposal\nDevDock currently supports GitHub and Azure DevOps. It would be great to add GitLab support as well.\n\n## Use case\nOur team uses GitLab for internal projects and GitHub for open-source. Having both in one portal would be a huge productivity boost.\n\n## Suggested approach\n- GitLab API v4 integration\n- Personal access token auth\n- Group and project browsing\n\n---\n**Update:** This is on the roadmap! The `src/lib/repos.ts` fetch layer is already abstracted to support multiple sources. A GitLab adapter would follow the same pattern as the GitHub and ADO fetchers. I\'d estimate this as a medium-sized effort — maybe 2-3 days of work.',
    authorId: 'seed-carol', authorName: 'Carol Davis', authorAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=CD',
    status: 'planned',
    votes: [
      { userId: 'seed-alice', value: 1, createdAt: ago(100) }, { userId: 'seed-bob', value: 1, createdAt: ago(90) },
      { userId: 'seed-dave', value: 1, createdAt: ago(85) }, { userId: 'seed-eve', value: 1, createdAt: ago(80) },
      { userId: 'seed-frank', value: 1, createdAt: ago(75) }, { userId: 'seed-grace', value: 1, createdAt: ago(60) },
      { userId: 'seed-henry', value: 1, createdAt: ago(50) }, { userId: 'seed-iris', value: 1, createdAt: ago(40) },
      { userId: 'seed-jack', value: 1, createdAt: ago(30) }, { userId: 'seed-kate', value: 1, createdAt: ago(20) },
      { userId: 'seed-leo', value: 1, createdAt: ago(10) }, { userId: 'seed-mia', value: 1, createdAt: ago(5) },
    ],
    attachments: [], tags: ['Engineering', 'CI/CD'], createdAt: ago(120), updatedAt: ago(98),
  },
  {
    id: 'fr2', title: 'Dark/Light Theme Scheduler', description: 'Allow users to schedule automatic theme switching based on time of day — e.g. light mode during working hours and dark mode in the evening. Could also tie into OS-level dark mode settings.',
    authorId: 'seed-alice', authorName: 'Alice Chen', authorAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=AC',
    status: 'open',
    votes: [
      { userId: 'seed-bob', value: 1, createdAt: ago(100) }, { userId: 'seed-carol', value: 1, createdAt: ago(90) },
      { userId: 'seed-dave', value: 1, createdAt: ago(70) }, { userId: 'seed-eve', value: 1, createdAt: ago(50) },
      { userId: 'seed-frank', value: 1, createdAt: ago(30) }, { userId: 'seed-grace', value: 1, createdAt: ago(15) },
      { userId: 'seed-henry', value: 1, createdAt: ago(8) },
    ],
    attachments: [], tags: ['Platform'], createdAt: ago(168), updatedAt: ago(8),
  },
  {
    id: 'fr3', title: 'Slack & Teams Notifications', description: 'Push notifications to Slack or Microsoft Teams when key events happen — new deployments, build failures, OTel alerts, or forum mentions. Should be configurable per-channel and per-event type.',
    authorId: 'seed-frank', authorName: 'Frank Lee', authorAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=FL',
    status: 'open',
    votes: [
      { userId: 'seed-alice', value: 1, createdAt: ago(80) }, { userId: 'seed-bob', value: 1, createdAt: ago(70) },
      { userId: 'seed-carol', value: 1, createdAt: ago(60) }, { userId: 'seed-dave', value: 1, createdAt: ago(40) },
      { userId: 'seed-eve', value: 1, createdAt: ago(20) }, { userId: 'seed-grace', value: 1, createdAt: ago(10) },
    ],
    attachments: [], tags: ['DevOps', 'Platform'], createdAt: ago(120), updatedAt: ago(10),
  },
  {
    id: 'fr4', title: 'Custom Dashboard Widget Builder', description: 'Let users create their own dashboard widgets using a visual builder or by writing custom React components. Would enable embedding Grafana panels, custom metrics, or team-specific tools.',
    authorId: 'seed-bob', authorName: 'Bob Martinez', authorAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=BM',
    status: 'in-progress',
    votes: [
      { userId: 'seed-alice', value: 1, createdAt: ago(150) }, { userId: 'seed-carol', value: 1, createdAt: ago(140) },
      { userId: 'seed-dave', value: 1, createdAt: ago(130) }, { userId: 'seed-eve', value: 1, createdAt: ago(110) },
      { userId: 'seed-frank', value: 1, createdAt: ago(90) },
    ],
    attachments: [], tags: ['Engineering', 'React'], createdAt: ago(200), updatedAt: ago(24),
  },
  {
    id: 'fr5', title: 'API Rate Limit Dashboard', description: 'A dedicated view showing API rate limit usage across all configured providers (GitHub, ADO, AI providers). Show remaining quota, reset times, and historical usage graphs.',
    authorId: 'seed-eve', authorName: 'Eve Taylor', authorAvatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=ET',
    status: 'open',
    votes: [
      { userId: 'seed-alice', value: 1, createdAt: ago(48) }, { userId: 'seed-bob', value: 1, createdAt: ago(36) },
      { userId: 'seed-frank', value: 1, createdAt: ago(24) },
    ],
    attachments: [], tags: ['Platform', 'Monitoring'], createdAt: ago(72), updatedAt: ago(24),
  },
];

// ─── Store ──────────────────────────────────────────────────────────────────
interface ForumStore {
  threads: ForumThread[];
  activeThreadId: string | null;
  sortBy: 'newest' | 'votes' | 'unanswered';
  filterCategory: ForumCategory | null;
  filterTag: string | null;

  addThread: (thread: Omit<ForumThread, 'id' | 'votes' | 'answers' | 'viewCount' | 'acceptedAnswerId' | 'createdAt' | 'updatedAt'>) => string;
  updateThread: (id: string, partial: Partial<Pick<ForumThread, 'title' | 'body' | 'category' | 'tags'>>) => void;
  removeThread: (id: string) => void;
  setActiveThread: (id: string | null) => void;
  incrementViewCount: (id: string) => void;

  addAnswer: (threadId: string, answer: Omit<ForumAnswer, 'id' | 'threadId' | 'votes' | 'isAccepted' | 'createdAt' | 'updatedAt'>) => string;
  addReplyToAnswer: (threadId: string, parentAnswerId: string, reply: Pick<ForumAnswer, 'authorId' | 'authorName' | 'authorAvatarUrl' | 'body'>) => string;
  updateAnswer: (threadId: string, answerId: string, body: string) => void;
  removeAnswer: (threadId: string, answerId: string) => void;
  acceptAnswer: (threadId: string, answerId: string) => void;

  voteThread: (threadId: string, userId: string, value: 1 | -1) => void;
  voteAnswer: (threadId: string, answerId: string, userId: string, value: 1 | -1) => void;

  setSortBy: (sort: ForumStore['sortBy']) => void;
  setFilterCategory: (cat: ForumCategory | null) => void;
  setFilterTag: (tag: string | null) => void;

  getReputation: (userId: string) => ForumUserReputation;
  getTopContributors: (limit?: number) => ForumUserReputation[];
  getSortedFilteredThreads: (searchQuery?: string) => ForumThread[];

  // Feature requests
  featureRequests: FeatureRequest[];
  addFeatureRequest: (req: Omit<FeatureRequest, 'id' | 'votes' | 'status' | 'createdAt' | 'updatedAt'>) => string;
  voteFeatureRequest: (id: string, userId: string, value: 1 | -1) => void;
  updateFeatureRequestStatus: (id: string, status: FeatureRequest['status']) => void;
  getTopFeatureRequests: (limit?: number) => FeatureRequest[];
}

function applyVote(votes: { userId: string; value: 1 | -1; createdAt: string }[], userId: string, value: 1 | -1) {
  const existing = votes.find((v) => v.userId === userId);
  if (existing) {
    if (existing.value === value) return votes.filter((v) => v.userId !== userId); // toggle off
    return votes.map((v) => v.userId === userId ? { ...v, value, createdAt: new Date().toISOString() } : v);
  }
  return [...votes, { userId, value, createdAt: new Date().toISOString() }];
}

function voteScore(votes: { value: number }[]): number {
  return votes.reduce((sum, v) => sum + v.value, 0);
}

export const useForumStore = create<ForumStore>()(
  persist(
    (set, get) => ({
      threads: seedThreads,
      activeThreadId: null,
      sortBy: 'newest',
      filterCategory: null,
      filterTag: null,

      addThread: (thread) => {
        const id = nanoid();
        const now = new Date().toISOString();
        const full: ForumThread = { ...thread, id, votes: [], answers: [], viewCount: 0, acceptedAnswerId: null, createdAt: now, updatedAt: now };
        set((s) => ({ threads: [full, ...s.threads] }));
        return id;
      },

      updateThread: (id, partial) =>
        set((s) => ({ threads: s.threads.map((t) => t.id === id ? { ...t, ...partial, updatedAt: new Date().toISOString() } : t) })),

      removeThread: (id) =>
        set((s) => ({ threads: s.threads.filter((t) => t.id !== id), activeThreadId: s.activeThreadId === id ? null : s.activeThreadId })),

      setActiveThread: (id) => set({ activeThreadId: id }),

      incrementViewCount: (id) =>
        set((s) => ({ threads: s.threads.map((t) => t.id === id ? { ...t, viewCount: t.viewCount + 1 } : t) })),

      addAnswer: (threadId, answer) => {
        const id = nanoid();
        const now = new Date().toISOString();
        const full: ForumAnswer = { ...answer, id, threadId, votes: [], isAccepted: false, createdAt: now, updatedAt: now };
        set((s) => ({
          threads: s.threads.map((t) => t.id === threadId ? { ...t, answers: [...t.answers, full], updatedAt: now } : t),
        }));
        return id;
      },

      addReplyToAnswer: (threadId, parentAnswerId, reply) => {
        const id = nanoid();
        const now = new Date().toISOString();
        const full: ForumAnswer = { ...reply, id, threadId, parentAnswerId, votes: [], isAccepted: false, createdAt: now, updatedAt: now };
        set((s) => ({
          threads: s.threads.map((t) => t.id === threadId ? { ...t, answers: [...t.answers, full], updatedAt: now } : t),
        }));
        return id;
      },

      updateAnswer: (threadId, answerId, body) =>
        set((s) => ({
          threads: s.threads.map((t) => t.id === threadId ? {
            ...t, answers: t.answers.map((a) => a.id === answerId ? { ...a, body, updatedAt: new Date().toISOString() } : a),
          } : t),
        })),

      removeAnswer: (threadId, answerId) =>
        set((s) => ({
          threads: s.threads.map((t) => t.id === threadId ? {
            ...t,
            answers: t.answers.filter((a) => a.id !== answerId),
            acceptedAnswerId: t.acceptedAnswerId === answerId ? null : t.acceptedAnswerId,
          } : t),
        })),

      acceptAnswer: (threadId, answerId) =>
        set((s) => ({
          threads: s.threads.map((t) => {
            if (t.id !== threadId) return t;
            return {
              ...t,
              acceptedAnswerId: t.acceptedAnswerId === answerId ? null : answerId,
              answers: t.answers.map((a) => ({ ...a, isAccepted: a.id === answerId ? t.acceptedAnswerId !== answerId : false })),
            };
          }),
        })),

      voteThread: (threadId, userId, value) =>
        set((s) => ({
          threads: s.threads.map((t) => t.id === threadId ? { ...t, votes: applyVote(t.votes, userId, value) } : t),
        })),

      voteAnswer: (threadId, answerId, userId, value) =>
        set((s) => ({
          threads: s.threads.map((t) => t.id === threadId ? {
            ...t, answers: t.answers.map((a) => a.id === answerId ? { ...a, votes: applyVote(a.votes, userId, value) } : a),
          } : t),
        })),

      setSortBy: (sortBy) => set({ sortBy }),
      setFilterCategory: (filterCategory) => set({ filterCategory }),
      setFilterTag: (filterTag) => set({ filterTag }),

      getReputation: (userId) => {
        const threads = get().threads;
        let points = 0;
        let questionCount = 0;
        let answerCount = 0;
        let acceptedCount = 0;
        let displayName = userId;
        let avatarUrl: string | undefined;

        for (const t of threads) {
          if (t.authorId === userId) {
            questionCount++;
            displayName = t.authorName;
            avatarUrl = t.authorAvatarUrl;
            points += t.votes.filter((v) => v.value === 1).length * 5;
          }
          for (const a of t.answers) {
            if (a.authorId === userId) {
              answerCount++;
              displayName = a.authorName;
              avatarUrl = a.authorAvatarUrl;
              points += a.votes.filter((v) => v.value === 1).length * 10;
              if (a.isAccepted) { acceptedCount++; points += 15; }
            }
          }
        }

        return { userId, displayName, avatarUrl, points, tier: getTier(points), questionCount, answerCount, acceptedCount };
      },

      getTopContributors: (limit = 10) => {
        const threads = get().threads;
        const userIds = new Set<string>();
        for (const t of threads) {
          userIds.add(t.authorId);
          for (const a of t.answers) userIds.add(a.authorId);
        }
        return [...userIds].map((id) => get().getReputation(id)).sort((a, b) => b.points - a.points).slice(0, limit);
      },

      // ─── Feature Requests ────────────────────────────────────────────────
      featureRequests: seedFeatureRequests,

      addFeatureRequest: (req) => {
        const id = nanoid();
        const now = new Date().toISOString();
        const full: FeatureRequest = { ...req, id, votes: [], status: 'open', createdAt: now, updatedAt: now };
        set((s) => ({ featureRequests: [full, ...s.featureRequests] }));
        return id;
      },

      voteFeatureRequest: (id, userId, value) =>
        set((s) => ({
          featureRequests: s.featureRequests.map((fr) =>
            fr.id === id ? { ...fr, votes: applyVote(fr.votes, userId, value) } : fr
          ),
        })),

      updateFeatureRequestStatus: (id, status) =>
        set((s) => ({
          featureRequests: s.featureRequests.map((fr) =>
            fr.id === id ? { ...fr, status, updatedAt: new Date().toISOString() } : fr
          ),
        })),

      getTopFeatureRequests: (limit = 10) => {
        return [...get().featureRequests].sort((a, b) => voteScore(b.votes) - voteScore(a.votes)).slice(0, limit);
      },

      getSortedFilteredThreads: (searchQuery) => {
        const { threads, sortBy, filterCategory, filterTag } = get();
        let result = [...threads];

        if (filterCategory) result = result.filter((t) => t.category === filterCategory);
        if (filterTag) result = result.filter((t) => t.tags.includes(filterTag));
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          result = result.filter((t) =>
            t.title.toLowerCase().includes(q) ||
            t.body.toLowerCase().includes(q) ||
            t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
            t.answers.some((a) => a.body.toLowerCase().includes(q))
          );
        }

        switch (sortBy) {
          case 'newest': result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
          case 'votes': result.sort((a, b) => voteScore(b.votes) - voteScore(a.votes)); break;
          case 'unanswered': result = result.filter((t) => t.answers.length === 0); break;
        }

        return result;
      },
    }),
    {
      name: 'devdock-forum',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ threads: s.threads, featureRequests: s.featureRequests }),
      merge: (persisted, current) => {
        const p = persisted as Partial<ForumStore> | undefined;
        const existingThreads = p?.threads ?? [];
        const threadIds = new Set(existingThreads.map((t) => t.id));
        const missingThreadSeeds = seedThreads.filter((t) => !threadIds.has(t.id));

        const existingFRs = p?.featureRequests ?? [];
        const frIds = new Set(existingFRs.map((f) => f.id));
        const missingFRSeeds = seedFeatureRequests.filter((f) => !frIds.has(f.id));

        return {
          ...current,
          threads: [...existingThreads, ...missingThreadSeeds],
          featureRequests: [...existingFRs, ...missingFRSeeds],
        };
      },
    }
  )
);
