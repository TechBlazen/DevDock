import { describe, expect, it } from 'vitest';
import { chunk } from '../chunker.js';

describe('chunker', () => {
  it('returns a single chunk for short text', () => {
    const chunks = chunk('Hello world, just a small doc.', 'Hi');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].heading).toBe('Hi');
    expect(chunks[0].index).toBe(0);
    expect(chunks[0].text).toContain('small doc');
  });

  it('returns nothing for empty input', () => {
    expect(chunk('')).toEqual([]);
    expect(chunk('   \n  \n')).toEqual([]);
  });

  it('splits on Markdown headings when content is long', () => {
    const big = (n: number) => Array(n).fill('word').join(' ');
    const md = `# Intro\n${big(50)}\n\n## Setup\n${big(50)}\n\n## Usage\n${big(50)}`;
    const chunks = chunk(md, 'README');
    // Three sections, each shorter than the 500-word window.
    expect(chunks.map((c) => c.heading)).toEqual(['Intro', 'Setup', 'Usage']);
  });

  it('uses a sliding window when a section exceeds the target', () => {
    const big = Array(1500).fill('word').join(' ');
    const chunks = chunk(`# Long Section\n${big}`, 'Doc');
    // 1500 words / (500 - 50 step) ≈ 4 chunks
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.every((c) => c.heading === 'Long Section')).toBe(true);
    // Indexes are sequential.
    expect(chunks.map((c) => c.index)).toEqual(chunks.map((_, i) => i));
  });

  it('falls back to a single section when there are no headings', () => {
    const text = Array(100).fill('hello').join(' ');
    const chunks = chunk(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].heading).toBeNull();
  });
});
