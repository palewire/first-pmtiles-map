#!/usr/bin/env node

/**
 * record.cjs - Playwright-based page scroll video recording
 *
 * Records a web page with smooth scrolling animation, wrapped in browser chrome.
 * Outputs MP4 video and optionally GIF for social media sharing.
 *
 * Usage:
 *   node record.cjs --url URL --output path.mp4 [options]
 *
 * Options:
 *   --url           URL to record (required)
 *   --output        Output MP4 file path (required)
 *   --duration      Scroll duration in seconds (default: 10)
 *   --speed         Scroll speed in pixels per second (default: 300)
 *   --wait          Extra milliseconds to wait after load before recording (default: 3000)
 *   --trim          Seconds to trim from the start of the recording (default: 3)
 *   --title         Custom browser title bar text (default: auto from page)
 *   --no-gif        Skip GIF generation
 *   --width         Viewport width (default: 900)
 *   --height        Viewport height (default: 900)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const os = require('os');

// Browser chrome dimensions
const CHROME_HEIGHT = 64; // title bar + address bar
const CHROME_BORDER = 5; // border width for sides and bottom

// Default viewport - square format for social media
const DEFAULT_WIDTH = 900;
const DEFAULT_HEIGHT = 900;

// Default scroll duration in seconds
const DEFAULT_DURATION = 10;

// Default scroll speed in pixels per second
const DEFAULT_SCROLL_SPEED = 300;

// GIF loop count (0 = infinite)
const GIF_LOOP_COUNT = 0;

// Frames per second for scroll animation (higher = smoother)
const SCROLL_FPS = 60;

// Parse command line arguments
function parseArgs(args) {
  const options = {
    url: null,
    output: null,
    duration: DEFAULT_DURATION,
    speed: DEFAULT_SCROLL_SPEED,
    wait: 3000,
    trim: 3,
    title: null,
    noGif: false,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--url':
        options.url = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--duration':
        options.duration = parseFloat(args[++i]);
        break;
      case '--speed':
        options.speed = parseFloat(args[++i]);
        break;
      case '--wait':
        options.wait = parseInt(args[++i], 10);
        break;
      case '--trim':
        options.trim = parseFloat(args[++i]);
        break;
      case '--title':
        options.title = args[++i];
        break;
      case '--no-gif':
        options.noGif = true;
        break;
      case '--width':
        options.width = parseInt(args[++i], 10);
        break;
      case '--height':
        options.height = parseInt(args[++i], 10);
        break;
    }
  }

  return options;
}

// Generate browser chrome overlay CSS and HTML
function getBrowserChromeOverlay(title, displayUrl) {
  return {
    css: `
      #browser-chrome-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: ${CHROME_HEIGHT}px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
        background: linear-gradient(180deg, #e8e6e8 0%, #dcdadc 100%);
      }

      #browser-chrome-overlay * {
        box-sizing: border-box;
      }

      #browser-chrome-overlay .title-bar {
        display: flex;
        align-items: center;
        height: 28px;
        padding: 0 12px;
        position: relative;
      }

      #browser-chrome-overlay .traffic-lights {
        display: flex;
        gap: 8px;
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
      }

      #browser-chrome-overlay .traffic-light {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        box-shadow: inset 0 0 0 0.5px rgba(0,0,0,0.15);
      }

      #browser-chrome-overlay .traffic-light.close {
        background: #ff5f57;
      }

      #browser-chrome-overlay .traffic-light.minimize {
        background: #febc2e;
      }

      #browser-chrome-overlay .traffic-light.maximize {
        background: #28c840;
      }

      #browser-chrome-overlay .title {
        flex: 1;
        text-align: center;
        font-size: 13px;
        font-weight: 500;
        color: #4d4d4d;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0 80px;
        line-height: 28px;
      }

      #browser-chrome-overlay .address-bar-container {
        padding: 4px 8px 8px 8px;
      }

      #browser-chrome-overlay .address-bar {
        background: #ffffff;
        padding: 5px 12px;
        border-radius: 6px;
        border: 1px solid #c4c4c4;
        display: flex;
        align-items: center;
        gap: 6px;
        height: 28px;
      }

      #browser-chrome-overlay .lock-icon {
        width: 12px;
        height: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      #browser-chrome-overlay .lock-icon svg {
        width: 10px;
        height: 10px;
        fill: #666;
      }

      #browser-chrome-overlay .url-text {
        font-size: 12px;
        color: #333333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1;
      }

      /* Browser window frame - sides and bottom */
      #browser-frame-left,
      #browser-frame-right,
      #browser-frame-bottom {
        position: fixed;
        background: #dcdadc;
        z-index: 2147483646;
      }

      #browser-frame-left {
        top: ${CHROME_HEIGHT}px;
        left: 0;
        width: ${CHROME_BORDER}px;
        bottom: 0;
      }

      #browser-frame-right {
        top: ${CHROME_HEIGHT}px;
        right: 0;
        width: ${CHROME_BORDER}px;
        bottom: 0;
      }

      #browser-frame-bottom {
        left: 0;
        right: 0;
        bottom: 0;
        height: ${CHROME_BORDER}px;
      }

      /* Push page content to make room for chrome frame */
      html {
        margin-top: ${CHROME_HEIGHT}px !important;
        margin-left: ${CHROME_BORDER}px !important;
        margin-right: ${CHROME_BORDER}px !important;
        margin-bottom: ${CHROME_BORDER}px !important;
      }

      body {
        margin-top: 0 !important;
      }
    `,
    html: `
      <div id="browser-chrome-overlay">
        <div class="title-bar">
          <div class="traffic-lights">
            <div class="traffic-light close"></div>
            <div class="traffic-light minimize"></div>
            <div class="traffic-light maximize"></div>
          </div>
          <div class="title">${escapeHtml(title)}</div>
        </div>
        <div class="address-bar-container">
          <div class="address-bar">
            <span class="lock-icon">
              <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.5 5H9V3.5C9 1.57 7.43 0 5.5 0S2 1.57 2 3.5V5h-.5C.67 5 0 5.67 0 6.5v4c0 .83.67 1.5 1.5 1.5h8c.83 0 1.5-.67 1.5-1.5v-4c0-.83-.67-1.5-1.5-1.5zM3.5 3.5C3.5 2.4 4.4 1.5 5.5 1.5S7.5 2.4 7.5 3.5V5h-4V3.5z"/>
              </svg>
            </span>
            <span class="url-text">${escapeHtml(displayUrl)}</span>
          </div>
        </div>
      </div>
      <div id="browser-frame-left"></div>
      <div id="browser-frame-right"></div>
      <div id="browser-frame-bottom"></div>
    `,
  };
}

// Escape HTML special characters
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Inject browser chrome overlay into page
async function injectBrowserChrome(page, title, displayUrl) {
  const chrome = getBrowserChromeOverlay(title, displayUrl);

  await page.addStyleTag({ content: chrome.css });
  await page.evaluate((html) => {
    const container = document.createElement('div');
    container.innerHTML = html;
    // Insert all chrome elements (top bar + frame borders)
    while (container.firstElementChild) {
      document.body.insertBefore(
        container.firstElementChild,
        document.body.firstChild
      );
    }
  }, chrome.html);
}

// Scroll down at a constant speed for a fixed duration
// Uses discrete steps for reliable video capture
async function scrollForDuration(page, durationSeconds, pixelsPerSecond) {
  // Use integer pixels per frame (minimum 1)
  const pixelsPerFrame = Math.max(1, Math.ceil(pixelsPerSecond / SCROLL_FPS));
  const msPerFrame = 1000 / SCROLL_FPS;
  const totalFrames = Math.round(durationSeconds * SCROLL_FPS);

  let currentScrollY = await page.evaluate(() => window.scrollY);

  // Scroll for the specified duration
  for (let frame = 0; frame < totalFrames; frame++) {
    const newY = currentScrollY + pixelsPerFrame;
    await page.evaluate((y) => window.scrollTo(0, y), newY);
    await page.waitForTimeout(msPerFrame);
    currentScrollY = newY;
  }
}

// Convert WebM to MP4 using ffmpeg with loop-friendly encoding
// Optionally trim the beginning (to remove chrome settling time)
function convertToMp4(webmPath, mp4Path, trimStart = 0) {
  console.log('Converting to MP4...');
  try {
    // Use -pix_fmt yuv420p for better compatibility and looping
    const trimFlag = trimStart > 0 ? `-ss ${trimStart}` : '';
    execSync(
      `ffmpeg -y ${trimFlag} -i "${webmPath}" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart -an "${mp4Path}"`,
      { stdio: 'pipe' }
    );
    console.log(`MP4 saved: ${mp4Path}`);
    return true;
  } catch (err) {
    console.error('ffmpeg MP4 conversion failed:', err.message);
    return false;
  }
}

// Generate GIF from MP4 using ffmpeg
function generateGif(mp4Path, gifPath, width = 450) {
  console.log('Generating GIF...');
  try {
    // Two-pass GIF generation for better quality
    const palettePath = path.join(os.tmpdir(), 'palette.png');

    // Generate palette
    execSync(
      `ffmpeg -y -i "${mp4Path}" -vf "fps=15,scale=${width}:-1:flags=lanczos,palettegen=stats_mode=diff" "${palettePath}"`,
      { stdio: 'pipe' }
    );

    // Generate GIF using palette
    execSync(
      `ffmpeg -y -i "${mp4Path}" -i "${palettePath}" -lavfi "fps=15,scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" -loop ${GIF_LOOP_COUNT} "${gifPath}"`,
      { stdio: 'pipe' }
    );

    // Clean up palette
    fs.unlinkSync(palettePath);

    console.log(`GIF saved: ${gifPath}`);
    return true;
  } catch (err) {
    console.error('ffmpeg GIF generation failed:', err.message);
    return false;
  }
}

async function recordVideo(options) {
  // Validate required options
  if (!options.url) {
    console.error('Error: --url is required');
    process.exit(1);
  }
  if (!options.output) {
    console.error('Error: --output is required');
    process.exit(1);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(options.output);
  if (outputDir && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create temp directory for recording
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'page-scroll-'));

  // Generate display URL (shortened for display)
  const urlObj = new URL(options.url);
  const displayUrl = urlObj.hostname + urlObj.pathname;

  console.log(`Recording: ${options.url}`);
  console.log(`Viewport: ${options.width}x${options.height}`);
  console.log(`Duration: ${options.duration}s at ${options.speed} px/s`);

  // Launch browser (NOT recording yet - we'll start a new context after setup)
  const browser = await chromium.launch({ headless: true });

  try {
    // First, load the page WITHOUT recording to set up the chrome
    const setupContext = await browser.newContext({
      viewport: {
        width: options.width,
        height: options.height,
      },
      deviceScaleFactor: 2,
    });

    const setupPage = await setupContext.newPage();

    // Navigate to URL
    console.log('Loading page...');
    await setupPage.goto(options.url, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Give the page extra time to finish rendering async assets during setup only
    if (options.wait > 0) {
      console.log(
        `Waiting ${options.wait}ms for page to settle (setup only)...`
      );
      await setupPage.waitForTimeout(options.wait);
    }

    // Get page title if not provided
    let pageTitle = options.title;
    if (!pageTitle) {
      pageTitle = await setupPage.title();
    }
    console.log(`Title: ${pageTitle}`);

    // Inject browser chrome overlay
    console.log('Adding browser chrome...');
    await injectBrowserChrome(setupPage, pageTitle, displayUrl);

    // Wait for chrome to render
    await setupPage.waitForTimeout(300);

    // Close setup context
    await setupContext.close();

    // Now create the recording context
    const recordContext = await browser.newContext({
      viewport: {
        width: options.width,
        height: options.height,
      },
      deviceScaleFactor: 2,
      recordVideo: {
        dir: tempDir,
        size: { width: options.width, height: options.height },
      },
    });

    const page = await recordContext.newPage();

    // Navigate to URL again
    await page.goto(options.url, { waitUntil: 'networkidle', timeout: 60000 });

    // Inject browser chrome overlay
    await injectBrowserChrome(page, pageTitle, displayUrl);

    // Wait for chrome to fully render and settle before animation starts
    // This ensures the browser bar doesn't "snap" during the recording
    console.log('Waiting for chrome to settle...');
    await page.waitForTimeout(2000);

    // Scroll down for the specified duration
    console.log('Scrolling...');
    await scrollForDuration(page, options.duration, options.speed);

    // Close context to save video
    console.log('Saving video...');
    await recordContext.close();

    // Find the recorded video file
    const videoFiles = fs
      .readdirSync(tempDir)
      .filter((f) => f.endsWith('.webm'));
    if (videoFiles.length === 0) {
      throw new Error('No video file was recorded');
    }
    const recordedVideo = path.join(tempDir, videoFiles[0]);

    // Convert to MP4, trimming the 2-second chrome settling time from the beginning
    const mp4Success = convertToMp4(
      recordedVideo,
      options.output,
      options.trim
    );
    if (!mp4Success) {
      console.error('Failed to convert to MP4. Keeping WebM...');
      const webmOutput = options.output.replace('.mp4', '.webm');
      fs.copyFileSync(recordedVideo, webmOutput);
      console.log(`WebM saved: ${webmOutput}`);
    }

    // Generate GIF unless disabled
    if (!options.noGif && mp4Success) {
      const gifPath = options.output.replace('.mp4', '.gif');
      generateGif(options.output, gifPath);
    }

    console.log('Done!');
  } finally {
    await browser.close();

    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  console.log(`
Page Scroll Video Recording Tool

Records a web page with smooth scrolling animation, wrapped in browser chrome.
Outputs MP4 video and GIF for social media sharing.

Usage:
  node record.cjs --url URL --output path.mp4 [options]

Options:
  --url           URL to record (required)
  --output        Output MP4 file path (required)
  --duration      Scroll duration in seconds (default: 10)
  --speed         Scroll speed in pixels per second (default: 300)
  --wait          Extra milliseconds to wait after load before recording (default: 3000)
  --trim          Seconds to trim from the start of the recording (default: 3)
  --title         Custom browser title bar text (default: auto from page)
  --no-gif        Skip GIF generation
  --width         Viewport width (default: 900)
  --height        Viewport height (default: 900)

Examples:
  # Basic recording (10 seconds at 300 px/s)
  node record.cjs --url https://example.com --output video.mp4

  # Longer recording
  node record.cjs --url https://example.com --output video.mp4 --duration 15

  # Faster scroll speed
  node record.cjs --url https://example.com --output video.mp4 --speed 500

  # Skip GIF generation
  node record.cjs --url https://example.com --output video.mp4 --no-gif
`);
  process.exit(0);
}

const options = parseArgs(args);
recordVideo(options).catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
