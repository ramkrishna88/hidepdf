import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import { completeAadhaar } from '../src/lib/detect.ts';

const indiaAadhaar = completeAadhaar('23456789012');

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'src/public');
fs.mkdirSync(publicDir, { recursive: true });

function writePdf(filename: string, draw: (doc: PDFKit.PDFDocument) => void): Promise<string> {
  const out = path.join(publicDir, filename);
  const doc = new PDFDocument({ size: 'A4', margin: 52 });
  const stream = fs.createWriteStream(out);
  doc.pipe(stream);
  draw(doc);
  doc.end();
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(out));
    stream.on('error', reject);
  });
}

const india = await writePdf('dummy-india-invoice.pdf', (doc) => {
  doc.fontSize(20).fillColor('#111').text('Rivera Traders Pvt Ltd');
  doc.fontSize(11).fillColor('#444').text('Tax invoice  ·  INV-2048  ·  Fake demo only');
  doc.moveDown(1);
  doc.fontSize(12).fillColor('#111');
  doc.text('Bill to: Priya Sharma');
  doc.text('Address: 14 MG Road, Bengaluru 560001');
  doc.text('Email: priya.sharma@example.in');
  doc.text('Mobile: +91 98765 43210');
  doc.moveDown(0.8);
  doc.fontSize(13).text('India IDs');
  doc.moveDown(0.25);
  doc.fontSize(12);
  doc.text(`Aadhaar: ${indiaAadhaar}`);
  doc.text('PAN: ABCPE1234F');
  doc.text('UPI: priya@okaxis');
  doc.text('GSTIN: 27ABCDE1234F1Z5');
  doc.text('IFSC: HDFC0001234');
  doc.moveDown(0.8);
  doc.text('Item: Office chairs  x  12');
  doc.text('Amount: INR 48,000');
  doc.moveDown(1.2);
  doc.fontSize(10).fillColor('#666').text('All values on this invoice are invented for HidePDF testing.');
});

const us = await writePdf('dummy-us-payroll.pdf', (doc) => {
  doc.fontSize(20).fillColor('#111').text('Northwind Payroll');
  doc.fontSize(11).fillColor('#444').text('Pay stub  ·  Period 1–15 Sep 2026  ·  Fake demo only');
  doc.moveDown(1);
  doc.fontSize(12).fillColor('#111');
  doc.text('Employee: Alex Rivera');
  doc.text('Email: alex.rivera@example.com');
  doc.text('Phone: (415) 555-2671');
  doc.moveDown(0.8);
  doc.fontSize(13).text('United States IDs');
  doc.moveDown(0.25);
  doc.fontSize(12);
  doc.text('SSN: 123-45-6789');
  doc.text('ITIN: 912-70-3456');
  doc.text('Card: 4111 1111 1111 1111');
  doc.moveDown(0.8);
  doc.text('Gross pay: USD 3,200.00');
  doc.text('Net pay: USD 2,540.18');
  doc.moveDown(1.2);
  doc.fontSize(10).fillColor('#666').text('All values on this pay stub are invented for HidePDF testing.');
});

for (const file of [india, us]) {
  const copy = path.join(root, path.basename(file));
  fs.copyFileSync(file, copy);
  console.log(`Wrote ${file}`);
  console.log(`Copied ${copy}`);
}
