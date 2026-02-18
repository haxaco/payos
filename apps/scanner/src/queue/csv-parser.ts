import { parse } from 'csv-parse/sync';

interface CSVTarget {
  domain: string;
  merchant_name?: string;
  merchant_category?: string;
  country_code?: string;
  region?: string;
}

// Column name mappings (flexible header detection)
const COLUMN_MAP: Record<string, keyof CSVTarget> = {
  domain: 'domain',
  url: 'domain',
  website: 'domain',
  site: 'domain',
  merchant_name: 'merchant_name',
  name: 'merchant_name',
  company: 'merchant_name',
  merchant: 'merchant_name',
  merchant_category: 'merchant_category',
  category: 'merchant_category',
  type: 'merchant_category',
  country_code: 'country_code',
  country: 'country_code',
  region: 'region',
};

export function parseCSV(csvText: string): CSVTarget[] {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  if (records.length === 0) return [];

  // Map headers to known columns
  const headerMap = new Map<string, keyof CSVTarget>();
  const sampleKeys = Object.keys(records[0]);

  for (const key of sampleKeys) {
    const normalized = key.toLowerCase().trim().replace(/[^a-z_]/g, '');
    const mapped = COLUMN_MAP[normalized];
    if (mapped) {
      headerMap.set(key, mapped);
    }
  }

  // Domain column is required
  const domainKey = [...headerMap.entries()].find(([, v]) => v === 'domain')?.[0];
  if (!domainKey) {
    // Try first column as domain
    if (sampleKeys.length > 0) {
      headerMap.set(sampleKeys[0], 'domain');
    } else {
      return [];
    }
  }

  const targets: CSVTarget[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    const target: CSVTarget = { domain: '' };

    for (const [csvKey, field] of headerMap) {
      const value = record[csvKey]?.trim();
      if (value) {
        (target as any)[field] = value;
      }
    }

    // Clean domain
    if (target.domain) {
      target.domain = target.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');

      // Deduplicate
      if (!seen.has(target.domain)) {
        seen.add(target.domain);
        targets.push(target);
      }
    }
  }

  return targets;
}
