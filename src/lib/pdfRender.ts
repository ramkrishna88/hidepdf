import { createCanvas } from '@napi-rs/canvas';
import { makeCanvasFactory } from './canvasFactory.js';
import { openPdfDocument } from './openPdf.js';

export const RENDER_SCALE = 2;

export async function openRenderablePdf(buffer: Buffer) {
  return openPdfDocument(buffer, true);
}

export async function renderPageSafely(page: any) {
  const content = await page.getTextContent();
  const chars = (content.items as Array<{ str?: string }>).reduce((n, item) => n + (item.str?.length ?? 0), 0);
  if (chars < 40) {
    const embedded = await renderFromEmbeddedImages(page);
    if (embedded) return embedded;
  }
  return renderPageToCanvas(page);
}

export async function renderPageToCanvas(page: any, scale = RENDER_SCALE) {
  const viewport = page.getViewport({ scale });
  const width = Math.max(1, Math.ceil(viewport.width));
  const height = Math.max(1, Math.ceil(viewport.height));
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  await page.render({
    canvasContext: context,
    viewport,
    canvasFactory: makeCanvasFactory()
  }).promise;
  return {
    canvas,
    context,
    scale,
    pageWidth: viewport.width / scale,
    pageHeight: viewport.height / scale
  };
}

async function renderFromEmbeddedImages(page: any) {
  const viewport = page.getViewport({ scale: 1 });
  const opList = await page.getOperatorList();
  const images: Array<{ width: number; height: number; data: Uint8Array | Uint8ClampedArray; kind?: number }> = [];

  for (let i = 0; i < opList.fnArray.length; i += 1) {
    if (opList.fnArray[i] !== 85 && opList.fnArray[i] !== 86) continue;
    const raw = opList.argsArray[i]?.[0];
    const img = typeof raw === 'string' ? await getPageObject(page, raw) : raw;
    if (img?.width && img?.data) images.push(img);
  }

  if (images.length === 0) return null;
  const img = images.sort((a, b) => b.width * b.height - a.width * a.height)[0];
  const canvas = createCanvas(img.width, img.height);
  const context = canvas.getContext('2d');
  const imageData = context.createImageData(img.width, img.height);
  copyImageToRgba(img, imageData.data);
  context.putImageData(imageData, 0, 0);
  return {
    canvas,
    context,
    scale: img.width / viewport.width,
    pageWidth: viewport.width,
    pageHeight: viewport.height
  };
}

function getPageObject(page: { objs: { get: (name: string, callback?: (value: unknown) => void) => unknown } }, name: string) {
  return new Promise((resolve) => {
    const value = page.objs.get(name, resolve);
    if (value) resolve(value);
  });
}

function copyImageToRgba(
  img: { width: number; height: number; data: Uint8Array | Uint8ClampedArray; kind?: number },
  dest: Uint8ClampedArray
) {
  const src = img.data;
  if (src.length === img.width * img.height * 4) {
    dest.set(src);
    return;
  }
  if (src.length === img.width * img.height * 3) {
    let di = 0;
    for (let si = 0; si < src.length; si += 3) {
      dest[di++] = src[si];
      dest[di++] = src[si + 1];
      dest[di++] = src[si + 2];
      dest[di++] = 255;
    }
    return;
  }
  if (src.length === img.width * img.height) {
    let di = 0;
    for (let si = 0; si < src.length; si += 1) {
      dest[di++] = src[si];
      dest[di++] = src[si];
      dest[di++] = src[si];
      dest[di++] = 255;
    }
  }
}

export function pdfBoxToCanvas(
  box: { x: number; y: number; width: number; height: number },
  pageHeight: number,
  scale: number,
  pad = 3
) {
  return {
    x: box.x * scale - pad,
    y: (pageHeight - box.y - box.height) * scale - pad,
    width: box.width * scale + pad * 2,
    height: box.height * scale + pad * 2
  };
}
