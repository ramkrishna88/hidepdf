import { GlobalFonts } from '@napi-rs/canvas';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { makeCanvasFactory } from './canvasFactory.js';
import './polyfillCanvas.js';

const require = createRequire(import.meta.url);
const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
const standardFontsDir = path.join(pdfjsRoot, 'standard_fonts');
const standardFontDataUrl = `${pathToFileURL(standardFontsDir).href}/`;

function registerCanvasFonts() {
  const fonts = [
    ['LiberationSans-Regular.ttf', ['Liberation Sans', 'Helvetica', 'Arial']],
    ['LiberationSans-Bold.ttf', ['Liberation Sans Bold', 'Helvetica-Bold', 'Arial-Bold']],
    ['LiberationSans-Italic.ttf', ['Liberation Sans Italic', 'Helvetica-Oblique', 'Arial-Italic']],
    ['LiberationSans-BoldItalic.ttf', ['Liberation Sans Bold Italic', 'Helvetica-BoldOblique']]
  ] as const;
  for (const [file, aliases] of fonts) {
    const fontPath = path.join(standardFontsDir, file);
    for (const alias of aliases) {
      try {
        GlobalFonts.registerFromPath(fontPath, alias);
      } catch {
        // Already registered in watch mode.
      }
    }
  }
}

registerCanvasFonts();

export async function openPdfDocument(buffer: Buffer, withCanvas = false) {
  return getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: !withCanvas,
    verbosity: 0,
    standardFontDataUrl,
    ...(withCanvas ? { canvasFactory: makeCanvasFactory() } : {})
  } as any).promise;
}
