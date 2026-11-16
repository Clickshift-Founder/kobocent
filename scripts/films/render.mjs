// Renders the Kobocent films.
//   node render.mjs stills 1 1.5,4,8,12      → PNG stills of film 1 at those seconds (out/stills)
//   node render.mjs film 1                   → out/kobocent-1.mp4 (needs out/music-1.wav from music.mjs)
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';

const [mode, vArg, tArg] = process.argv.slice(2);
const v = Number(vArg || 1);
const FPS = 30;
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const out = path.join(here, 'out');
fs.mkdirSync(path.join(out, 'stills'), { recursive: true });

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--force-device-scale-factor=1', '--hide-scrollbars', '--font-render-hinting=none'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, 'video.html')).href + `?v=${v}`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).filter((x, i, a) => a.indexOf(x) === i));
const info = await page.evaluate(() => window.VIDEO);
console.log(`film ${v}: ${info.dur}s, fonts: ${fonts.join(', ') || 'NONE LOADED'}`);
fs.writeFileSync(path.join(out, `timeline-${v}.json`), JSON.stringify(info));

if (mode === 'stills') {
  for (const t of (tArg || '1,5,10,15,20,28').split(',').map(Number)) {
    await page.evaluate((x) => window.seek(x), t);
    await page.screenshot({ path: path.join(out, 'stills', `v${v}-${String(t).replace('.', '_')}.png`) });
    console.log('still', t);
  }
} else {
  const wav = path.join(out, `music-${v}.wav`);
  const file = path.join(out, `kobocent-${v}.mp4`);
  const args = ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', 'pipe:0'];
  if (fs.existsSync(wav)) args.push('-i', wav);
  args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart');
  if (fs.existsSync(wav)) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  args.push(file);
  const ff = spawn(ffmpegPath, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  ff.stderr.on('data', (d) => { err = (err + d).slice(-2000); });
  const done = new Promise((res, rej) => ff.on('close', (code) => (code === 0 ? res() : rej(new Error(err)))));
  const frames = Math.round(info.dur * FPS);
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate((x) => window.seek(x), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${frames} (${Math.round((Date.now() - t0) / 1000)}s)`);
  }
  ff.stdin.end();
  await done;
  console.log('wrote', file, (fs.statSync(file).size / 1e6).toFixed(1) + ' MB');
}
await browser.close();
