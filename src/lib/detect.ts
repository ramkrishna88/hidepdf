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
  { type: 'nin', regex: /\b\d{4}\s\d{3}\s\d{4}\b/g },
  { type: 'amount', regex: /(?:[$£€¥₹]|USD|GBP|EUR|INR|Rs\.?)\s*-?\s*\d{1,3}(?:[, ]\d{2,3})*(?:\.\d{2})?/gi },
  { type: 'amount', regex: /\b\d{1,3}(?:,\d{3})+\.\d{2}\b/g }
];

const LABELED_FIELDS: Array<{ type: SensitiveType; label: RegExp; value: RegExp }> = [
  {
    type: 'person_name',
    label: /^(?:bill\s*to|billed\s*to|employee|customer|client|patient|name|attn|attention|sold\s*to)\s*[:\-]/i,
    value: /^[A-Z][A-Za-z.'’-]+(?:\s+[A-Z][A-Za-z.'’-]+){0,4}$/
  },
  {
    type: 'address',
    label: /^(?:address|addr|residence|shipping address|billing address|registered office)\s*[:\-]/i,
    value: /^.{8,80}$/
  },
  {
    type: 'amount',
    label: /^(?:amount(?:\s*due)?|total|subtotal|grand\s*total|net\s*pay|gross\s*pay|net\s*amount|balance\s*due|salary|price|invoice\s*total|paid|due)\s*[:\-]/i,
    value: /^(?:[$£€¥₹]|USD|GBP|EUR|INR|Rs\.?)?\s*-?\s*\d{1,3}(?:[, ]\d{2,3})*(?:\.\d{2})?\s*$/i
  }
];

const NEXT_LINE_ID_LABELS: Array<{ type: SensitiveType; label: RegExp }> = [
  { type: 'aadhaar', label: /\baadhaar\b/i },
  { type: 'pan', label: /\bpan\b/i },
  { type: 'upi', label: /\bupi\b/i },
  { type: 'gstin', label: /\bgstin\b/i },
  { type: 'ifsc', label: /\bifsc\b/i },
  { type: 'ssn', label: /\bssn\b/i },
  { type: 'itin', label: /\bitin\b/i }
];

export function maskValue(type: SensitiveType, value: string): string {
  if (type === 'email' || type === 'upi') {
    const [user, domain] = value.split('@');
    if (!domain) return '***';
    return `${user.slice(0, 1)}***@${domain}`;
  }
  if (type === 'person_name') {
    const parts = value.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return `${parts[0].slice(0, 1)}***`;
    return `${parts[0].slice(0, 1)}*** ${parts.slice(1).join(' ')}`;
  }
  if (type === 'address') {
    return `${value.slice(0, 3)}***${value.slice(-4)}`;
  }
  if (type === 'amount') {
    return value.length <= 4 ? '****' : `***${value.slice(-4)}`;
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

export function completeAadhaar(first11: string): string {
  const base = first11.replace(/\D/g, '').slice(0, 11);
  for (let digit = 0; digit <= 9; digit += 1) {
    const value = `${base}${digit}`;
    if (verhoeffOk(value)) {
      return `${value.slice(0, 4)} ${value.slice(4, 8)} ${value.slice(8)}`;
    }
  }
  throw new Error('Could not complete a valid Aadhaar checksum.');
}

function verhoeffOk(digits: string): boolean {
  const d = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 8, 9, 5, 6, 7],
    [3, 4, 0, 1, 2, 9, 5, 6, 7, 8],
    [4, 0, 1, 2, 3, 5, 6, 7, 8, 9],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
  ];
  const p = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
  ];
  let c = 0;
  const rev = digits.split('').reverse().map(Number);
  for (let i = 0; i < rev.length; i += 1) {
    c = d[c][p[i % 8][rev[i]]];
  }
  return c === 0;
}

function ibanOk(value: string): boolean {
  const compact = value.replace(/\s/g, '').toUpperCase();
  if (compact.length < 15 || compact.length > 34) return false;
  const rearranged = compact.slice(4) + compact.slice(0, 4);
  const nums = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  let remainder = 0;
  for (const ch of nums) remainder = (remainder * 10 + Number(ch)) % 97;
  return remainder === 1;
}

