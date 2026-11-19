// Takes the entry's screenshots: serves app/ with serve.ts, opens each scene in shots.json in the
// local Chrome, waits for the page to say it has painted (window.__shotReady), and saves a JPEG.
// A shot that comes out over the gate's 256 KiB is retaken at a lower quality until it fits.
import { spawn } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire('/home/hatch/workspace/makefun/shotter/package.json');
const puppeteer = require('puppeteer-core');

const CHROME = '/home/hatch/workspace/makefun/shotter/browsers/chrome/linux-157.0.8103.78/chrome-linux64/chrome';
const PORT = 8123;
const MAX_BYTES = 256 * 1024;

const server = spawn('node', ['serve.ts', '--port', String(PORT)], { stdio: 'ignore' });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await wait(900);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb'],
});

try {
  const shots = JSON.parse(readFileSync(new URL('./shots.json', import.meta.url), 'utf8'));
  for (const shot of shots) {
    const page = await browser.newPage();
    await page.setViewport({ width: shot.w, height: shot.h, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/${shot.query}`, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('window.__shotReady === true', { timeout: 30000 });
    await wait(250);
    const path = `screenshots/${shot.name}`;
    let quality = 84;
    for (;;) {
      await page.screenshot({ path, type: 'jpeg', quality });
      const bytes = statSync(path).size;
      if (bytes <= MAX_BYTES || quality <= 50) {
        console.log(shot.name, `${shot.w}x${shot.h}`, `q${quality}`, bytes, 'bytes');
        break;
      }
      quality -= 8;
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
