import { FastifyRequest } from 'fastify';
import { COUNTRIES, SensitiveType, SENSITIVE_TYPES, typesForCountries } from './types.js';

const MAX_BYTES = Number(process.env.MAX_FILE_SIZE_MB || 25) * 1024 * 1024;

function fieldValue(body: unknown, key: string): unknown {
  if (!body || typeof body !== 'object') return undefined;
  const raw = (body as Record<string, unknown>)[key];
  if (raw == null) return undefined;
  if (typeof raw === 'object' && raw !== null && 'value' in raw) {
    return (raw as { value: unknown }).value;
  }
  return raw;
}

export function readSelection(request: FastifyRequest): {
  itemIds: string[];
  types: SensitiveType[];
  countries: string[];
} {
  const body = request.body;
  const countries = parseCountries(fieldValue(body, 'countries'));
  const types = uniqueTypes([...parseTypes(fieldValue(body, 'types')), ...typesForCountries(countries)]);
  return {
    itemIds: parseIds(fieldValue(body, 'item_ids')),
    types,
    countries
  };
}

export async function readPdfUpload(request: FastifyRequest): Promise<Buffer> {
  const attached = (request.body as { file?: { toBuffer?: () => Promise<Buffer> } } | undefined)?.file;
  if (attached?.toBuffer) {
    const buffer = await attached.toBuffer();
    assertPdf(buffer);
    return buffer;
  }

  if (!request.isMultipart()) {
    throw Object.assign(new Error('Upload the PDF as multipart field "file".'), {
      statusCode: 400,
      errorCode: 'NOT_MULTIPART'
    });
  }

  const file = await request.file();
  if (!file) {
    throw Object.assign(new Error('A PDF file is required in the "file" field.'), {
      statusCode: 400,
      errorCode: 'FILE_REQUIRED'
    });
  }

  const buffer = await file.toBuffer();
  assertPdf(buffer);
  return buffer;
}

function assertPdf(buffer: Buffer) {
  if (buffer.length === 0) {
    throw Object.assign(new Error('The uploaded file is empty.'), {
      statusCode: 400,
      errorCode: 'EMPTY_FILE'
    });
  }
  if (buffer.length > MAX_BYTES) {
    throw Object.assign(new Error(`PDF is larger than ${process.env.MAX_FILE_SIZE_MB || 25}MB.`), {
      statusCode: 413,
      errorCode: 'FILE_TOO_LARGE'
    });
  }
  if (!buffer.subarray(0, 5).toString('utf8').startsWith('%PDF')) {
    throw Object.assign(new Error('Only PDF files are accepted.'), {
      statusCode: 400,
      errorCode: 'NOT_PDF'
    });
  }
  return buffer;
}

export function parseTypes(raw: unknown): SensitiveType[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(',');
  return list
    .map((value) => String(value).trim())
    .filter((value): value is SensitiveType => SENSITIVE_TYPES.includes(value as SensitiveType));
}

export function parseCountries(raw: unknown): string[] {
  if (!raw) return [];
  const allowed = new Set(COUNTRIES.map((country) => country.id));
  const list = Array.isArray(raw) ? raw : String(raw).split(',');
  return list.map((value) => String(value).trim().toUpperCase()).filter((value) => allowed.has(value as never));
}

export function parseIds(raw: unknown): string[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(',');
  return list.map((value) => String(value).trim()).filter(Boolean);
}

function uniqueTypes(types: SensitiveType[]): SensitiveType[] {
  return [...new Set(types)];
}
