import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MessageSquareText } from 'lucide-react';
import { Button, SectionTitle, EmptyState } from '../ui';
import { ForumSortBar } from './ForumSortBar';
import { ForumCategoryFilter } from './ForumCategoryFilter';
import { ForumThreadCard } from './ForumThreadCard';
import { ForumTopContributors } from './ForumTopContributors';
import { ForumTopFeatureRequests } from './ForumTopFeatureRequests';
import { ForumAskModal } from './ForumAskModal';
import { FeatureRequestModal } from './FeatureRequestModal';
import { useForumStore } from '../../store';

export const ForumListView = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [askModalOpen, setAskModalOpen] = useState(false);
  const [featureModalOpen, setFeatureModalOpen] = useState(false);

  const sortBy = useForumStore((s) => s.sortBy);
  const filterCategory = useForumStore((s) => s.filterCategory);
  const filterTag = useForumStore((s) => s.filterTag);
  const setSortBy = useForumStore((s) => s.setSortBy);
  const setFilterCategory = useForumStore((s) => s.setFilterCategory);
  const setFilterTag = useForumStore((s) => s.setFilterTag);
  const getSortedFilteredThreads = useForumStore((s) => s.getSortedFilteredThreads);

  const threads = getSortedFilteredThreads(searchQuery);

  return (
    <>
      <SectionTitle sub="Ask questions, share knowledge, and collaborate with your team.">
        Community Forum
      </SectionTitle>

      {/* Action bar */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="primary" onClick={() => setAskModalOpen(true)}>
            <Plus size={15} />
            Ask Question
          </Button>

          <div className="flex-1 min-w-[200px] max-w-sm relative">
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-faint)',
                pointerEvents: 'none',
              }}
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search threads..."
              className="w-full rounded-md pl-8 pr-3 py-1.5 text-[13px] outline-none transition-all duration-200"
              style={{
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
          </div>

          <ForumSortBar value={sortBy} onChange={setSortBy} />
        </div>

        <ForumCategoryFilter
          activeCategory={filterCategory}
          onCategoryChange={setFilterCategory}
          activeTag={filterTag}
          onTagChange={setFilterTag}
        />
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* Thread list */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {threads.length === 0 ? (
            <EmptyState
              icon={<MessageSquareText size={40} />}
              title="No threads found"
              body="Try adjusting your search or filters, or ask a new question."
            />
          ) : (
            threads.map((thread) => (
              <ForumThreadCard
                key={thread.id}
                thread={thread}
                onClick={() => navigate(`/forum/${thread.id}`)}
              />
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="w-[280px] shrink-0 hidden lg:flex flex-col gap-5">
          <ForumTopFeatureRequests onSubmitClick={() => setFeatureModalOpen(true)} />
          <ForumTopContributors />
        </div>
      </div>

      <ForumAskModal isOpen={askModalOpen} onClose={() => setAskModalOpen(false)} />
      <FeatureRequestModal isOpen={featureModalOpen} onClose={() => setFeatureModalOpen(false)} />
    </>
  );
};
