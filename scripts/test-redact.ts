import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectPdf, redactPdf } from '../src/services/redactor.ts';

const sample = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/public/sample.pdf');
const buffer = fs.readFileSync(sample);
const inspected = await inspectPdf(buffer);
console.log(JSON.stringify({
  pages: inspected.total_pages,
  found: inspected.items_found,
  counts: inspected.counts,
  previews: inspected.items.map((item) => ({ id: item.id, type: item.type, preview: item.preview, page: item.page }))
}, null, 2));

const all = await redactPdf(buffer, {});
console.log(JSON.stringify({ mode: all.mode, hidden: all.hidden, bytes: all.pdf.byteLength }));

const emailsOnly = await redactPdf(buffer, { types: ['email'] });
console.log(JSON.stringify({ mode: emailsOnly.mode, hidden: emailsOnly.hidden }));
