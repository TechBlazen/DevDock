import { useState } from 'react';
import { Plus, Search, Star, Edit, Trash2, ExternalLink, Folder, Tag, Video, Image, FileText, Music, Link as LinkIcon, FolderPlus } from 'lucide-react';
import { useAuthStore, useBookmarkStore } from '../../store';
import { BookmarkModal } from './BookmarkModal';
import { getIconForCollection, getColorForCollection } from '../../lib/bookmark-utils';
import type { Bookmark, BookmarkFilter, ContentType } from '../../types';

const CONTENT_TYPE_ICONS: Record<ContentType, any> = {
  article: FileText,
  video: Video,
  image: Image,
  audio: Music,
  document: FileText,
  link: LinkIcon,
};

export const BookmarkWidget = () => {
  const user = useAuthStore((s) => s.user);
  const {
    collections,
    getFilteredBookmarks,
    getAllTags,
    deleteBookmark,
    toggleFavorite,
    addCollection,
  } = useBookmarkStore();

  const [filter, setFilter] = useState<BookmarkFilter>({});
  const [showModal, setShowModal] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewCollection, setShowNewCollection] = useState(false);

  if (!user) return null;

  const userCollections = collections.filter((c) => c.userId === user.id);
  const filteredBookmarks = getFilteredBookmarks(user.id, filter);
  const allTags = getAllTags(user.id);

  const handleAddCollection = () => {
    if (newCollectionName.trim()) {
      const collectionId = addCollection(newCollectionName.trim(), user.id);
      const collection = collections.find(c => c.id === collectionId);
      if (collection) {
        const _index = userCollections.length;
        const _icon = getIconForCollection(newCollectionName);
        const _color = getColorForCollection(_index);
        // Update with icon and color (would need store method, simplified here)
      }
      setNewCollectionName('');
      setShowNewCollection(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this bookmark?')) {
      deleteBookmark(id);
    }
  };

  const handleEdit = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBookmark(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Bookmarks
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {filteredBookmarks.length} bookmark{filteredBookmarks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          Add Bookmark
        </button>
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ flex: '1 1 250px', position: 'relative' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search bookmarks..."
            value={filter.search ?? ''}
            onChange={(e) => setFilter({ ...filter, search: e.target.value || undefined })}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: 13,
            }}
          />
        </div>

        {/* Favorites Filter */}
        <button
          onClick={() => setFilter({ ...filter, favorite: filter.favorite ? undefined : true })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            background: filter.favorite ? 'var(--accent-bg)' : 'var(--bg-surface)',
            color: filter.favorite ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Star size={14} fill={filter.favorite ? 'var(--accent)' : 'none'} />
          Favorites
        </button>
      </div>

      {/* Collections and Tags */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}>
        {/* Left Sidebar: Collections */}
        <div
          style={{
            background: 'var(--bg-subtle)',
            borderRadius: 8,
            padding: 12,
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Collections
            </span>
            <button
              onClick={() => setShowNewCollection(!showNewCollection)}
              style={{
                background: 'none',
                border: 'none',
                padding: 4,
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              <FolderPlus size={14} />
            </button>
          </div>

          {showNewCollection && (
            <div className="mb-2">
              <input
                type="text"
                placeholder="Collection name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCollection()}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  marginBottom: 4,
                }}
              />
              <div className="flex gap-1">
                <button
                  onClick={handleAddCollection}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    borderRadius: 4,
                    border: 'none',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowNewCollection(false);
                    setNewCollectionName('');
                  }}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    borderRadius: 4,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-secondary)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setFilter({ ...filter, collectionId: undefined })}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              borderRadius: 6,
              border: 'none',
              background: !filter.collectionId ? 'var(--accent-bg)' : 'transparent',
              color: !filter.collectionId ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
              textAlign: 'left',
              marginBottom: 2,
            }}
          >
            <Folder size={14} />
            <span>All Bookmarks</span>
          </button>

          {userCollections.map((col) => (
            <button
              key={col.id}
              onClick={() => setFilter({ ...filter, collectionId: col.id })}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: 6,
                border: 'none',
                background: filter.collectionId === col.id ? 'var(--accent-bg)' : 'transparent',
                color: filter.collectionId === col.id ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 12,
                cursor: 'pointer',
                textAlign: 'left',
                marginBottom: 2,
              }}
            >
              <span>
                {col.icon || '📁'} {col.name}
              </span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>{col.bookmarkCount}</span>
            </button>
          ))}
        </div>

        {/* Right: Bookmarks List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allTags.slice(0, 10).map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    const newTags = filter.tags?.includes(tag)
                      ? filter.tags.filter((t) => t !== tag)
                      : [...(filter.tags || []), tag];
                    setFilter({ ...filter, tags: newTags.length > 0 ? newTags : undefined });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: filter.tags?.includes(tag) ? 'var(--accent-bg)' : 'var(--bg-surface)',
                    color: filter.tags?.includes(tag) ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  <Tag size={10} />
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Bookmarks */}
          {filteredBookmarks.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: 'var(--text-faint)',
                fontSize: 13,
              }}
            >
              {filter.search || filter.collectionId || filter.tags?.length || filter.favorite
                ? 'No bookmarks match your filters'
                : 'No bookmarks yet. Click "Add Bookmark" to get started!'}
            </div>
          ) : (
            filteredBookmarks.map((bookmark) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                onToggleFavorite={() => toggleFavorite(bookmark.id)}
                onEdit={() => handleEdit(bookmark)}
                onDelete={() => handleDelete(bookmark.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <BookmarkModal bookmark={editingBookmark} onClose={handleCloseModal} />
      )}
    </div>
  );
};

interface BookmarkCardProps {
  bookmark: Bookmark;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const BookmarkCard = ({ bookmark, onToggleFavorite, onEdit, onDelete }: BookmarkCardProps) => {
  const ContentIcon = CONTENT_TYPE_ICONS[bookmark.contentType];

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: 12,
        borderRadius: 8,
        border: '1px solid var(--border-color)',
        background: 'var(--bg-surface)',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
    >
      {/* Favicon */}
      <div style={{ flexShrink: 0 }}>
        {bookmark.favicon ? (
          <img
            src={bookmark.favicon}
            alt=""
            style={{ width: 20, height: 20, borderRadius: 4 }}
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        ) : (
          <ContentIcon size={20} style={{ color: 'var(--text-muted)' }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-start justify-between gap-2">
          <div style={{ flex: 1, minWidth: 0 }}>
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                textDecoration: 'none',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {bookmark.title}
            </a>
            {bookmark.description && (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  marginTop: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {bookmark.description}
              </p>
            )}
            {bookmark.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                {bookmark.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-muted)',
                      fontSize: 10,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
            <button
              onClick={onToggleFavorite}
              style={{
                background: 'none',
                border: 'none',
                padding: 4,
                cursor: 'pointer',
                color: bookmark.favorite ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              <Star size={14} fill={bookmark.favorite ? 'var(--accent)' : 'none'} />
            </button>
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'none',
                border: 'none',
                padding: 4,
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
              }}
            >
              <ExternalLink size={14} />
            </a>
            <button
              onClick={onEdit}
              style={{
                background: 'none',
                border: 'none',
                padding: 4,
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              <Edit size={14} />
            </button>
            <button
              onClick={onDelete}
              style={{
                background: 'none',
                border: 'none',
                padding: 4,
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
