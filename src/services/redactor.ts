import { PDFDocument, rgb } from 'pdf-lib';
import { detectOnPages } from '../lib/detect.js';
import { extractPageText } from '../lib/pdfText.js';
import {
  COUNTRIES,
  DetectedItem,
  SENSITIVE_TYPES,
  SensitiveType,
  TYPE_LABELS,
  countryForType
} from '../lib/types.js';

export function inspectPdf(buffer: Buffer) {
  return extractPageText(buffer).then((pages) => {
    const items = detectOnPages(pages);
    const counts = Object.fromEntries(
      SENSITIVE_TYPES.map((type) => [type, items.filter((item) => item.type === type).length])
    ) as Record<SensitiveType, number>;

    return {
      filename_ok: true,
      total_pages: pages.length,
      items_found: items.length,
      counts,
      types: SENSITIVE_TYPES.map((type) => ({
        id: type,
        label: TYPE_LABELS[type],
        country: countryForType(type),
        count: counts[type],
        default_on: true
      })),
      countries: COUNTRIES.map((country) => ({
        id: country.id,
        label: country.label,
        types: [...country.types],
        count: items.filter((item) => item.country === country.id).length
      })),
      items: items.map(({ value: _value, ...safe }) => safe)
    };
  });
}

export async function redactPdf(
  buffer: Buffer,
  options: { itemIds?: string[]; types?: SensitiveType[] }
): Promise<{ pdf: Uint8Array; hidden: number; mode: string }> {
  const pages = await extractPageText(buffer);
  const detected = detectOnPages(pages);
  const selected = selectItems(detected, options);

  const doc = await PDFDocument.load(buffer);
  for (const item of selected) {
    const page = doc.getPages()[item.page - 1];
    if (!page) continue;
    page.drawRectangle({
      x: item.box.x,
      y: item.box.y,
      width: item.box.width,
      height: item.box.height,
      color: rgb(0.07, 0.09, 0.12),
      borderColor: rgb(0.07, 0.09, 0.12),
      borderWidth: 0.4
    });
  }

  return {
    pdf: await doc.save(),
    hidden: selected.length,
    mode: selectedMode(options)
  };
}

function selectItems(
  detected: DetectedItem[],
  options: { itemIds?: string[]; types?: SensitiveType[] }
): DetectedItem[] {
  const itemIds = options.itemIds ?? [];
  const types = options.types ?? [];

  if (itemIds.length === 0 && types.length === 0) {
    return detected;
  }
  if (itemIds.length > 0) {
    const allow = new Set(itemIds);
    return detected.filter((item) => allow.has(item.id));
  }
  const allowTypes = new Set(types);
  return detected.filter((item) => allowTypes.has(item.type));
}

function selectedMode(options: { itemIds?: string[]; types?: SensitiveType[] }): string {
  if ((!options.itemIds || options.itemIds.length === 0) && (!options.types || options.types.length === 0)) {
    return 'default_all_sensitive';
  }
  if (options.itemIds && options.itemIds.length > 0) return 'selected_fields';
  return 'selected_types';
}
