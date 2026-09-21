import { burnRedactedPdf } from '../lib/burn.js';
import { detectOnPages } from '../lib/detect.js';
import { extractPagesForDetect } from '../lib/extract.js';
import { extractPageText } from '../lib/pdfText.js';
import {
  COUNTRIES,
  DetectedItem,
  SENSITIVE_TYPES,
  SensitiveType,
  TYPE_LABELS,
  countryForType,
  isDefaultHiddenType,
  isOptionalType
} from '../lib/types.js';

const TRUST = {
  hide_method: 'rasterize_and_remove_text',
  review_required: true,
  extractable_after_hide: false,
  note: 'Hide burns each page to an image and strips the text layer. Hidden values cannot be copied or extracted.'
} as const;

export async function inspectPdf(buffer: Buffer) {
  const { pages, ocr_pages, text_layer_chars } = await extractPagesForDetect(buffer);
  const items = detectOnPages(pages);
  const counts = Object.fromEntries(
    SENSITIVE_TYPES
      .map((type) => [type, items.filter((item) => item.type === type).length] as const)
      .filter(([, count]) => count > 0)
  ) as Partial<Record<SensitiveType, number>>;
  const foundTypes = SENSITIVE_TYPES.filter((type) => (counts[type] ?? 0) > 0);

  return {
    filename_ok: true,
    total_pages: pages.length,
    items_found: items.length,
    counts,
    types: foundTypes.map((type) => ({
      id: type,
      label: TYPE_LABELS[type],
      country: countryForType(type),
      optional: isOptionalType(type),
      default_hidden: isDefaultHiddenType(type),
      count: counts[type] ?? 0
    })),
    countries: COUNTRIES.filter((country) => items.some((item) => item.country === country.id)).map((country) => ({
      id: country.id,
      label: country.label,
      types: [...country.types],
      count: items.filter((item) => item.country === country.id).length
    })),
    items: items.map(({ value: _value, box: _box, ...safe }) => ({
      ...safe,
      optional: isOptionalType(safe.type)
    })),
    source: {
      text_layer_chars,
      ocr_pages
    },
    trust: TRUST
  };
}

export async function redactPdf(
  buffer: Buffer,
  options: { itemIds?: string[]; types?: SensitiveType[]; hideAmounts?: boolean }
): Promise<{
  pdf: Uint8Array;
  hidden: number;
  mode: string;
  text_removed: boolean;
  leftover_matches: number;
  ocr_pages: number;
}> {
  const { pages, ocr_pages } = await extractPagesForDetect(buffer);
  const detected = detectOnPages(pages);
  const selected = selectItems(detected, options);
  const pdf = await burnRedactedPdf(buffer, selected);
  const hiddenTypes = new Set(selected.map((item) => item.type));
  const leftover = detectOnPages(await extractPageText(Buffer.from(pdf)))
    .filter((item) => hiddenTypes.has(item.type));

  if (leftover.length > 0) {
    const error = new Error('Hidden values were still extractable, so the PDF was not returned.');
    Object.assign(error, { statusCode: 500, errorCode: 'REDACT_NOT_SAFE' });
    throw error;
  }

  return {
    pdf,
    hidden: selected.length,
    mode: selectedMode(options),
    text_removed: true,
    leftover_matches: 0,
    ocr_pages: ocr_pages.length
  };
}

function selectItems(
  detected: DetectedItem[],
  options: { itemIds?: string[]; types?: SensitiveType[]; hideAmounts?: boolean }
): DetectedItem[] {
  const itemIds = options.itemIds ?? [];
  const types = options.types ?? [];
  const hideAmounts = Boolean(options.hideAmounts);

  if (itemIds.length > 0) {
    const allow = new Set(itemIds);
    return detected.filter((item) => allow.has(item.id));
  }
  if (types.length > 0) {
    const allowTypes = new Set(types);
    if (hideAmounts) allowTypes.add('amount');
    return detected.filter((item) => allowTypes.has(item.type));
  }
  return detected.filter((item) => isDefaultHiddenType(item.type) || hideAmounts);
}

function selectedMode(options: { itemIds?: string[]; types?: SensitiveType[]; hideAmounts?: boolean }): string {
  if (options.itemIds && options.itemIds.length > 0) return 'selected_fields';
  if (options.types && options.types.length > 0) return 'selected_types';
  return options.hideAmounts ? 'default_all_sensitive_and_amounts' : 'default_all_sensitive';
}
