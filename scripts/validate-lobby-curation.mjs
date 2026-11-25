import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const rows = JSON.parse(await readFile(new URL('../src/data/lobby-curated.json', import.meta.url), 'utf8'));
const directory = new URL('../public/images/lobby-curated/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('credits.json', directory), 'utf8'));
assert.ok(rows.length >= 200, 'The reviewed collection must contain at least 200 works.');
assert.equal(manifest.count, rows.length);
assert.equal(manifest.items.length, rows.length);
assert.equal(new Set(rows.map(row => row.id)).size, rows.length, 'Duplicate work IDs');
assert.equal(new Set(rows.map(row => row.image_url)).size, rows.length, 'Duplicate image files');
const hashes = new Set();
const titles = new Set();
for (const row of rows) {
  const credit = manifest.items.find(item => item.id === row.id);
  assert.ok(credit, `Missing source record: ${row.id}`);
  for (const key of Object.keys(row)) assert.deepEqual(credit[key], row[key], `${row.id}: stale ${key}`);
  assert.ok(['ai', 'human'].includes(row.creation_kind), `${row.id}: missing AI label`);
  assert.match(row.image_url, /^\/images\/lobby-curated\/[a-z0-9-]+\.webp$/);
  assert.ok(row.width >= 360 && row.height >= 360, `${row.id}: insufficient display size`);
  assert.ok(!titles.has(row.title), `${row.id}: duplicate feature title`);
  titles.add(row.title);
  for (const key of ['techniques', 'traits', 'tones']) {
    assert.ok(row.facets[key].length > 0, `${row.id}: missing ${key}`);
    assert.equal(new Set(row.facets[key]).size, row.facets[key].length);
  }
  assert.ok(row.facets.origin.name && row.facets.origin.note, `${row.id}: missing origin context`);
  assert.equal(new URL(row.facets.origin.evidence_url).protocol, 'https:');
  if (row.facets.origin.kind === 'unknown') assert.equal(row.facets.origin.characters.length, 0);
  for (const key of ['source_url', 'license_url']) assert.equal(new URL(row.attribution[key]).protocol, 'https:');
  assert.ok(row.attribution.creator && row.attribution.changes && row.attribution.creation_evidence);
  if (row.creation_kind === 'ai') {
    assert.equal(credit.evidence.provenance.ai_generated, true);
    assert.equal(credit.evidence.license.commercial_use, true);
  } else {
    assert.ok(credit.evidence.license_evidence && credit.evidence.source_project);
  }
  const file = await readFile(new URL(row.image_url.split('/').pop(), directory));
  assert.equal(file.toString('ascii', 0, 4), 'RIFF');
  assert.equal(file.toString('ascii', 8, 12), 'WEBP');
  const hash = createHash('sha256').update(file).digest('hex');
  assert.equal(hash, credit.file_sha256, `${row.id}: file differs from reviewed version`);
  assert.ok(!hashes.has(hash), `${row.id}: duplicate image content`);
  hashes.add(hash);
}
assert.equal((await readdir(directory)).filter(name => name.endsWith('.webp')).length, rows.length, 'Unlisted images remain');
assert.equal(manifest.ai_count, rows.filter(row => row.creation_kind === 'ai').length);
assert.equal(manifest.human_count, rows.filter(row => row.creation_kind === 'human').length);
assert.ok(manifest.human_count > 0 && manifest.ai_count > 0);
console.log(`Verified ${rows.length} unique images, source records, licenses, dimensions, AI labels and four classification facets.`);
