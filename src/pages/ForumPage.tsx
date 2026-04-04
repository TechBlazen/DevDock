import { useParams } from 'react-router-dom';
import { ForumListView } from '../components/forum/ForumListView';
import { ForumThreadView } from '../components/forum/ForumThreadView';
import { FeatureRequestsListView } from '../components/forum/FeatureRequestsListView';

export const ForumPage = () => {
  const { threadId, view } = useParams<{ threadId?: string; view?: string }>();

  return (
    <div className="p-6">
      {threadId ? (
        <ForumThreadView threadId={threadId} />
      ) : view === 'feature-requests' ? (
        <FeatureRequestsListView />
      ) : (
        <ForumListView />
      )}
    </div>
  );
};
