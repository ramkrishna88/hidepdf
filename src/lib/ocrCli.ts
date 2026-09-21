import fs from 'node:fs';
import { createWorker } from 'tesseract.js';

const imagePath = process.argv[2];
const pageWidth = Number(process.argv[3]);
const pageHeight = Number(process.argv[4]);
const scale = Number(process.argv[5]);

if (!imagePath) {
  process.stderr.write('ocrCli requires an image path\n');
  process.exit(1);
}

const worker = await createWorker('eng', 1, { logger: () => undefined });
try {
  const { data } = await worker.recognize(fs.readFileSync(imagePath), {}, {
    text: true,
    tsv: true,
    blocks: true,
    hocr: true
  });
  const words = pageWords(data);
  const items = words.flatMap((word) => {
    const text = word.text.trim();
    if (!text) return [];
    return [{
      str: text,
      x: word.x0 / scale,
      y: pageHeight - word.y1 / scale,
      width: Math.max(4, (word.x1 - word.x0) / scale),
      height: Math.max(6, (word.y1 - word.y0) / scale)
    }];
  });
  process.stdout.write(JSON.stringify(items));
} finally {
  await worker.terminate();
}

type WordBox = { text: string; x0: number; y0: number; x1: number; y1: number };

function pageWords(data: unknown): WordBox[] {
  const page = data as {
    words?: Array<{ text?: string; bbox: { x0: number; y0: number; x1: number; y1: number } }>;
    blocks?: Array<{
      paragraphs?: Array<{
        lines?: Array<{
          words?: Array<{ text?: string; bbox: { x0: number; y0: number; x1: number; y1: number } }>;
        }>;
      }>;
    }>;
    tsv?: string | null;
    hocr?: string | null;
  };

  if (page.words?.length) {
    return page.words.map((word) => ({
      text: word.text ?? '',
      x0: word.bbox.x0,
      y0: word.bbox.y0,
      x1: word.bbox.x1,
      y1: word.bbox.y1
    }));
  }

  const nested = (page.blocks ?? []).flatMap((block) =>
    (block.paragraphs ?? []).flatMap((paragraph) =>
      (paragraph.lines ?? []).flatMap((line) =>
        (line.words ?? []).map((word) => ({
          text: word.text ?? '',
          x0: word.bbox.x0,
          y0: word.bbox.y0,
          x1: word.bbox.x1,
          y1: word.bbox.y1
        }))
      )
    )
  );
  if (nested.length) return nested;

  if (page.tsv) return wordsFromTsv(page.tsv);
  if (page.hocr) return wordsFromHocr(page.hocr);
  return [];
}

function wordsFromTsv(tsv: string): WordBox[] {
  const lines = tsv.split(/\r?\n/).filter(Boolean);
  const start = lines[0]?.startsWith('level') ? 1 : 0;
  const words: WordBox[] = [];
  for (const line of lines.slice(start)) {
    const cols = line.split('\t');
    if (cols[0] !== '5' || cols.length < 12) continue;
    const left = Number(cols[6]);
    const top = Number(cols[7]);
    const width = Number(cols[8]);
    const height = Number(cols[9]);
    const text = cols.slice(11).join('\t');
    if (!text.trim()) continue;
    words.push({
      text,
      x0: left,
      y0: top,
      x1: left + width,
      y1: top + height
    });
  }
  return words;
}

function wordsFromHocr(hocr: string): WordBox[] {
  const words: WordBox[] = [];
  const re = /class=['"]ocrx_word['"][^>]*title=['"][^'"]*bbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)[^'"]*['"][^>]*>([^<]*)</gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(hocr))) {
    const text = match[5].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    if (!text) continue;
    words.push({
      text,
      x0: Number(match[1]),
      y0: Number(match[2]),
      x1: Number(match[3]),
      y1: Number(match[4])
    });
  }
  return words;
}
