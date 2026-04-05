import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Check, ThumbsUp, Award, GitFork, GitBranch } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button, Card } from '../ui';
import { ForumVoteControl } from './ForumVoteControl';
import { ForumTagPill } from './ForumTagPill';
import { ForumReputationBadge } from './ForumReputationBadge';
import { ForumMarkdownBody } from './ForumMarkdownBody';
import { ForumAnswerForm } from './ForumAnswerForm';
import { useForumStore } from '../../store';
import { useAuthStore } from '../../store';
import { getCategoryColor, getCategoryLabel } from '../../lib/forum-constants';
import type { ForumAnswer } from '../../types';

interface ForumThreadViewProps {
  threadId: string;
}

export const ForumThreadView = ({ threadId }: ForumThreadViewProps) => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';

  const threads = useForumStore((s) => s.threads);
  const voteThread = useForumStore((s) => s.voteThread);
  const voteAnswer = useForumStore((s) => s.voteAnswer);
  const acceptAnswer = useForumStore((s) => s.acceptAnswer);
  const incrementViewCount = useForumStore((s) => s.incrementViewCount);
  const getReputation = useForumStore((s) => s.getReputation);

  const thread = threads.find((t) => t.id === threadId);

  useEffect(() => {
    incrementViewCount(threadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const sortedAnswers = useMemo(() => {
    if (!thread) return [];
    const accepted: ForumAnswer[] = [];
    const rest: ForumAnswer[] = [];
    for (const a of thread.answers) {
      if (a.isAccepted) accepted.push(a);
      else rest.push(a);
    }
    rest.sort(
      (a, b) =>
        b.votes.reduce((s, v) => s + v.value, 0) -
        a.votes.reduce((s, v) => s + v.value, 0)
    );
    return [...accepted, ...rest];
  }, [thread]);

  if (!thread) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Thread not found.</p>
        <Button variant="ghost" className="mt-3" onClick={() => navigate('/forum')}>
          <ArrowLeft size={14} /> Back to Forum
        </Button>
      </div>
    );
  }

  const authorRep = getReputation(thread.authorId);
  const isThreadAuthor = userId === thread.authorId;

  return (
    <div className="flex flex-col gap-5">
      {/* Back button */}
      <button
        onClick={() => navigate('/forum')}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors hover:opacity-80 cursor-pointer"
        style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', padding: 0 }}
      >
        <ArrowLeft size={15} />
        Back to Forum
      </button>

      {/* Thread */}
      <Card className="p-5">
        <div className="flex gap-4">
          {/* Vote control */}
          <ForumVoteControl
            votes={thread.votes}
            onVote={(value) => voteThread(thread.id, userId, value)}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h1
              className="text-lg font-bold leading-snug"
              style={{ color: 'var(--text-primary)' }}
            >
              {thread.title}
            </h1>

            {/* Repo badge (for repo-comment threads) */}
            {thread.repoName && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: '#7c3aed12', color: '#7c3aed', border: '1px solid #7c3aed30' }}>
                  {thread.repoSource === 'github' ? <GitFork size={11} /> : <GitBranch size={11} />}
                  {thread.repoName}
                </span>
              </div>
            )}

            {/* Tags */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <ForumTagPill
                tag={getCategoryLabel(thread.category)}
                color={getCategoryColor(thread.category)}
              />
              {thread.tags.map((tag) => (
                <ForumTagPill key={tag} tag={tag} />
              ))}
            </div>

            {/* Author + meta */}
            <div className="flex items-center gap-2 mt-3">
              {thread.authorAvatarUrl ? (
                <img
                  src={thread.authorAvatarUrl}
                  alt={thread.authorName}
                  className="rounded-full shrink-0"
                  style={{ width: 24, height: 24 }}
                />
              ) : (
                <div
                  className="rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold"
                  style={{ width: 24, height: 24, background: 'var(--accent-bg)', color: 'var(--accent)' }}
                >
                  {thread.authorName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                {thread.authorName}
              </span>
              <ForumReputationBadge tier={authorRep.tier} points={authorRep.points} size="sm" />
              <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
              </span>
              <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-faint)' }}>
                <Eye size={12} />
                {thread.viewCount}
              </span>
            </div>

            {/* Body */}
            <div className="mt-4">
              <ForumMarkdownBody content={thread.body} />
            </div>
          </div>
        </div>
      </Card>

      {/* Answers header */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {thread.answers.length} {thread.answers.length === 1 ? 'Answer' : 'Answers'}
        </h2>
        <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
          sorted by votes
        </span>
        <span
          className="ml-auto flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full"
          style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
        >
          <ThumbsUp size={10} />
          Vote on answers to help the best rise to the top
        </span>
      </div>

      {/* Answers */}
      {sortedAnswers.map((answer) => {
        const answerRep = getReputation(answer.authorId);

        return (
          <Card
            key={answer.id}
            className="p-5"
            highlight={false}
          >
            <div
              style={{
                borderLeft: answer.isAccepted ? '3px solid #2e7d32' : undefined,
                paddingLeft: answer.isAccepted ? 16 : undefined,
              }}
            >
              <div className="flex gap-4">
                {/* Vote control */}
                <ForumVoteControl
                  votes={answer.votes}
                  onVote={(value) => voteAnswer(thread.id, answer.id, userId, value)}
                  label="Rate"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Author info + accept */}
                  <div className="flex items-center gap-2 mb-3">
                    {answer.authorAvatarUrl ? (
                      <img
                        src={answer.authorAvatarUrl}
                        alt={answer.authorName}
                        className="rounded-full shrink-0"
                        style={{ width: 22, height: 22 }}
                      />
                    ) : (
                      <div
                        className="rounded-full shrink-0 flex items-center justify-center text-[9px] font-semibold"
                        style={{ width: 22, height: 22, background: 'var(--accent-bg)', color: 'var(--accent)' }}
                      >
                        {answer.authorName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {answer.authorName}
                    </span>
                    <ForumReputationBadge tier={answerRep.tier} points={answerRep.points} size="sm" />
                    <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                      {formatDistanceToNow(new Date(answer.createdAt), { addSuffix: true })}
                    </span>

                    {/* Accept button - visible to thread author */}
                    {isThreadAuthor && (
                      <button
                        onClick={() => acceptAnswer(thread.id, answer.id)}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                        style={{
                          color: answer.isAccepted ? '#fff' : '#2e7d32',
                          background: answer.isAccepted ? '#2e7d32' : '#2e7d3210',
                          border: answer.isAccepted ? '1px solid #2e7d32' : '1px solid #2e7d3240',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                        title={answer.isAccepted ? 'Click to unaccept' : 'Accept this answer (+15 rep to author)'}
                      >
                        <Check size={14} />
                        {answer.isAccepted ? 'Accepted' : 'Accept'}
                      </button>
                    )}

                    {/* Accepted badge - visible to everyone when accepted and not the author */}
                    {!isThreadAuthor && answer.isAccepted && (
                      <span
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                        style={{ color: '#2e7d32', background: '#2e7d3215', border: '1px solid #2e7d3230' }}
                      >
                        <Award size={14} />
                        Accepted Answer
                      </span>
                    )}
                  </div>

                  {/* Answer body */}
                  <ForumMarkdownBody content={answer.body} />

                  {/* Reputation hint */}
                  <div className="mt-3 flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-faint)' }}>
                    <ThumbsUp size={10} />
                    Upvotes earn the author +10 reputation
                    {answer.isAccepted && <span style={{ color: '#2e7d32' }}> · Accepted +15 bonus</span>}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Answer form */}
      <Card className="p-5">
        <h3
          className="text-sm font-semibold mb-3"
          style={{ color: 'var(--text-primary)' }}
        >
          Your Answer
        </h3>
        <ForumAnswerForm threadId={threadId} />
      </Card>
    </div>
  );
};
