import { useState, useEffect } from 'react';
import { X, Star, Loader } from 'lucide-react';
import { useAuthStore, useBookmarkStore } from '../../store';
import { validateUrl, fetchUrlMetadata, normalizeTags, formatTagsForInput } from '../../lib/bookmark-utils';
import type { Bookmark } from '../../types';

interface BookmarkModalProps {
  bookmark?: Bookmark | null;
  onClose: () => void;
}

export const BookmarkModal = ({ bookmark, onClose }: BookmarkModalProps) => {
  const user = useAuthStore((s) => s.user);
  const { addBookmark, updateBookmark, collections } = useBookmarkStore();

  const [url, setUrl] = useState(bookmark?.url ?? '');
  const [title, setTitle] = useState(bookmark?.title ?? '');
  const [description, setDescription] = useState(bookmark?.description ?? '');
  const [collectionId, setCollectionId] = useState(bookmark?.collectionId ?? '');
  const [tagsInput, setTagsInput] = useState(bookmark ? formatTagsForInput(bookmark.tags) : '');
  const [note, setNote] = useState(bookmark?.note ?? '');
  const [favorite, setFavorite] = useState(bookmark?.favorite ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const userCollections = collections.filter((c) => c.userId === user?.id);

  const handleFetchMetadata = async () => {
    if (!validateUrl(url)) {
      setError('Please enter a valid URL');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const metadata = await fetchUrlMetadata(url);
      if (metadata) {
        if (!title) setTitle(metadata.title);
        if (!description) setDescription(metadata.description);
      }
    } catch {
      setError('Failed to fetch URL metadata');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (url && !bookmark && !title) {
      handleFetchMetadata();
    }
  }, [url]);

  const handleSave = () => {
    if (!user) return;

    if (!validateUrl(url)) {
      setError('Please enter a valid URL');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    const tags = normalizeTags(tagsInput);

    if (bookmark) {
      updateBookmark(bookmark.id, {
        url,
        title: title.trim(),
        description: description.trim() || undefined,
        collectionId: collectionId || undefined,
        tags,
        note: note.trim() || undefined,
        favorite,
      });
    } else {
      addBookmark({
        userId: user.id,
        url,
        title: title.trim(),
        description: description.trim() || undefined,
        collectionId: collectionId || undefined,
        tags,
        note: note.trim() || undefined,
        favorite,
        contentType: 'link',
      });
    }

    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          width: '90%',
          maxWidth: 600,
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 24,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {bookmark ? 'Edit Bookmark' : 'Add Bookmark'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: '#dc262620',
              color: '#dc2626',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* URL */}
        <div className="mb-4">
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            URL *
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={handleFetchMetadata}
            placeholder="https://example.com"
            disabled={!!bookmark}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: bookmark ? 'var(--bg-subtle)' : 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: 14,
            }}
          />
        </div>

        {/* Title */}
        <div className="mb-4">
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page title"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: 14,
            }}
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description"
            rows={2}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: 14,
              resize: 'vertical',
            }}
          />
        </div>

        {/* Collection */}
        <div className="mb-4">
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Collection
          </label>
          <select
            value={collectionId}
            onChange={(e) => setCollectionId(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: 14,
            }}
          >
            <option value="">Unsorted</option>
            {userCollections.map((col) => (
              <option key={col.id} value={col.id}>
                {col.icon ? `${col.icon} ` : ''}{col.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div className="mb-4">
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Tags
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="work, important, to-read (comma-separated)"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: 14,
            }}
          />
        </div>

        {/* Note */}
        <div className="mb-4">
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Note
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Personal notes (supports markdown)"
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: 14,
              resize: 'vertical',
            }}
          />
        </div>

        {/* Favorite */}
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={favorite}
              onChange={(e) => setFavorite(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <Star size={16} fill={favorite ? 'var(--accent)' : 'none'} color={favorite ? 'var(--accent)' : 'var(--text-muted)'} />
            <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>Mark as favorite</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading && <Loader size={16} className="animate-spin" />}
            {bookmark ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
