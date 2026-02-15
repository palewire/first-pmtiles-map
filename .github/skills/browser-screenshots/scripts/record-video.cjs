#!/usr/bin/env node

/**
 * record-video.js - Playwright-based video capture for tutorials
 *
 * Records a looping video of a web page, useful for capturing animated content.
 * Outputs as GIF or MP4.
 *
 * Usage:
 *   node record-video.js --url URL --output path.gif [options]
 *
 * Options:
 *   --url           URL to capture (required)
 *   --output        Output file path - .gif or .mp4 (required)
 *   --width         Viewport width (default: 1280)
 *   --height        Viewport height (default: 800)
 *   --duration      Recording duration in seconds (default: 5)
 *   --fps           Frames per second for GIF (default: 10)
 *   --execute       JavaScript to run before recording
 *   --wait          Milliseconds to wait before recording (default: 500)
 *   --dark          Use dark color scheme
 *   --session       Named session to use for authenticated captures
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync, spawn } = require('child_process');

// Session storage directory
const SESSION_DIR = path.join(os.homedir(), '.playwright-sessions');

// Parse command line arguments
function parseArgs(args) {
  const options = {
    url: null,
    output: null,
    width: 1280,
    height: 800,
    duration: 5,
    fps: 10,
    execute: null,
    wait: 500,
    dark: false,
    session: null,
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
      case '--width':
        options.width = parseInt(args[++i], 10);
        break;
      case '--height':
        options.height = parseInt(args[++i], 10);
        break;
      case '--duration':
        options.duration = parseFloat(args[++i]);
        break;
      case '--fps':
        options.fps = parseInt(args[++i], 10);
        break;
      case '--execute':
        options.execute = args[++i];
        break;
      case '--wait':
        options.wait = parseInt(args[++i], 10);
        break;
      case '--dark':
        options.dark = true;
        break;
      case '--session':
        options.session = args[++i];
        break;
    }
  }

  return options;
}

// Check if ffmpeg is installed
function checkFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    return true;
  } catch {
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

  const outputExt = path.extname(options.output).toLowerCase();
  if (!['.gif', '.mp4', '.webm'].includes(outputExt)) {
    console.error('Error: Output must be .gif, .mp4, or .webm');
    process.exit(1);
  }

  // Check ffmpeg for GIF conversion
  if (outputExt === '.gif' && !checkFfmpeg()) {
    console.error('Error: ffmpeg is required for GIF output. Install with: brew install ffmpeg');
    process.exit(1);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(options.output);
  if (outputDir && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Check for session file
  let storageState = undefined;
  if (options.session) {
    const sessionPath = path.join(SESSION_DIR, `${options.session}.json`);
    if (fs.existsSync(sessionPath)) {
      console.log(`Using session: ${options.session}`);
      storageState = sessionPath;
    } else {
      console.error(`Error: Session '${options.session}' not found.`);
      console.error(`Run: node save-session.cjs --session ${options.session}`);
      process.exit(1);
    }
  }

  // Create temp directory for video recording
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-capture-'));
  const tempVideoPath = path.join(tempDir, 'recording.webm');

  // Launch browser with video recording
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    // Create context with video recording enabled and optional session
    const context = await browser.newContext({
      viewport: {
        width: options.width,
        height: options.height,
      },
      deviceScaleFactor: 2,
      colorScheme: options.dark ? 'dark' : 'light',
      storageState: storageState,
      recordVideo: {
        dir: tempDir,
        size: { width: options.width, height: options.height },
      },
    });

    const page = await context.newPage();

    // Navigate to URL
    console.log(`Navigating to: ${options.url}`);
    await page.goto(options.url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Execute custom JavaScript if provided
    if (options.execute) {
      console.log('Executing custom script...');
      await page.evaluate(options.execute);
    }

    // Wait before starting the "recording window"
    if (options.wait > 0) {
      console.log(`Waiting ${options.wait}ms...`);
      await page.waitForTimeout(options.wait);
    }

    // Record for specified duration
    console.log(`Recording for ${options.duration} seconds...`);
    await page.waitForTimeout(options.duration * 1000);

    // Close page to save video
    await page.close();

    // Get the video file path
    const videoPath = await page.video().path();
    console.log(`Raw video saved to: ${videoPath}`);

    // Close context and browser
    await context.close();
    await browser.close();

    // Convert based on output format
    if (outputExt === '.gif') {
      console.log('Converting to GIF...');
      // Two-pass GIF creation for better quality
      // First, generate a palette
      const palettePath = path.join(tempDir, 'palette.png');
      execSync(
        `ffmpeg -y -i "${videoPath}" -vf "fps=${options.fps},scale=${options.width}:-1:flags=lanczos,palettegen=stats_mode=diff" "${palettePath}"`,
        { stdio: 'pipe' }
      );
      // Then use the palette to create the GIF
      execSync(
        `ffmpeg -y -i "${videoPath}" -i "${palettePath}" -lavfi "fps=${options.fps},scale=${options.width}:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" "${options.output}"`,
        { stdio: 'pipe' }
      );
    } else if (outputExt === '.mp4') {
      console.log('Converting to MP4...');
      execSync(
        `ffmpeg -y -i "${videoPath}" -c:v libx264 -preset slow -crf 22 -an "${options.output}"`,
        { stdio: 'pipe' }
      );
    } else {
      // WebM - just copy
      fs.copyFileSync(videoPath, options.output);
    }

    console.log(`Video saved: ${options.output}`);

    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (err) {
    await browser.close();
    // Cleanup temp directory on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    throw err;
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  console.log(`
Tutorial Video Capture Tool

Records a video of a web page, useful for capturing animated content like GIFs.

Usage:
  node record-video.js --url URL --output path.gif [options]

Options:
  --url           URL to capture (required)
  --output        Output file path - .gif, .mp4, or .webm (required)
  --width         Viewport width (default: 1280)
  --height        Viewport height (default: 800)
  --duration      Recording duration in seconds (default: 5)
  --fps           Frames per second for GIF output (default: 10)
  --execute       JavaScript to run before recording
  --wait          Milliseconds to wait before recording (default: 500)
  --dark          Use dark color scheme preference
  --session       Named session for authenticated captures (use save-session.cjs first)

Examples:
  # Record 5-second GIF
  node record-video.js --url http://localhost:5173 --output animation.gif --duration 5

  # Record MP4 video
  node record-video.js --url http://localhost:5173 --output video.mp4 --duration 10

  # Higher framerate GIF
  node record-video.js --url http://localhost:5173 --output smooth.gif --fps 15 --duration 3

  # Record with saved session (authenticated)
  node record-video.js --url https://github.com/settings --session github --output github-settings.gif

Prerequisites:
  - ffmpeg must be installed for GIF output: brew install ffmpeg
`);
  process.exit(0);
}

const options = parseArgs(args);
recordVideo(options).catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});