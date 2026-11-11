# mediacontent

A Node.js tool that renders animated HTML presentations frame-by-frame using Puppeteer and stitches them into an MP4 video using ffmpeg.

## Overview

`capture-reel.mjs` automates the process of converting a multi-scene HTML animation into a high-quality 9:16 vertical video (suitable for Reels, TikTok, Shorts, etc.). It navigates to each scene in the HTML file, captures individual PNG frames at 30 fps, then uses ffmpeg to encode them into a final MP4.

## Prerequisites

- **Node.js** v18+
- **npm** packages: `puppeteer`
- **ffmpeg** installed and available on `PATH`

Install dependencies:

```bash
npm install puppeteer
```

## Usage

```bash
node capture-reel.mjs <path-to-html-file>
```

**Example:**

```bash
node capture-reel.mjs ./my-animation.html
```

This produces `./my-animation.mp4` next to the source HTML file.

## How It Works

1. Launches a headless Chromium browser (via Puppeteer) at 608×1080 (9:16, 1080p-equivalent).
2. Loads the target HTML file and iterates through each scene by calling `window.goTo(index)`.
3. Captures PNG screenshots for every frame of each scene (30 fps).
4. Invokes ffmpeg to scale frames to 1080×1920, encode with H.264 (`libx264`, CRF 18), and output a web-optimised MP4.
5. Cleans up the temporary frames directory.

## Output

| Property | Value |
|---|---|
| Resolution | 1080×1920 (9:16) |
| Frame rate | 30 fps |
| Codec | H.264 (libx264) |
| Quality | CRF 18 (near-lossless) |

## HTML Requirements

The target HTML file must expose a `window.goTo(sceneIndex)` global function that activates the scene at the given zero-based index. Scene durations in `capture-reel.mjs` must match the actual animation durations in the HTML.

Default scene configuration (edit in `capture-reel.mjs` to match your HTML):

```js
const SCENES = [
  { id: 's1', duration: 5 },
  { id: 's2', duration: 5 },
  { id: 's3', duration: 5 },
  { id: 's4', duration: 6 },
  { id: 's5', duration: 6 },
  { id: 's6', duration: 5 },
  { id: 's7', duration: 6 },
];
```
