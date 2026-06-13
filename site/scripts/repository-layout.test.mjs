import { existsSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const root = new URL('../../', import.meta.url);

test('repository root keeps only site and articles as business directories', () => {
  const visibleDirectories = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(visibleDirectories, ['articles', 'site']);
});

test('repository root exposes Docker deployment files for Zeabur', () => {
  assert.equal(existsSync(new URL('../../Dockerfile', import.meta.url)), true);
  assert.equal(existsSync(new URL('../../.dockerignore', import.meta.url)), true);
});
