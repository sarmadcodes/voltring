// Captures Play Store screenshots from the real web build. A bot plays genuine runs: it only taps
// when the rendered spark is inside the rendered gate. Uses your installed Chrome.
// Run: npm run gen:screenshots
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const OUT = fileURLToPath(new URL('../../assets/store/screenshots/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const server = await serve();
const browser = await chromium.launch({ channel: 'chrome', args: ['--disable-gpu', '--disable-gpu-compositing', '--force-color-profile=srgb'] });
// 360x640 CSS px at 3x = 1080x1920 (9:16), Play's recommended phone screenshot size.
const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });

const angles = () =>
  page.evaluate(() => {
    const els = [...document.querySelectorAll('div')].filter((d) => /rotate\(/.test(d.style.transform));
    if (els.length < 2) return null;
    const deg = (el) => parseFloat(el.style.transform.slice(7));
    return { gate: deg(els[0]), spark: deg(els[els.length - 1]) };
  });
const delta = (a, g) => {
  let d = (((a - g) % 360) + 360) % 360;
  if (d > 180) d -= 360;
  return d;
};
const scoreText = () => page.evaluate(() => document.body.innerText.match(/SCORE\s+(\d{6})/)?.[1] ?? null);

/** Real input: taps only when the rendered spark is inside the rendered gate. Stops tapping after `hits`. */
async function playRun(hitsWanted, shot) {
  await page.goto('http://localhost:8097/game');
  await page.waitForTimeout(1800);
  let last = null;
  let hits = 0;
  const deadline = Date.now() + 180_000;
  while (hits < hitsWanted && Date.now() < deadline) {
    const a = await angles();
    if (!a) continue;
    if (last !== a.gate && Math.abs(delta(a.spark, a.gate)) <= 6) {
      await page.mouse.down({ x: 180, y: 590 });
      await page.mouse.up({ x: 180, y: 590 });
      last = a.gate;
      hits++;
      if (shot && hits === shot.at) {
        await page.waitForTimeout(110);
        await page.screenshot({ path: `${OUT}/${shot.name}` });
        console.log('shot', shot.name, 'score', await scoreText());
      }
    }
  }
  // Stop tapping: the spark slips past three gates and the run ends naturally.
  await page.getByText('GAME OVER').or(page.getByText('NEW HIGH SCORE')).first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1400);
  console.log('run done hits', hits);
}

await page.goto('http://localhost:8097/');
await page.waitForTimeout(2000);

await playRun(36, { at: 31, name: '02-gameplay.png' });
await page.screenshot({ path: `${OUT}/03-game-over.png` });
console.log('shot 03-game-over.png');

for (const n of [24, 15, 9]) await playRun(n);

await page.goto('http://localhost:8097/records');
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}/04-records.png` });
console.log('shot 04-records.png');

await page.goto('http://localhost:8097/');
await page.waitForTimeout(2800);
await page.screenshot({ path: `${OUT}/01-home.png` });
console.log('shot 01-home.png');

await browser.close();
server.close();
