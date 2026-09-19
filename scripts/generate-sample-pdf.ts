import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'src/public/sample.pdf');

const doc = new PDFDocument({ size: 'A4', margin: 56 });
fs.mkdirSync(path.dirname(out), { recursive: true });
doc.pipe(fs.createWriteStream(out));

doc.fontSize(22).text('HidePDF sample invoice');
doc.moveDown(0.4);
doc.fontSize(11).fillColor('#333').text('Customer record with fields you may want to hide.');
doc.moveDown(1.2);
doc.fontSize(12).fillColor('#111');
doc.text('Name: Alex Rivera');
doc.text('Email: alex.rivera@example.com');
doc.text('Phone: +44 7700 900123');
doc.text('SSN: 123-45-6789');
doc.text('Card: 4111 1111 1111 1111');
doc.text('IBAN: GB82WEST12345698765432');
doc.moveDown(1);
doc.text('Billing contact: finance@acme.test');
doc.text('Office line: (415) 555-2671');
doc.end();

console.log(`Wrote ${out}`);
