import { useState } from 'react';
import { Button } from '../ui';
import { ForumMarkdownEditor } from './ForumMarkdownEditor';
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
      <ForumMarkdownEditor
        value={body}
        onChange={setBody}
        placeholder="Write your answer using Markdown... Include code with ```language blocks"
        minHeight={120}
      />
      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={!body.trim()}>
          Post Answer
        </Button>
      </div>
    </form>
  );
};
