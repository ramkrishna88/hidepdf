export const GLOBAL_TYPES = ['email', 'phone', 'credit_card', 'iban', 'person_name', 'address'] as const;

export const COUNTRY_ID_TYPES = [
  'aadhaar',
  'pan',
  'upi',
  'gstin',
  'ifsc',
  'ssn',
  'itin',
  'nino',
  'nhs',
  'sin',
  'tfn',
  'abn',
  'cpf',
  'cnpj',
  'rfc',
  'curp',
  'emirates_id',
  'iqama',
  'nric',
  'cnic',
  'my_number',
  'rrn',
  'cn_id',
  'bsn',
  'personnummer',
  'codice_fiscale',
  'dni',
  'nie',
  'nin'
] as const;

export const OPTIONAL_TYPES = ['amount'] as const;
export const SENSITIVE_TYPES = [...GLOBAL_TYPES, ...COUNTRY_ID_TYPES, ...OPTIONAL_TYPES] as const;
export type SensitiveType = (typeof SENSITIVE_TYPES)[number];
export type OptionalType = (typeof OPTIONAL_TYPES)[number];

export function isOptionalType(type: string): type is OptionalType {
  return (OPTIONAL_TYPES as readonly string[]).includes(type);
}

export function isDefaultHiddenType(type: string): boolean {
  return !isOptionalType(type);
}

export const COUNTRIES = [
  { id: 'IN', label: 'India', types: ['aadhaar', 'pan', 'upi', 'gstin', 'ifsc'] },
  { id: 'US', label: 'United States', types: ['ssn', 'itin'] },
  { id: 'GB', label: 'United Kingdom', types: ['nino', 'nhs'] },
  { id: 'CA', label: 'Canada', types: ['sin'] },
  { id: 'AU', label: 'Australia', types: ['tfn', 'abn'] },
  { id: 'BR', label: 'Brazil', types: ['cpf', 'cnpj'] },
  { id: 'MX', label: 'Mexico', types: ['rfc', 'curp'] },
  { id: 'AE', label: 'United Arab Emirates', types: ['emirates_id'] },
  { id: 'SA', label: 'Saudi Arabia', types: ['iqama'] },
  { id: 'SG', label: 'Singapore', types: ['nric'] },
  { id: 'PK', label: 'Pakistan', types: ['cnic'] },
  { id: 'JP', label: 'Japan', types: ['my_number'] },
  { id: 'KR', label: 'South Korea', types: ['rrn'] },
  { id: 'CN', label: 'China', types: ['cn_id'] },
  { id: 'NL', label: 'Netherlands', types: ['bsn'] },
  { id: 'SE', label: 'Sweden', types: ['personnummer'] },
  { id: 'IT', label: 'Italy', types: ['codice_fiscale'] },
  { id: 'ES', label: 'Spain', types: ['dni', 'nie'] },
  { id: 'NG', label: 'Nigeria', types: ['nin'] }
] as const;

export type CountryCode = (typeof COUNTRIES)[number]['id'];

export type TextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PageText = {
  pageNumber: number;
  width: number;
  height: number;
  items: TextItem[];
};

export type DetectedItem = {
  id: string;
  type: SensitiveType;
  country: CountryCode | 'global';
  value: string;
  preview: string;
  page: number;
  box: { x: number; y: number; width: number; height: number };
};

export const TYPE_LABELS: Record<SensitiveType, string> = {
  email: 'Email addresses',
  phone: 'Phone numbers',
  credit_card: 'Credit cards',
  iban: 'IBAN / international bank accounts',
  person_name: 'Person names',
  address: 'Addresses',
  amount: 'Amounts',
  aadhaar: 'Aadhaar',
  pan: 'PAN',
  upi: 'UPI ID',
  gstin: 'GSTIN',
  ifsc: 'IFSC',
  ssn: 'SSN',
  itin: 'ITIN',
  nino: 'National Insurance number',
  nhs: 'NHS number',
  sin: 'SIN',
  tfn: 'TFN',
  abn: 'ABN',
  cpf: 'CPF',
  cnpj: 'CNPJ',
  rfc: 'RFC',
  curp: 'CURP',
  emirates_id: 'Emirates ID',
  iqama: 'Iqama / National ID',
  nric: 'NRIC / FIN',
  cnic: 'CNIC',
  my_number: 'My Number',
  rrn: 'Resident registration number',
  cn_id: 'Resident Identity Card',
  bsn: 'BSN',
  personnummer: 'Personnummer',
  codice_fiscale: 'Codice fiscale',
  dni: 'DNI',
  nie: 'NIE',
  nin: 'NIN'
};

export function typesForCountries(codes: string[]): SensitiveType[] {
  const allow = new Set(codes);
  return COUNTRIES.filter((country) => allow.has(country.id)).flatMap((country) => [
    ...country.types
  ]);
}

export function countryForType(type: SensitiveType): CountryCode | 'global' {
  if ((GLOBAL_TYPES as readonly string[]).includes(type) || isOptionalType(type)) return 'global';
  const match = COUNTRIES.find((country) => (country.types as readonly string[]).includes(type));
  return match?.id ?? 'global';
}

export function hideTypesCatalog() {
  return {
    global: GLOBAL_TYPES.map((id) => ({
      id,
      label: TYPE_LABELS[id],
      country: 'global' as const,
      optional: false,
      default_hidden: true
    })),
    optional: OPTIONAL_TYPES.map((id) => ({
      id,
      label: TYPE_LABELS[id],
      country: 'global' as const,
      optional: true,
      default_hidden: false
    })),
    countries: COUNTRIES.map((country) => ({
      id: country.id,
      label: country.label,
      types: country.types.map((id) => ({ id, label: TYPE_LABELS[id], optional: false, default_hidden: true }))
    })),
    types: SENSITIVE_TYPES.map((id) => ({
      id,
      label: TYPE_LABELS[id],
      country: countryForType(id),
      optional: isOptionalType(id),
      default_hidden: isDefaultHiddenType(id)
    }))
  };
}
