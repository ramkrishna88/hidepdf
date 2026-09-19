import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectPdf, redactPdf } from '../src/services/redactor.ts';

const sample = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/public/sample.pdf');
const buffer = fs.readFileSync(sample);
const inspected = await inspectPdf(buffer);
const foundTypes = Object.entries(inspected.counts)
  .filter(([, count]) => count > 0)
  .map(([type, count]) => `${type}:${count}`);

console.log(JSON.stringify({
  pages: inspected.total_pages,
  found: inspected.items_found,
  types: foundTypes,
  countries: inspected.countries.filter((country) => country.count > 0).map((country) => `${country.id}:${country.count}`),
  previews: inspected.items.map((item) => ({
    id: item.id,
    type: item.type,
    country: item.country,
    preview: item.preview,
    page: item.page
  }))
}, null, 2));

const all = await redactPdf(buffer, {});
console.log(JSON.stringify({ mode: all.mode, hidden: all.hidden, bytes: all.pdf.byteLength }));

const indiaOnly = await redactPdf(buffer, { types: ['aadhaar', 'pan', 'upi', 'gstin', 'ifsc'] });
console.log(JSON.stringify({ mode: indiaOnly.mode, hidden: indiaOnly.hidden }));
