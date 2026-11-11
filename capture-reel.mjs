import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync } from 'fs';
import path from 'path';

const htmlArg = process.argv[2];
if (!htmlArg) {
  console.error('Usage: node capture-reel.mjs <path-to-html-file>');
  process.exit(1);
}

const HTML_FILE  = path.resolve(htmlArg);
const STEM       = path.basename(HTML_FILE, path.extname(HTML_FILE));
const DIR        = path.dirname(HTML_FILE);
const FRAMES_DIR = path.join(DIR, `${STEM}-frames`);
const OUTPUT_MP4 = path.join(DIR, `${STEM}.mp4`);

// 9:16 ratio at 1080p
const WIDTH  = 608;
const HEIGHT = 1080;
const FPS    = 30;

// Scene durations in seconds (must match HTML)
const SCENES = [
  { id: 's1', duration: 5 },
  { id: 's2', duration: 5 },
  { id: 's3', duration: 5 },
  { id: 's4', duration: 6 },
  { id: 's5', duration: 6 },
  { id: 's6', duration: 5 },
  { id: 's7', duration: 6 },
];

const TOTAL_FRAMES = SCENES.reduce((s, sc) => s + sc.duration * FPS, 0);

// Clean and recreate frames dir
if (existsSync(FRAMES_DIR)) rmSync(FRAMES_DIR, { recursive: true });
mkdirSync(FRAMES_DIR, { recursive: true });

console.log('🚀 Launching browser...');
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', `--window-size=${WIDTH},${HEIGHT}`],
  defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 },
});

const page = await browser.newPage();
await page.goto(`file://${HTML_FILE}`, { waitUntil: 'networkidle0' });

// Inject a helper to jump directly to a scene without animation re-trigger issues
await page.addStyleTag({ content: `
  * { animation-play-state: running !important; }
  .nav, .dots { display: none !important; }
` });

let frameIndex = 0;

for (let si = 0; si < SCENES.length; si++) {
  const scene = SCENES[si];
  const sceneFrames = scene.duration * FPS;

  console.log(`🎬 Capturing scene ${si + 1}/${SCENES.length}: ${scene.id} (${scene.duration}s = ${sceneFrames} frames)`);

  // Navigate to this scene
  await page.evaluate((idx) => {
    window.goTo(idx);
  }, si);

  // Wait a tick for animations to start
  await new Promise(r => setTimeout(r, 80));

  for (let f = 0; f < sceneFrames; f++) {
    const pad = String(frameIndex).padStart(6, '0');
    const filePath = `${FRAMES_DIR}/frame_${pad}.png`;

    await page.screenshot({ path: filePath, type: 'png' });
    frameIndex++;

    // Advance time proportionally through the scene
    const t = (f / sceneFrames) * scene.duration * 1000;
    if (f > 0) await new Promise(r => setTimeout(r, 1000 / FPS));

    if (f % (FPS * 2) === 0) {
      const pct = Math.round((frameIndex / TOTAL_FRAMES) * 100);
      process.stdout.write(`\r  Frame ${frameIndex}/${TOTAL_FRAMES} (${pct}%)`);
    }
  }
  console.log('');
}

await browser.close();
console.log(`\n✅ Captured ${frameIndex} frames`);

// Stitch with ffmpeg
console.log('\n🎞  Encoding MP4 with ffmpeg...');
const ffmpegCmd = [
  'ffmpeg -y',
  `-framerate ${FPS}`,
  `-i "${FRAMES_DIR}/frame_%06d.png"`,
  '-vf "scale=1080:1920:flags=lanczos,format=yuv420p"',
  '-c:v libx264',
  '-crf 18',
  '-preset slow',
  '-movflags +faststart',
  `"${OUTPUT_MP4}"`,
].join(' ');

try {
  execSync(ffmpegCmd, { stdio: 'inherit' });
  console.log(`\n🎉 Done! Video saved to: ${OUTPUT_MP4}`);
} catch (e) {
  console.error('ffmpeg error:', e.message);
}

// Cleanup frames
rmSync(FRAMES_DIR, { recursive: true });
console.log('🧹 Frames cleaned up');
