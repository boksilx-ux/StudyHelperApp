import { glob } from 'glob';
import fs from 'fs-extra';
import { parse } from 'csv-parse/sync';

async function build() {
  const files = await glob('src/data/csv/**/*.csv');
  const rows = [];
  for (const f of files) {
    const csv = await fs.readFile(f, 'utf8');
    const recs = parse(csv, { columns: true, skip_empty_lines: true });
    rows.push(...recs);
  }
  await fs.ensureDir('src/data/generated');
  await fs.writeJson('src/data/generated/cards.json', rows, { spaces: 2 });
  await fs.writeJson('src/data/generated/index.json', { count: rows.length, updatedAt: new Date().toISOString() }, { spaces: 2 });
  console.log(`Built ${rows.length} rows → src/data/generated/cards.json`);
}
build().catch(err => { console.error(err); process.exit(1); });
