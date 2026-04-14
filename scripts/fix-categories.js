// Normalises any lowercase category values already stored in the database.
// Usage:
//   DATABASE_URL='libsql://...' DATABASE_AUTH_TOKEN='...' node scripts/fix-categories.js
const { createClient } = require("@libsql/client");

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const CATEGORIES = ["Press", "Foto", "TV", "Radio", "Webb", "Annat"];

async function main() {
  // Find all submissions whose category doesn't match the canonical casing
  const { rows } = await client.execute(
    'SELECT id, category FROM "Submission" WHERE category NOT IN ("Press","Foto","TV","Radio","Webb","Annat")'
  );

  if (rows.length === 0) {
    console.log("No bad category values found.");
    return;
  }

  console.log(`Found ${rows.length} submission(s) to fix:`);
  for (const row of rows) {
    const raw = row.category;
    const fixed = CATEGORIES.find((c) => c.toLowerCase() === String(raw).toLowerCase());
    if (!fixed) {
      console.log(`  ${row.id}: "${raw}" — no canonical match, skipping`);
      continue;
    }
    await client.execute({
      sql: 'UPDATE "Submission" SET category = ? WHERE id = ?',
      args: [fixed, row.id],
    });
    console.log(`  ${row.id}: "${raw}" → "${fixed}"`);
  }
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