function isRealMatch(type: SensitiveType, value: string): boolean {
  const digits = digitsOf(value);
  if (type === 'credit_card') return digits.length >= 13 && digits.length <= 19 && luhnOk(digits);
  if (type === 'iban') return ibanOk(value);
  if (type === 'phone') return digits.length >= 10 && digits.length <= 15;
  if (type === 'aadhaar') return digits.length === 12 && /^[2-9]/.test(digits) && verhoeffOk(digits);
  if (type === 'pan') return /^[A-Z]{3}[PCHFATBLJG][A-Z]\d{4}[A-Z]$/i.test(value);
  if (type === 'gstin') return value.length === 15;
  if (type === 'ifsc') return value.length === 11 && value[4] === '0';
  if (type === 'person_name') return LABELED_FIELDS[0].value.test(value);
  if (type === 'address') return value.length >= 8;
  if (type === 'amount') {
    if (digits.length < 1 || digits.length > 12) return false;
    const hasCurrency = /[$£€¥₹]|USD|GBP|EUR|INR|Rs\.?/i.test(value);
    const hasGrouping = /[,\s]\d{2,3}/.test(value);
    const hasCents = /\.\d{2}\b/.test(value);
    return hasCurrency || hasGrouping || hasCents;
  }
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

    const groups = [...lines.values()].map((items) => {
      const ordered = [...items].sort((a, b) => a.x - b.x);
      return {
        items: ordered,
        text: ordered.map((item) => item.str).join(' '),
        y: Math.min(...ordered.map((item) => item.y))
      };
    }).sort((a, b) => b.y - a.y);

    for (let i = 0; i < groups.length; i += 1) {
      const group = groups[i];
      const next = groups[i + 1];
      for (const field of LABELED_FIELDS) {
        if (!field.label.test(group.text)) continue;
        const sameLine = group.text.replace(field.label, '').trim();
        const nextValue = next?.text.trim() ?? '';
        const value = field.value.test(sameLine) ? sameLine : (field.value.test(nextValue) ? nextValue : '');
        const valueItems = value === sameLine ? group.items : next?.items;
        if (!value || !valueItems?.length) continue;
        counter += 1;
        found.push(itemFromBoxes(`item_${counter}`, field.type, value, page.pageNumber, valueItems));
      }
      if (!next) continue;
      for (const field of NEXT_LINE_ID_LABELS) {
        if (!field.label.test(group.text)) continue;
        const pattern = PATTERNS.find((entry) => entry.type === field.type);
        if (pattern) {
          pattern.regex.lastIndex = 0;
          if (pattern.regex.test(group.text)) continue;
        }
        const candidate = next.text.trim();
        if (!isRealMatch(field.type, candidate)) continue;
        counter += 1;
        found.push(itemFromBoxes(`item_${counter}`, field.type, candidate, page.pageNumber, next.items));
      }
    }
  }

  return dropOverlaps(dedupe(found));
}

function itemFromBoxes(
  id: string,
  type: SensitiveType,
  value: string,
  page: number,
  boxes: PageText['items']
): DetectedItem {
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const top = Math.max(...boxes.map((box) => box.y + box.height));
  return {
    id,
    type,
    country: countryForType(type),
    value,
    preview: maskValue(type, value),
    page,
    box: {
      x: Math.max(0, x - 1),
      y: Math.max(0, y - 1),
      width: Math.max(8, right - x + 2),
      height: Math.max(8, top - y + 2)
    }
  };
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
      return !items.some((other) =>
        (other.type === 'aadhaar' || other.type === 'credit_card')
        && other.page === item.page
        && digits
        && digitsOf(other.value).includes(digits)
      );
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
    if (item.type === 'amount') {
      const nested = items.some((other) =>
        other.type === 'amount'
        && other.id !== item.id
        && other.page === item.page
        && other.value.includes(item.value)
        && other.value.length > item.value.length
      );
      if (nested) return false;
      return !items.some((other) =>
        other.type !== 'amount'
        && other.page === item.page
        && digits.length >= 8
        && digitsOf(other.value).includes(digits)
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
