import { useState, useMemo, useCallback } from 'react';
import { MessageSquare, Send, Reply, GitFork, GitBranch } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore, useRepoStore } from '../../store';
import { useForumStore } from '../../store/forum-store';
import { ForumMarkdownEditor } from '../forum/ForumMarkdownEditor';
import { ForumMarkdownBody } from '../forum/ForumMarkdownBody';
import { Button, Pill } from '../ui';
import type { Repository, ForumAnswer } from '../../types';

interface RepoCommentSectionProps {
  repo: Repository;
}

// ─── Tree helpers ───────────────────────────────────────────────────────────
/** Build a map of parentAnswerId → child answers */
function buildChildMap(answers: ForumAnswer[]): Map<string | undefined, ForumAnswer[]> {
  const map = new Map<string | undefined, ForumAnswer[]>();
  for (const a of answers) {
    const key = a.parentAnswerId ?? undefined;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return map;
}

// ─── Single comment node (recursive) ────────────────────────────────────────
interface CommentNodeProps {
  answer: ForumAnswer;
  threadId: string;
  childMap: Map<string | undefined, ForumAnswer[]>;
  depth: number;
  isLast: boolean;
  onReply: (answerId: string) => void;
  replyTarget: string | null;
  replyText: string;
  setReplyText: (v: string) => void;
  onSubmitReply: () => void;
  onCancelReply: () => void;
}

const CommentNode = ({
  answer, threadId, childMap, depth, isLast,
  onReply, replyTarget, replyText, setReplyText, onSubmitReply, onCancelReply,
}: CommentNodeProps) => {
  const user = useAuthStore((s) => s.user);
  const { voteAnswer } = useForumStore();
  const children = childMap.get(answer.id) ?? [];

  const score = answer.votes.reduce((sum, v) => sum + v.value, 0);
  const isReplying = replyTarget === answer.id;

  return (
    <div className="relative" style={{ paddingLeft: depth > 0 ? 24 : 0 }}>
      {/* Vertical tree line from parent */}
      {depth > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 8,
            top: 0,
            bottom: isLast && children.length === 0 ? 'calc(100% - 18px)' : 0,
            width: 2,
            background: 'var(--border-subtle)',
          }}
        />
      )}

      {/* Horizontal branch connector */}
      {depth > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 8,
            top: 18,
            width: 14,
            height: 2,
            background: 'var(--border-subtle)',
          }}
        />
      )}

      {/* Comment content */}
      <div
        className="relative py-2 group"
        style={{
          borderBottom: depth === 0 ? '1px solid var(--border-subtle)' : 'none',
        }}
      >
        <div className="flex items-start gap-2.5">
          {/* Compact inline vote */}
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); voteAnswer(threadId, answer.id, user?.id ?? '', 1); }}
              className="w-5 h-5 flex items-center justify-center rounded transition-colors cursor-pointer"
              style={{
                color: answer.votes.find(v => v.userId === user?.id)?.value === 1 ? 'var(--accent)' : 'var(--text-faint)',
                background: 'transparent',
                border: 'none',
              }}
              title="Upvote"
            >
              ▲
            </button>
            <span
              className="text-[10px] font-bold tabular-nums"
              style={{
                color: score > 0 ? '#22c55e' : score < 0 ? '#ef4444' : 'var(--text-faint)',
                minWidth: 14,
                textAlign: 'center',
              }}
            >
              {score}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); voteAnswer(threadId, answer.id, user?.id ?? '', -1); }}
              className="w-5 h-5 flex items-center justify-center rounded transition-colors cursor-pointer"
              style={{
                color: answer.votes.find(v => v.userId === user?.id)?.value === -1 ? '#ef4444' : 'var(--text-faint)',
                background: 'transparent',
                border: 'none',
              }}
              title="Downvote"
            >
              ▼
            </button>
          </div>

          {/* Avatar */}
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
            style={{ background: depth === 0 ? '#7c3aed' : 'var(--accent)' }}
          >
            {answer.authorName.charAt(0).toUpperCase()}
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {answer.authorName}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                {formatDistanceToNow(new Date(answer.createdAt), { addSuffix: true })}
              </span>
            </div>
            <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              <ForumMarkdownBody content={answer.body} />
            </div>

            {/* Reply button */}
            <button
              className="flex items-center gap-1 mt-1 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              style={{ color: '#7c3aed', background: 'none', border: 'none', padding: 0 }}
              onClick={(e) => { e.stopPropagation(); onReply(answer.id); }}
            >
              <Reply size={10} /> Reply
            </button>
          </div>
        </div>

        {/* Inline reply form */}
        {isReplying && (
          <div className="mt-2 ml-[52px]" style={{ borderLeft: '2px solid #7c3aed', paddingLeft: 12 }}>
            <ForumMarkdownEditor
              value={replyText}
              onChange={setReplyText}
              placeholder="Write a reply..."
              minHeight={60}
            />
            <div className="flex gap-2 mt-2">
              <Button variant="primary" size="sm" onClick={onSubmitReply} disabled={!replyText.trim()}>
                <Send size={10} /> Reply
              </Button>
              <Button variant="ghost" size="sm" onClick={onCancelReply}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Render children recursively */}
      {children.length > 0 && (
        <div className="relative">
          {children.map((child, idx) => (
            <CommentNode
              key={child.id}
              answer={child}
              threadId={threadId}
              childMap={childMap}
              depth={depth + 1}
              isLast={idx === children.length - 1}
              onReply={onReply}
              replyTarget={replyTarget}
              replyText={replyText}
              setReplyText={setReplyText}
              onSubmitReply={onSubmitReply}
              onCancelReply={onCancelReply}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main component ─────────────────────────────────────────────────────────
export const RepoCommentSection = ({ repo }: RepoCommentSectionProps) => {
  const user = useAuthStore((s) => s.user);
  const updateRepoMeta = useRepoStore((s) => s.updateRepo);
  const { threads, addThread, addAnswer, addReplyToAnswer, voteThread } = useForumStore();

  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Find or create the linked forum thread for this repo
  const thread = useMemo(() => {
    if (repo.forumThreadId) {
      return threads.find((t) => t.id === repo.forumThreadId) ?? null;
    }
    return threads.find((t) => t.repoId === repo.id) ?? null;
  }, [threads, repo.forumThreadId, repo.id]);

  // Build tree structure from flat answers
  const childMap = useMemo(() => {
    if (!thread) return new Map<string | undefined, ForumAnswer[]>();
    return buildChildMap(thread.answers);
  }, [thread]);

  // Top-level answers (no parent)
  const topLevelAnswers = useMemo(() => {
    return childMap.get(undefined) ?? [];
  }, [childMap]);

  const commentCount = thread ? thread.answers.length + 1 : 0;

  const handlePostComment = useCallback(() => {
    if (!comment.trim() || !user) return;

    if (!thread) {
      const threadId = addThread({
        title: `Discussion: ${repo.name}`,
        body: comment.trim(),
        category: 'repo-comment',
        tags: [repo.source === 'github' ? 'GitHub' : 'Azure DevOps', repo.language, repo.name].filter(Boolean),
        authorId: user.id,
        authorName: user.displayName,
        authorAvatarUrl: user.avatarUrl,
        repoId: repo.id,
        repoName: repo.name,
        repoSource: repo.source,
      });
      updateRepoMeta(repo.id, repo.source, { forumThreadId: threadId });
    } else {
      addAnswer(thread.id, {
        authorId: user.id,
        authorName: user.displayName,
        authorAvatarUrl: user.avatarUrl,
        body: comment.trim(),
      });
    }

    setComment('');
    setShowForm(false);
  }, [comment, user, thread, repo, addThread, addAnswer, updateRepoMeta]);

  const handleReply = useCallback((answerId: string) => {
    setReplyTarget(answerId);
    setReplyText('');
  }, []);

  const handleSubmitReply = useCallback(() => {
    if (!replyText.trim() || !user || !thread || !replyTarget) return;
    addReplyToAnswer(thread.id, replyTarget, {
      authorId: user.id,
      authorName: user.displayName,
      authorAvatarUrl: user.avatarUrl,
      body: replyText.trim(),
    });
    setReplyTarget(null);
    setReplyText('');
  }, [replyText, user, thread, replyTarget, addReplyToAnswer]);

  const handleCancelReply = useCallback(() => {
    setReplyTarget(null);
    setReplyText('');
  }, []);

  return (
    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }} onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} style={{ color: '#7c3aed' }} />
          <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>
            Comments
          </span>
          {commentCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#7c3aed15', color: '#7c3aed' }}>
              {commentCount}
            </span>
          )}
        </div>
        {!showForm && (
          <Button variant="ghost" size="sm" onClick={() => setShowForm(true)}>
            <MessageSquare size={11} /> Add Comment
          </Button>
        )}
      </div>

      {/* Threaded comment tree */}
      {thread && (
        <div className="mb-3">
          {/* Original thread body as root comment */}
          <div className="relative py-2 group" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="flex items-start gap-2.5">
              {/* Compact inline vote for thread */}
              <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                <button
                  onClick={(e) => { e.stopPropagation(); voteThread(thread.id, user?.id ?? '', 1); }}
                  className="w-5 h-5 flex items-center justify-center rounded transition-colors cursor-pointer"
                  style={{
                    color: thread.votes.find(v => v.userId === user?.id)?.value === 1 ? 'var(--accent)' : 'var(--text-faint)',
                    background: 'transparent',
                    border: 'none',
                  }}
                  title="Upvote"
                >
                  ▲
                </button>
                <span
                  className="text-[10px] font-bold tabular-nums"
                  style={{
                    color: (() => { const s = thread.votes.reduce((sum, v) => sum + v.value, 0); return s > 0 ? '#22c55e' : s < 0 ? '#ef4444' : 'var(--text-faint)'; })(),
                    minWidth: 14,
                    textAlign: 'center',
                  }}
                >
                  {thread.votes.reduce((sum, v) => sum + v.value, 0)}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); voteThread(thread.id, user?.id ?? '', -1); }}
                  className="w-5 h-5 flex items-center justify-center rounded transition-colors cursor-pointer"
                  style={{
                    color: thread.votes.find(v => v.userId === user?.id)?.value === -1 ? '#ef4444' : 'var(--text-faint)',
                    background: 'transparent',
                    border: 'none',
                  }}
                  title="Downvote"
                >
                  ▼
                </button>
              </div>

              {/* Avatar */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                style={{ background: '#7c3aed' }}
              >
                {thread.authorName.charAt(0).toUpperCase()}
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {thread.authorName}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                    {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  <ForumMarkdownBody content={thread.body} />
                </div>
              </div>
            </div>
          </div>

          {/* Replies tree */}
          {topLevelAnswers.length > 0 && (
            <div className="relative mt-1">
              {/* Continuous vertical trunk line */}
              <div
                style={{
                  position: 'absolute',
                  left: 8,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: 'var(--border-subtle)',
                }}
              />
              {topLevelAnswers.map((answer, idx) => (
                <CommentNode
                  key={answer.id}
                  answer={answer}
                  threadId={thread.id}
                  childMap={childMap}
                  depth={1}
                  isLast={idx === topLevelAnswers.length - 1}
                  onReply={handleReply}
                  replyTarget={replyTarget}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  onSubmitReply={handleSubmitReply}
                  onCancelReply={handleCancelReply}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comment form */}
      {showForm && (
        <div className="rounded-lg" style={{ padding: '16px', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2 mb-3">
            {user && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: '#7c3aed' }}>
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Add a comment</span>
            <Pill color="#7c3aed">
              {repo.source === 'github' ? <GitFork size={8} className="inline mr-0.5" /> : <GitBranch size={8} className="inline mr-0.5" />}
              {repo.name}
            </Pill>
          </div>

          <ForumMarkdownEditor
            value={comment}
            onChange={setComment}
            placeholder="Add your comment here... Markdown is supported."
            minHeight={100}
          />

          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
              Comments are visible in the Community Forum
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setComment(''); }}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handlePostComment} disabled={!comment.trim()}>
                <Send size={11} /> Comment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Link to full thread in forum */}
      {thread && !showForm && (
        <a
          href={`#/forum/thread/${thread.id}`}
          className="flex items-center gap-1.5 text-[10px] font-medium mt-2 transition-opacity hover:opacity-80"
          style={{ color: '#7c3aed', textDecoration: 'none' }}
          onClick={(e) => e.stopPropagation()}
        >
          <MessageSquare size={10} />
          View full discussion in Community Forum
        </a>
      )}
    </div>
  );
};
