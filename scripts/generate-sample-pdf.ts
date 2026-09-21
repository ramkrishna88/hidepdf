import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'src/public/sample.pdf');

const doc = new PDFDocument({ size: 'A4', margin: 48 });
fs.mkdirSync(path.dirname(out), { recursive: true });
doc.pipe(fs.createWriteStream(out));

function heading(text: string) {
  doc.moveDown(0.55);
  doc.fontSize(14).fillColor('#111').text(text);
  doc.moveDown(0.2);
  doc.fontSize(11).fillColor('#222');
}

doc.fontSize(22).fillColor('#111').text('HidePDF country sample');
doc.moveDown(0.3);
doc.fontSize(11).fillColor('#333').text('Fake demo values only. Use this PDF to preview country-based hide types.');

heading('Global');
doc.text('Name: Alex Rivera');
doc.text('Email: alex.rivera@example.com');
doc.text('Phone: +44 7700 900123');
doc.text('Card: 4111 1111 1111 1111');
doc.text('IBAN: GB82WEST12345698765432');
doc.text('Office: (415) 555-2671');
doc.text('Billing: finance@acme.test');

heading('India');
doc.text('Aadhaar: 2345 6789 0123');
doc.text('PAN: ABCDE1234F');
doc.text('UPI: rivera@okaxis');
doc.text('GSTIN: 27ABCDE1234F1Z5');
doc.text('IFSC: HDFC0001234');
doc.text('Amount: INR 48,000');

heading('United States');
doc.text('SSN: 123-45-6789');
doc.text('ITIN: 912-70-3456');

heading('United Kingdom');
doc.text('NINO: AB123456C');
doc.text('NHS: 943 476 5919');

doc.addPage();
heading('Canada');
doc.text('SIN: 046-454-286');

heading('Australia');
doc.text('TFN: 856 423 197');
doc.text('ABN: 51 824 753 556');

heading('Brazil');
doc.text('CPF: 390.533.447-05');
doc.text('CNPJ: 12.345.678/0001-95');

heading('Mexico');
doc.text('RFC: XAXX010101000');
doc.text('CURP: GARC800101HDFRRN09');

heading('United Arab Emirates');
doc.text('Emirates ID: 784-1980-1234567-1');

heading('Saudi Arabia');
doc.text('Iqama: 2123456789');

doc.addPage();
heading('Singapore');
doc.text('NRIC: S1234567A');

heading('Pakistan');
doc.text('CNIC: 35201-8473921-8');

heading('Japan');
doc.text('My Number: 1234 5678 9012');

heading('South Korea');
doc.text('RRN: 900101-2345678');

heading('China');
doc.text('CN ID: 11010519491231002X');

heading('Netherlands');
doc.text('BSN: 111.222.333');

heading('Sweden');
doc.text('Personnummer: 811228-9874');

heading('Italy');
doc.text('Codice fiscale: RSSMRA80A01H501U');

heading('Spain');
doc.text('DNI: 12345678Z');
doc.text('NIE: X1234567L');

heading('Nigeria');
doc.text('NIN: 1234 567 8901');

doc.moveDown(1.2);
doc.fontSize(10).fillColor('#555').text('All identifiers on this page are invented for product demos. Do not use real personal data.');
doc.end();

console.log(`Wrote ${out}`);
