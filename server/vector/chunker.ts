// ─── Document chunker ───────────────────────────────────────────────────────
// Vector search degrades sharply on long documents — a 10KB README embedded
// as a single 768-dim vector dilutes the signal so badly that semantic search
// loses to keyword search. Splitting into ~500-word chunks with 50-word
// overlap is the standard remedy.
//
// We try to split on Markdown headings first so each chunk corresponds to a
// coherent section. If a section is too long, fall back to a sliding window.

const TARGET_WORDS = 500;
const OVERLAP_WORDS = 50;
const HEADING_RE = /^(#{1,3})\s+(.*)$/m;

export interface Chunk {
  /** 0-indexed position within the source document. */
  index: number;
  /** Inclusive heading path so the user knows where in the doc this came from. */
  heading: string | null;
  /** The chunk text itself, ready to embed. */
  text: string;
}

export function chunk(source: string, title?: string): Chunk[] {
  const text = source.trim();
  if (!text) return [];

  const sections = splitOnHeadings(text);

  // Single un-headed section + short overall: keep as one chunk so tiny docs
  // don't fragment into noise.
  if (sections.length === 1 && sections[0].heading === null && countWords(text) <= TARGET_WORDS) {
    return [{ index: 0, heading: title ?? null, text }];
  }

  const out: Chunk[] = [];
  let index = 0;
  for (const section of sections) {
    const sectionHeading = section.heading ?? title ?? null;
    if (countWords(section.body) <= TARGET_WORDS) {
      out.push({ index: index++, heading: sectionHeading, text: section.body });
    } else {
      // Section is itself too long — slide a window over it.
      for (const piece of slidingWindow(section.body)) {
        out.push({ index: index++, heading: sectionHeading, text: piece });
      }
    }
  }
  return out;
}

interface Section { heading: string | null; body: string; }

function splitOnHeadings(text: string): Section[] {
  const lines = text.split('\n');
  const sections: Section[] = [];
  let current: Section = { heading: null, body: '' };

  for (const line of lines) {
    const m = HEADING_RE.exec(line);
    if (m) {
      if (current.body.trim().length > 0) {
        sections.push({ heading: current.heading, body: current.body.trim() });
      }
      current = { heading: m[2].trim(), body: '' };
    } else {
      current.body += line + '\n';
    }
  }
  if (current.body.trim().length > 0) {
    sections.push({ heading: current.heading, body: current.body.trim() });
  }
  return sections.length > 0 ? sections : [{ heading: null, body: text }];
}

function slidingWindow(text: string): string[] {
  const words = text.split(/\s+/);
  const pieces: string[] = [];
  const step = TARGET_WORDS - OVERLAP_WORDS;
  for (let i = 0; i < words.length; i += step) {
    const slice = words.slice(i, i + TARGET_WORDS);
    if (slice.length === 0) break;
    pieces.push(slice.join(' '));
    if (i + TARGET_WORDS >= words.length) break;
  }
  return pieces;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}
