import { describe, it, expect } from 'vitest';
import {
  validateUrl,
  parseUrl,
  detectContentType,
  getFaviconUrl,
  normalizeTags,
  formatTagsForInput,
  getIconForCollection,
  getColorForCollection,
} from '../../lib/bookmark-utils';

describe('bookmark-utils / validateUrl', () => {
  it('accepts well-formed URLs', () => {
    expect(validateUrl('https://example.com')).toBe(true);
    expect(validateUrl('http://localhost:5173/path?x=1')).toBe(true);
    expect(validateUrl('ftp://files.example.com')).toBe(true);
  });

  it('rejects invalid strings', () => {
    expect(validateUrl('not-a-url')).toBe(false);
    expect(validateUrl('')).toBe(false);
    expect(validateUrl('example.com')).toBe(false);
  });
});

describe('bookmark-utils / parseUrl', () => {
  it('returns URL object for valid input', () => {
    const url = parseUrl('https://example.com/path');
    expect(url?.hostname).toBe('example.com');
    expect(url?.pathname).toBe('/path');
  });

  it('returns null for invalid input', () => {
    expect(parseUrl('')).toBeNull();
    expect(parseUrl('garbage')).toBeNull();
  });
});

describe('bookmark-utils / detectContentType', () => {
  it('identifies video platforms', () => {
    expect(detectContentType('https://youtube.com/watch?v=abc')).toBe('video');
    expect(detectContentType('https://youtu.be/abc')).toBe('video');
    expect(detectContentType('https://vimeo.com/12345')).toBe('video');
    expect(detectContentType('https://twitch.tv/someone')).toBe('video');
  });

  it('identifies image URLs by extension', () => {
    expect(detectContentType('https://cdn.example.com/photo.png')).toBe('image');
    expect(detectContentType('https://cdn.example.com/photo.JPG')).toBe('image');
    expect(detectContentType('https://cdn.example.com/photo.webp?v=2')).toBe('image');
  });

  it('identifies document URLs by extension', () => {
    expect(detectContentType('https://s3.example.com/report.pdf')).toBe('document');
    expect(detectContentType('https://s3.example.com/report.docx')).toBe('document');
    expect(detectContentType('https://s3.example.com/sheet.xlsx')).toBe('document');
  });

  it('identifies audio platforms and extensions', () => {
    expect(detectContentType('https://soundcloud.com/artist/track')).toBe('audio');
    expect(detectContentType('https://cdn.example.com/song.mp3')).toBe('audio');
  });

  it('identifies articles by keywords', () => {
    expect(detectContentType('https://medium.com/@x/post')).toBe('article');
    expect(detectContentType('https://dev.to/x/post')).toBe('article');
    expect(detectContentType('https://blog.example.com/x')).toBe('article');
  });

  it('defaults to link for unknown content', () => {
    expect(detectContentType('https://example.com/')).toBe('link');
  });
});

describe('bookmark-utils / getFaviconUrl', () => {
  it('builds google favicon URL from hostname', () => {
    expect(getFaviconUrl('https://example.com/path')).toContain('example.com');
    expect(getFaviconUrl('https://example.com/path')).toContain('s2/favicons');
  });

  it('returns empty string for invalid URL', () => {
    expect(getFaviconUrl('not-a-url')).toBe('');
  });
});

describe('bookmark-utils / normalizeTags', () => {
  it('trims, lowercases, and dedupes', () => {
    expect(normalizeTags('Foo, BAR ,  baz , foo')).toEqual(['foo', 'bar', 'baz']);
  });

  it('drops empty entries', () => {
    expect(normalizeTags('a, ,  ,b')).toEqual(['a', 'b']);
  });

  it('handles empty input', () => {
    expect(normalizeTags('')).toEqual([]);
  });
});

describe('bookmark-utils / formatTagsForInput', () => {
  it('joins tags with commas', () => {
    expect(formatTagsForInput(['foo', 'bar'])).toBe('foo, bar');
  });
});

describe('bookmark-utils / getIconForCollection', () => {
  it('returns topic-specific icons for common names', () => {
    expect(getIconForCollection('Work Stuff')).toBe('💼');
    expect(getIconForCollection('Learning')).toBe('📚');
    expect(getIconForCollection('Code Snippets')).toBe('💻');
    expect(getIconForCollection('Design')).toBe('🎨');
  });

  it('returns the default folder icon for unknown names', () => {
    expect(getIconForCollection('Something Random')).toBe('📁');
  });
});

describe('bookmark-utils / getColorForCollection', () => {
  it('returns a valid hex color', () => {
    expect(getColorForCollection(0)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('wraps around with modulo', () => {
    expect(getColorForCollection(0)).toBe(getColorForCollection(8));
  });
});
