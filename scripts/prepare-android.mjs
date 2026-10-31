import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export async function prepareAndroid(destination = new URL('../android/app/src/main/assets/www/', import.meta.url)) {
  await mkdir(destination, { recursive: true });
  for (const name of ['index.html', 'style.css', 'app.js', 'puzzle.js']) {
    let content = await readFile(new URL(`../${name}`, import.meta.url), 'utf8');
    // The APK is self-contained. Do not request the optional Google Fonts stylesheet.
    if (name === 'style.css') content = content.replace(/^@import\s+url\([^\n]+\);\s*/m, '');
    await writeFile(new URL(name, destination), content);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await prepareAndroid();
  console.log('Offline Android assets prepared. No Android tools ran on this computer.');
}
