import { countryForType, DetectedItem, PageText, SensitiveType } from './types.js';

const PATTERNS: Array<{ type: SensitiveType; regex: RegExp }> = [
  { type: 'email', regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { type: 'upi', regex: /\b[A-Z0-9._-]{2,64}@(?:okaxis|okhdfcbank|okicici|oksbi|ybl|apl|axl|paytm|upi|ibl|yesbank|okbizaxis|axisbank|jupiteraxis|airtel|waicici|freecharge)\b/gi },
  { type: 'phone', regex: /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{3,4}\b/g },
  { type: 'credit_card', regex: /\b(?:\d[ -]*?){13,19}\b/g },
  { type: 'iban', regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/gi },
  { type: 'pan', regex: /\b[A-Z]{5}\d{4}[A-Z]\b/g },
  { type: 'gstin', regex: /\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/g },
  { type: 'ifsc', regex: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g },
  { type: 'aadhaar', regex: /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g },
  { type: 'itin', regex: /\b9\d{2}[-\s]?\d{2}[-\s]?\d{4}\b/g },
  { type: 'ssn', regex: /\b[1-8]\d{2}[-\s]?\d{2}[-\s]?\d{4}\b/g },
  { type: 'nino', regex: /\b[A-CEGHJ-PR-TW-Z]{2}\s?\d{6}\s?[A-D]\b/gi },
  { type: 'nhs', regex: /\b\d{3}\s\d{3}\s\d{4}\b/g },
  { type: 'sin', regex: /\b\d{3}-\d{3}-\d{3}\b/g },
  { type: 'tfn', regex: /\b\d{3}\s\d{3}\s\d{3}\b/g },
  { type: 'abn', regex: /\b\d{2}\s\d{3}\s\d{3}\s\d{3}\b/g },
  { type: 'cpf', regex: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g },
  { type: 'cnpj', regex: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g },
  { type: 'curp', regex: /\b[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d\b/gi },
  { type: 'rfc', regex: /\b[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}\b/gi },
  { type: 'emirates_id', regex: /\b784-\d{4}-\d{7}-\d\b/g },
  { type: 'iqama', regex: /\b[12]\d{9}\b/g },
  { type: 'nric', regex: /\b[STFGM]\d{7}[A-Z]\b/gi },
  { type: 'cnic', regex: /\b\d{5}-\d{7}-\d\b/g },
  { type: 'my_number', regex: /\b\d{4}\s\d{4}\s\d{4}\b/g },
  { type: 'rrn', regex: /\b\d{6}-\d{7}\b/g },
  { type: 'cn_id', regex: /\b\d{17}\s?[\dXx]\b/g },
  { type: 'bsn', regex: /\b\d{3}\.\d{3}\.\d{3}\b(?!-)/g },
  { type: 'personnummer', regex: /\b\d{6}[-+]\d{4}\b/g },
  { type: 'codice_fiscale', regex: /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/gi },
  { type: 'dni', regex: /\b\d{8}[A-Z]\b/g },
  { type: 'nie', regex: /\b[XYZ]\d{7}[A-Z]\b/gi },
  { type: 'nin', regex: /\b\d{4}\s\d{3}\s\d{4}\b/g }
];

export function maskValue(type: SensitiveType, value: string): string {
  if (type === 'email' || type === 'upi') {
    const [user, domain] = value.split('@');
    if (!domain) return '***';
    return `${user.slice(0, 1)}***@${domain}`;
  }
  if (value.length <= 4) return '****';
  return `${'*'.repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}

function luhnOk(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

function isRealMatch(type: SensitiveType, value: string): boolean {
  const digits = digitsOf(value);
  if (type === 'credit_card') return digits.length >= 13 && digits.length <= 19 && luhnOk(digits);
  if (type === 'phone') return digits.length >= 10 && digits.length <= 15;
  if (type === 'aadhaar') return digits.length === 12 && /^[2-9]/.test(digits);
  if (type === 'pan') return /^[A-Z]{5}\d{4}[A-Z]$/i.test(value);
  if (type === 'gstin') return value.length === 15;
  if (type === 'ifsc') return value.length === 11 && value[4] === '0';
  if (type === 'ssn' || type === 'itin') return digits.length === 9;
  if (type === 'nino') return /^[A-CEGHJ-PR-TW-Z]{2}\s?\d{6}\s?[A-D]$/i.test(value);
  if (type === 'nhs') return digits.length === 10;
  if (type === 'nin') return digits.length === 11;
  if (type === 'sin' || type === 'tfn' || type === 'bsn') return digits.length === 9;
  if (type === 'abn') return digits.length === 11;
  if (type === 'cpf') return digits.length === 11;
  if (type === 'cnpj') return digits.length === 14;
  if (type === 'curp') return value.length === 18;
  if (type === 'rfc') return value.length === 12 || value.length === 13;
  if (type === 'emirates_id') return digits.length === 15 && digits.startsWith('784');
  if (type === 'iqama') return digits.length === 10 && /^[12]/.test(digits);
  if (type === 'cnic') return digits.length === 13;
  if (type === 'my_number') return digits.length === 12;
  if (type === 'rrn') return digits.length === 13;
  if (type === 'cn_id') return /^\d{17}[\dXx]$/i.test(value.replace(/\s/g, ''));
  if (type === 'personnummer') return digits.length === 10;
  if (type === 'codice_fiscale') return value.length === 16;
  if (type === 'dni') return /^\d{8}[A-Z]$/i.test(value);
  if (type === 'nie') return /^[XYZ]\d{7}[A-Z]$/i.test(value);
  return true;
}

function lineKey(item: { y: number; height: number }): string {
  return String(Math.round(item.y / Math.max(item.height, 8)));
}

export function detectOnPages(pages: PageText[]): DetectedItem[] {
  const found: DetectedItem[] = [];
  let counter = 0;

  for (const page of pages) {
    const lines = new Map<string, typeof page.items>();
    for (const item of page.items) {
      if (!item.str.trim()) continue;
      const key = lineKey(item);
      const list = lines.get(key) ?? [];
      list.push(item);
      lines.set(key, list);
    }

    for (const items of lines.values()) {
      items.sort((a, b) => a.x - b.x);
      const text = items.map((item) => item.str).join(' ');
      if (!text.trim()) continue;

      for (const { type, regex } of PATTERNS) {
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text))) {
          const value = match[0].trim();
          if (!isRealMatch(type, value)) continue;

          const start = match.index;
          const end = start + value.length;
          let cursor = 0;
          const boxes = [];
          for (const item of items) {
            const pieceStart = cursor;
            const pieceEnd = cursor + item.str.length;
            cursor = pieceEnd + 1;
            if (pieceEnd > start && pieceStart < end) boxes.push(item);
          }
          if (boxes.length === 0) continue;

          const x = Math.min(...boxes.map((box) => box.x));
          const y = Math.min(...boxes.map((box) => box.y));
          const right = Math.max(...boxes.map((box) => box.x + box.width));
          const top = Math.max(...boxes.map((box) => box.y + box.height));
          counter += 1;
          found.push({
            id: `item_${counter}`,
            type,
            country: countryForType(type),
            value,
            preview: maskValue(type, value),
            page: page.pageNumber,
            box: {
              x: Math.max(0, x - 1),
              y: Math.max(0, y - 1),
              width: Math.max(8, right - x + 2),
              height: Math.max(8, top - y + 2)
            }
          });
        }
      }
    }
  }

  return dropOverlaps(dedupe(found));
}

function dropOverlaps(items: DetectedItem[]): DetectedItem[] {
  const strong = items.filter((item) => item.type !== 'phone');
  return items.filter((item) => {
    const digits = digitsOf(item.value);
    if (item.type === 'phone') {
      return !strong.some(
        (other) => other.page === item.page && digits && digitsOf(other.value).includes(digits) && other.id !== item.id
      );
    }
    if (item.type === 'credit_card') {
      return !items.some((other) =>
        ['emirates_id', 'cn_id', 'rrn', 'cnic', 'aadhaar'].includes(other.type)
        && other.page === item.page
        && digits
        && digitsOf(other.value).includes(digits)
      );
    }
    if (item.type === 'aadhaar') {
      return !items.some(
        (other) => other.type === 'credit_card' && other.page === item.page && digits && digitsOf(other.value).includes(digits)
      );
    }
    if (item.type === 'my_number') {
      return !items.some((other) => other.type === 'aadhaar' && other.page === item.page && digitsOf(other.value) === digits);
    }
    if (item.type === 'ssn') {
      return !items.some((other) => other.type === 'itin' && other.page === item.page && digitsOf(other.value) === digits);
    }
    if (item.type === 'bsn') {
      return !items.some((other) =>
        (other.type === 'cpf' || other.type === 'cnpj')
        && other.page === item.page
        && digits
        && digitsOf(other.value).includes(digits)
      );
    }
    if (item.type === 'tfn') {
      return !items.some((other) =>
        other.type === 'abn' && other.page === item.page && digits && digitsOf(other.value).includes(digits)
      );
    }
    return true;
  });
}

function dedupe(items: DetectedItem[]): DetectedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}:${item.page}:${item.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
