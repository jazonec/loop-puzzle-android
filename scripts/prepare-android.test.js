import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareAndroid } from './prepare-android.mjs';

test('Android package contains the game and has no external font request', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'loop-puzzle-assets-'));
  try {
    await prepareAndroid(pathToFileURL(dir + '/'));
    for (const file of ['index.html', 'app.js', 'puzzle.js']) {
      assert.equal(await readFile(join(dir, file), 'utf8'), await readFile(new URL(`../${file}`, import.meta.url), 'utf8'));
    }
    const css = await readFile(join(dir, 'style.css'), 'utf8');
    assert.ok(css.includes('.edge-line'));
    assert.ok(!css.includes('@import'));
    assert.ok(!css.includes('fonts.googleapis.com'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
