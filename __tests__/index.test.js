import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';

await test('CLI succeeds for valid Markdown and MDX file links and heading anchors', () => {
  const dir = path.join(import.meta.dirname, 'fixtures/valid');
  const result = spawnSync(process.execPath, ['index.js', dir, dir], {
    encoding: 'utf-8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
});

await test('CLI fails for a broken Markdown file link', () => {
  const dir = path.join(import.meta.dirname, 'fixtures/broken');
  const result = spawnSync(process.execPath, ['index.js', dir, dir], {
    encoding: 'utf-8',
  });

  assert.equal(result.status, 1, result.stderr);
  assert.equal(
    result.stderr,
    `Link is broken: '${path.join(dir, 'missing.mdx')}' in file ${path.join(dir, 'index.md')}\n`,
  );
});
