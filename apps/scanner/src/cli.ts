import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { insertDemandIntelligence } from './db/queries.js';
import { parseCSV } from './queue/csv-parser.js';
import { BatchProcessor } from './queue/batch-processor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = resolve(__dirname, '../seed');
const DEFAULT_TENANT_ID = process.env.SCANNER_TENANT_ID || 'dad4308f-f9b6-4529-a406-7c2bdf3c6071';

async function seedDemandIntelligence() {
  console.log('Seeding demand intelligence data...');
  const raw = readFileSync(resolve(SEED_DIR, 'demand-intelligence-seed.json'), 'utf-8');
  const data = JSON.parse(raw);
  await insertDemandIntelligence(data);
  console.log(`Seeded ${data.length} demand intelligence data points.`);
}

async function seedFromCSV(filename: string) {
  console.log(`Seeding from CSV: ${filename}...`);
  const csvPath = resolve(SEED_DIR, filename);
  const csvText = readFileSync(csvPath, 'utf-8');
  const targets = parseCSV(csvText);
  console.log(`Found ${targets.length} targets in ${filename}`);

  const processor = new BatchProcessor();
  const batchId = `seed-${filename.replace('.csv', '')}-${Date.now()}`;

  // Import via queries (just create scan records, don't scan)
  const { getClient } = await import('./db/client.js');
  const supabase = getClient();

  for (const target of targets) {
    const domain = target.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
    await (supabase.from('merchant_scans') as any).upsert(
      {
        tenant_id: DEFAULT_TENANT_ID,
        domain,
        url: `https://${domain}`,
        merchant_name: target.merchant_name,
        merchant_category: target.merchant_category,
        country_code: target.country_code,
        region: target.region,
        scan_status: 'pending',
        scan_version: '1.0',
      },
      { onConflict: 'tenant_id,domain' },
    );
  }

  console.log(`Seeded ${targets.length} merchant scan targets from ${filename}.`);
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'seed': {
      const target = process.argv[3];

      if (!target || target === 'all') {
        await seedDemandIntelligence();

        const csvFiles = [
          'shopify-top-500.csv',
          'dtc-brands-us-200.csv',
          'latam-ecommerce-100.csv',
          'b2b-saas-100.csv',
          'enterprise-procurement-50.csv',
          'travel-hospitality-50.csv',
        ];

        for (const file of csvFiles) {
          try {
            await seedFromCSV(file);
          } catch (err) {
            console.error(`Failed to seed ${file}:`, err);
          }
        }

        console.log('Seeding complete!');
      } else if (target === 'demand') {
        await seedDemandIntelligence();
      } else {
        await seedFromCSV(target);
      }
      break;
    }

    default:
      console.log(`
Usage:
  pnpm --filter @sly/scanner seed           # Seed all data
  pnpm --filter @sly/scanner seed demand     # Seed demand intelligence only
  pnpm --filter @sly/scanner seed <file.csv> # Seed from specific CSV
      `);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('CLI error:', err);
  process.exit(1);
});
