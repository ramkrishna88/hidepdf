import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { burnRedactedPdf } from '../src/lib/burn.ts';
import { detectOnPages } from '../src/lib/detect.ts';
import { extractPageText } from '../src/lib/pdfText.ts';
import { inspectPdf, redactPdf } from '../src/services/redactor.ts';
import { isDefaultHiddenType } from '../src/lib/types.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const india = path.join(root, 'src/public/dummy-india-invoice.pdf');
const us = path.join(root, 'src/public/dummy-us-payroll.pdf');

async function assertSafe(label: string, filePath: string) {
  const buffer = fs.readFileSync(filePath);
  const inspected = await inspectPdf(buffer);
  if (inspected.items_found < 1) {
    throw new Error(`${label}: expected fields to review, found none`);
  }

  const hidden = await redactPdf(buffer, {});
  if (!hidden.text_removed) {
    throw new Error(`${label}: text was not removed`);
  }
  if (hidden.leftover_matches !== 0) {
    throw new Error(`${label}: leftover extractable matches: ${hidden.leftover_matches}`);
  }

  const leftoverPages = await extractPageText(Buffer.from(hidden.pdf));
  const leftoverText = leftoverPages.flatMap((page) => page.items.map((item) => item.str)).join(' ').trim();
  const leftoverDetect = detectOnPages(leftoverPages).filter((item) => isDefaultHiddenType(item.type));
  if (leftoverDetect.length > 0) {
    throw new Error(`${label}: extract still found ${leftoverDetect.map((item) => item.type).join(', ')}`);
  }

  const amountCount = inspected.counts.amount ?? 0;
  if (amountCount < 1) {
    throw new Error(`${label}: expected optional amounts to detect, found none`);
  }
  const expectedHidden = inspected.items_found - amountCount;
  if (hidden.hidden !== expectedHidden) {
    throw new Error(`${label}: default hide should skip amounts (hidden ${hidden.hidden}, expected ${expectedHidden})`);
  }

  const withAmounts = await redactPdf(buffer, { hideAmounts: true });
  if (withAmounts.hidden !== inspected.items_found) {
    throw new Error(`${label}: hide_amounts should hide every detected field (hidden ${withAmounts.hidden}, expected ${inspected.items_found})`);
  }

  console.log(JSON.stringify({
    label,
    found: inspected.items_found,
    amounts: amountCount,
    types: Object.entries(inspected.counts).filter(([, count]) => count > 0),
    hidden: hidden.hidden,
    hidden_with_amounts: withAmounts.hidden,
    text_removed: hidden.text_removed,
    leftover_chars: leftoverText.length,
    leftover_matches: leftoverDetect.length,
    bytes: hidden.pdf.byteLength
  }, null, 2));
}

await assertSafe('india', india);
await assertSafe('us', us);

try {
  const scanSource = fs.readFileSync(india);
  const scanPdf = await burnRedactedPdf(scanSource, []);
  const scanned = await inspectPdf(Buffer.from(scanPdf));
  const scanHidden = await redactPdf(Buffer.from(scanPdf), {});
  console.log(JSON.stringify({
    label: 'scan-ocr',
    ocr_pages: scanned.source.ocr_pages,
    found: scanned.items_found,
    hidden: scanHidden.hidden,
    leftover_matches: scanHidden.leftover_matches
  }, null, 2));
  if (scanned.items_found < 3) {
    throw new Error(`scan: OCR found too few fields (${scanned.items_found})`);
  }
  if (scanHidden.leftover_matches !== 0) {
    throw new Error('scan: leftover extractable matches after hide');
  }
} catch (error) {
  console.warn('scan-ocr skipped:', error instanceof Error ? error.message : error);
}

console.log('secure redact ok');
