import { openPdfDocument } from './openPdf.js';
import { PageText, TextItem } from './types.js';

type PdfTextItem = {
  str?: string;
  width?: number;
  height?: number;
  transform?: number[];
};

export async function extractPageText(buffer: Buffer): Promise<PageText[]> {
  const doc = await openPdfDocument(buffer);

  const pages: PageText[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items: TextItem[] = [];

      for (const raw of content.items as PdfTextItem[]) {
        const str = raw.str ?? '';
        if (!str) continue;
        const tx = raw.transform ?? [1, 0, 0, 1, 0, 0];
        const height = Math.hypot(tx[2], tx[3]) || raw.height || 10;
        items.push({
          str,
          x: tx[4],
          y: tx[5],
          width: raw.width || str.length * height * 0.5,
          height
        });
      }

      pages.push({
        pageNumber,
        width: viewport.width,
        height: viewport.height,
        items
      });
    }
  } finally {
    await doc.destroy();
  }

  return pages;
}
