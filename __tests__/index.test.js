import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';

await test('CLI accepts Markdown and MDX links to files and heading anchors', () => {
  const dir = path.join(import.meta.dirname, 'fixtures/valid');
  const result = spawnSync(process.execPath, ['index.js', dir, dir], {
    encoding: 'utf-8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
});

await test('CLI reports a broken Markdown link and exits with status 1', () => {
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
