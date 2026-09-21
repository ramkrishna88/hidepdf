import { PDFDocument } from 'pdf-lib';
import { DetectedItem } from './types.js';
import { openRenderablePdf, pdfBoxToCanvas, renderPageSafely } from './pdfRender.js';

export async function burnRedactedPdf(buffer: Buffer, selected: DetectedItem[]): Promise<Uint8Array> {
  const src = await openRenderablePdf(buffer);
  const out = await PDFDocument.create();
  try {
    for (let pageNumber = 1; pageNumber <= src.numPages; pageNumber += 1) {
      const page = await src.getPage(pageNumber);
      const rendered = await renderPageSafely(page);
      const { context, canvas, pageWidth, pageHeight, scale } = rendered;
      context.fillStyle = '#111318';
      for (const item of selected.filter((entry) => entry.page === pageNumber)) {
        const box = pdfBoxToCanvas(item.box, pageHeight, scale);
        context.fillRect(box.x, box.y, box.width, box.height);
      }

      const jpeg = canvas.toBuffer('image/jpeg', 85);
      const image = await out.embedJpg(jpeg);
      const pdfPage = out.addPage([pageWidth, pageHeight]);
      pdfPage.drawImage(image, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight
      });
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await src.destroy();
  }

  return out.save();
}
