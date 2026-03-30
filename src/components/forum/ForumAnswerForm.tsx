import { useState } from 'react';
import { Button } from '../ui';
import { useForumStore } from '../../store';
import { useAuthStore } from '../../store';

interface ForumAnswerFormProps {
  threadId: string;
}

export const ForumAnswerForm = ({ threadId }: ForumAnswerFormProps) => {
  const [body, setBody] = useState('');
  const addAnswer = useForumStore((s) => s.addAnswer);
  const user = useAuthStore((s) => s.user);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !user) return;

    addAnswer(threadId, {
      authorId: user.id,
      authorName: user.displayName,
      authorAvatarUrl: user.avatarUrl,
      body: body.trim(),
    });

    setBody('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your answer..."
        className="w-full rounded-md px-3 py-2 text-[13px] outline-none transition-all duration-200 resize-y"
        style={{
          minHeight: 100,
          background: 'var(--bg-input)',
          border: '1px solid var(--border-input)',
          color: 'var(--text-primary)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.border = '1px solid var(--accent)';
          e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-bg)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.border = '1px solid var(--border-input)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={!body.trim()}>
          Post Answer
        </Button>
      </div>
    </form>
  );
};
