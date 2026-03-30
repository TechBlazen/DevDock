import { useParams } from 'react-router-dom';
import { ForumListView } from '../components/forum/ForumListView';
import { ForumThreadView } from '../components/forum/ForumThreadView';

export const ForumPage = () => {
  const { threadId } = useParams<{ threadId: string }>();

  return (
    <div className="p-6">
      {threadId ? <ForumThreadView threadId={threadId} /> : <ForumListView />}
    </div>
  );
};
