import { useState, useMemo } from 'react';
import { MessageSquare, Send, GitFork, GitBranch } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore, useRepoStore } from '../../store';
import { useForumStore } from '../../store/forum-store';
import { ForumMarkdownEditor } from '../forum/ForumMarkdownEditor';
import { ForumMarkdownBody } from '../forum/ForumMarkdownBody';
import { ForumVoteControl } from '../forum/ForumVoteControl';
import { Button, Pill } from '../ui';
import type { Repository } from '../../types';

interface RepoCommentSectionProps {
  repo: Repository;
}

export const RepoCommentSection = ({ repo }: RepoCommentSectionProps) => {
  const user = useAuthStore((s) => s.user);
  const updateRepoMeta = useRepoStore((s) => s.updateRepo);
  const { threads, addThread, addAnswer, voteThread, voteAnswer } = useForumStore();

  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Find or create the linked forum thread for this repo
  const thread = useMemo(() => {
    if (repo.forumThreadId) {
      return threads.find((t) => t.id === repo.forumThreadId) ?? null;
    }
    // Also try matching by repoId
    return threads.find((t) => t.repoId === repo.id) ?? null;
  }, [threads, repo.forumThreadId, repo.id]);

  const commentCount = thread ? thread.answers.length + 1 : 0; // +1 for the thread body itself if it exists

  const handlePostComment = () => {
    if (!comment.trim() || !user) return;

    if (!thread) {
      // Create a new forum thread linked to this repo
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
      // Link the thread back to the repo
      updateRepoMeta(repo.id, repo.source, { forumThreadId: threadId });
    } else {
      // Add as an answer to the existing thread
      addAnswer(thread.id, {
        authorId: user.id,
        authorName: user.displayName,
        authorAvatarUrl: user.avatarUrl,
        body: comment.trim(),
      });
    }

    setComment('');
    setShowForm(false);
  };

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

      {/* Existing comments (from linked forum thread) */}
      {thread && (
        <div className="space-y-2 mb-3">
          {/* Original thread body as first comment */}
          <div className="rounded-lg" style={{ padding: '12px 16px', background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-start gap-3">
              <ForumVoteControl
                votes={thread.votes}
                onVote={(value) => voteThread(thread.id, user?.id ?? '', value)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: '#7c3aed' }}>
                    {thread.authorName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{thread.authorName}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                    {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <ForumMarkdownBody content={thread.body} />
              </div>
            </div>
          </div>

          {/* Replies */}
          {thread.answers.map((answer) => (
            <div key={answer.id} className="rounded-lg" style={{ padding: '12px 16px', background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', marginLeft: 20 }}>
              <div className="flex items-start gap-3">
                <ForumVoteControl
                  votes={answer.votes}
                  onVote={(value) => voteAnswer(thread.id, answer.id, user?.id ?? '', value)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: 'var(--accent)' }}>
                      {answer.authorName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{answer.authorName}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                      {formatDistanceToNow(new Date(answer.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <ForumMarkdownBody content={answer.body} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment form */}
      {showForm && (
        <div className="rounded-lg" style={{ padding: '16px', background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
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
