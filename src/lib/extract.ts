import { ocrImageToItems } from './ocr.js';
import { extractPageText } from './pdfText.js';
import { openRenderablePdf, renderPageSafely } from './pdfRender.js';
import { PageText } from './types.js';

const SPARSE_CHARS = 40;

export async function extractPagesForDetect(buffer: Buffer): Promise<{
  pages: PageText[];
  ocr_pages: number[];
  text_layer_chars: number;
}> {
  const pages = await extractPageText(buffer);
  const ocr_pages: number[] = [];
  const text_layer_chars = pages.reduce(
    (sum, page) => sum + page.items.reduce((n, item) => n + item.str.length, 0),
    0
  );

  const sparse = pages.filter(
    (page) => page.items.reduce((n, item) => n + item.str.trim().length, 0) < SPARSE_CHARS
  );
  if (sparse.length === 0) {
    return { pages, ocr_pages, text_layer_chars };
  }

  const doc = await openRenderablePdf(buffer);
  try {
    for (const page of sparse) {
      const pdfPage = await doc.getPage(page.pageNumber);
      const rendered = await renderPageSafely(pdfPage);
      try {
        const image = rendered.canvas.toBuffer('image/png');
        const items = await ocrImageToItems(image, rendered.pageWidth, rendered.pageHeight, rendered.scale);
        page.items.push(...items);
        ocr_pages.push(page.pageNumber);
      } catch {
        // Keep the page for review even if OCR is unavailable.
      }
      rendered.canvas.width = 0;
      rendered.canvas.height = 0;
    }
  } finally {
    await doc.destroy();
  }

  return { pages, ocr_pages, text_layer_chars };
}
