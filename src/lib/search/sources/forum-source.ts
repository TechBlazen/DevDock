import type { SearchSource, SearchDocument } from '../types';
import type { ForumThread } from '../../../types';

interface ForumStoreState {
  threads: ForumThread[];
}

export function createForumSource(getState: () => ForumStoreState): SearchSource {
  return {
    category: 'forum',
    label: 'Forum',
    icon: 'MessageSquare',
    getDocuments(): SearchDocument[] {
      return getState().threads.flatMap((thread) => {
        const docs: SearchDocument[] = [{
          id: `forum:${thread.id}`,
          category: 'forum',
          title: thread.title,
          description: thread.body.slice(0, 200),
          url: `/forum/${thread.id}`,
          icon: 'MessageSquare',
          tags: thread.tags.join(' '),
          content: thread.body.slice(0, 500),
          meta: { category: thread.category, answers: String(thread.answers.length) },
        }];
        for (const answer of thread.answers) {
          docs.push({
            id: `forum:${thread.id}:${answer.id}`,
            category: 'forum',
            title: `Answer to: ${thread.title}`,
            description: answer.body.slice(0, 200),
            url: `/forum/${thread.id}`,
            icon: 'MessageSquare',
            content: answer.body.slice(0, 500),
          });
        }
        return docs;
      });
    },
  };
}
