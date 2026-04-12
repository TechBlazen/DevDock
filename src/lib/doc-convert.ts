import mammoth from 'mammoth';

/**
 * Read a file and return its text content as markdown.
 * Supports: .md, .txt, .docx, .pdf
 */
export async function fileToMarkdown(file: File): Promise<{ title: string; content: string }> {
  const name = file.name.replace(/\.[^.]+$/, '');
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  switch (ext) {
    case 'md':
    case 'txt':
      return { title: name, content: await file.text() };
    case 'docx':
      return { title: name, content: await convertDocx(file) };
    case 'pdf':
      return { title: name, content: await convertPdf(file) };
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}

async function convertDocx(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buffer });
  return htmlToMarkdown(html);
}

async function convertPdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  // Use bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    if (text.trim()) pages.push(text.trim());
  }

  return `# ${file.name.replace(/\.pdf$/i, '')}\n\n${pages.join('\n\n')}`;
}

/** Simple HTML → Markdown converter for mammoth output */
function htmlToMarkdown(html: string): string {
  return html
    // Headings
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    // Bold / italic
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    // Links
    .replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    // Lists
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    // Paragraphs and breaks
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Code
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```\n\n')
    // Blockquotes
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
    // Tables (basic)
    .replace(/<table[^>]*>(.*?)<\/table>/gis, (_, inner) => {
      const rows = inner.match(/<tr[^>]*>.*?<\/tr>/gis) || [];
      return rows.map((row: string) => {
        const cells = (row.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis) || [])
          .map((c: string) => c.replace(/<\/?t[hd][^>]*>/gi, '').trim());
        return '| ' + cells.join(' | ') + ' |';
      }).join('\n') + '\n\n';
    })
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Accepted file extensions for the drop zone */
export const ACCEPTED_EXTENSIONS = ['.md', '.txt', '.docx', '.pdf'];
export const ACCEPTED_MIME_TYPES = [
  'text/markdown',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
];
