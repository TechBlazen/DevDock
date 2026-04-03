import type { ContentType } from '../types';

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function parseUrl(urlString: string): URL | null {
  try {
    return new URL(urlString);
  } catch {
    return null;
  }
}

export function detectContentType(url: string): ContentType {
  const urlLower = url.toLowerCase();
  
  // Video platforms
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || 
      urlLower.includes('vimeo.com') || urlLower.includes('twitch.tv')) {
    return 'video';
  }
  
  // Image extensions
  if (/\.(jpg|jpeg|png|gif|webp|svg|ico)($|\?)/i.test(urlLower)) {
    return 'image';
  }
  
  // Document extensions
  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)($|\?)/i.test(urlLower)) {
    return 'document';
  }
  
  // Audio platforms & extensions
  if (urlLower.includes('soundcloud.com') || urlLower.includes('spotify.com') ||
      /\.(mp3|wav|ogg|m4a)($|\?)/i.test(urlLower)) {
    return 'audio';
  }
  
  // Check if it looks like an article (common blog/article domains)
  if (urlLower.includes('medium.com') || urlLower.includes('dev.to') || 
      urlLower.includes('blog.') || urlLower.includes('/blog/') ||
      urlLower.includes('/article/') || urlLower.includes('/post/')) {
    return 'article';
  }
  
  return 'link';
}

export function getFaviconUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=32`;
  } catch {
    return '';
  }
}

export async function fetchUrlMetadata(url: string): Promise<{
  title: string;
  description: string;
  favicon: string;
  contentType: ContentType;
} | null> {
  try {
    // In a real app, you would fetch the URL and parse meta tags
    // For demo purposes, we'll use the URL and generate basic metadata
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace('www.', '');
    
    return {
      title: hostname,
      description: url,
      favicon: getFaviconUrl(url),
      contentType: detectContentType(url),
    };
  } catch {
    return null;
  }
}

export function normalizeTags(tagString: string): string[] {
  return tagString
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0)
    .filter((tag, index, self) => self.indexOf(tag) === index); // unique
}

export function formatTagsForInput(tags: string[]): string {
  return tags.join(', ');
}

export function getIconForCollection(name: string): string {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('work') || nameLower.includes('job')) return '💼';
  if (nameLower.includes('learn') || nameLower.includes('study')) return '📚';
  if (nameLower.includes('code') || nameLower.includes('dev')) return '💻';
  if (nameLower.includes('design')) return '🎨';
  if (nameLower.includes('read')) return '📖';
  if (nameLower.includes('watch')) return '📺';
  if (nameLower.includes('recipe') || nameLower.includes('food')) return '🍳';
  if (nameLower.includes('travel')) return '✈️';
  if (nameLower.includes('music')) return '🎵';
  if (nameLower.includes('shop')) return '🛒';
  
  return '📁';
}

export function getColorForCollection(index: number): string {
  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // green
    '#06b6d4', // cyan
    '#ef4444', // red
    '#6366f1', // indigo
  ];
  return colors[index % colors.length];
}
