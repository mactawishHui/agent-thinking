import { readdirSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const root = new URL('../../', import.meta.url);

test('repository root keeps only site and articles as visible project entries', () => {
  const visibleEntries = readdirSync(root)
    .filter((entry) => !entry.startsWith('.'))
    .sort();

  assert.deepEqual(visibleEntries, ['articles', 'site']);
});
