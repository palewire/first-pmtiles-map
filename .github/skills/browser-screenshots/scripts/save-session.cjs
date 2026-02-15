#!/usr/bin/env node

/**
 * save-session.js - Save browser session for authenticated screenshots
 *
 * Opens a browser window where you can log into sites. When you close the
 * browser, the session (cookies, localStorage, etc.) is saved for use with
 * capture.js and record-video.js.
 *
 * Usage:
 *   node save-session.js --url https://github.com --session github
 *
 * Options:
 *   --url           URL to open for login (default: https://github.com)
 *   --session       Session name to save as (default: default)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Session storage directory
const SESSION_DIR = path.join(os.homedir(), '.playwright-sessions');

// Parse command line arguments
function parseArgs(args) {
  const options = {
    url: 'https://github.com',
    session: 'default',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--url':
        options.url = args[++i];
        break;
      case '--session':
        options.session = args[++i];
        break;
    }
  }

  return options;
}

async function saveSession(options) {
  // Ensure session directory exists
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  const sessionPath = path.join(SESSION_DIR, `${options.session}.json`);

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    Browser Session Saver                       ║
╠════════════════════════════════════════════════════════════════╣
║  A browser window will open. Log in to the site as needed.     ║
║  When finished, close the browser window to save your session. ║
╚════════════════════════════════════════════════════════════════╝
`);

  console.log(`Opening: ${options.url}`);
  console.log(`Session will be saved as: ${options.session}`);
  console.log(`Session file: ${sessionPath}\n`);

  // Launch browser in headed mode for user interaction
  const browser = await chromium.launch({
    headless: false,
  });

  try {
    // Create context
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();

    // Navigate to URL
    await page.goto(options.url, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    console.log('Browser opened. Log in and then close the browser window when done...\n');

    // Wait for browser to be closed by user
    await new Promise((resolve) => {
      browser.on('disconnected', resolve);
    });

    // This won't be reached if browser is closed by user, so we need
    // to save before disconnect
  } catch (err) {
    if (err.message.includes('Target closed')) {
      // Browser was closed, this is expected
    } else {
      throw err;
    }
  }

  // If we get here without saving, the browser was closed unexpectedly
  // We need a different approach - save on page close
  console.log('Browser closed without saving session.');
  console.log('Note: To save session, keep the browser open and we\'ll save on context close.');
}

async function saveSessionInteractive(options) {
  // Ensure session directory exists
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  const sessionPath = path.join(SESSION_DIR, `${options.session}.json`);

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    Browser Session Saver                       ║
╠════════════════════════════════════════════════════════════════╣
║  A browser window will open. Log in to the site as needed.     ║
║  Press ENTER in this terminal when done to save and close.     ║
╚════════════════════════════════════════════════════════════════╝
`);

  console.log(`Opening: ${options.url}`);
  console.log(`Session will be saved as: ${options.session}`);
  console.log(`Session file: ${sessionPath}\n`);

  // Launch browser in headed mode for user interaction
  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  // Navigate to URL
  await page.goto(options.url, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  console.log('Browser opened. Log in and then press ENTER here when done...\n');

  // Wait for user to press Enter
  await new Promise((resolve) => {
    process.stdin.setRawMode(false);
    process.stdin.resume();
    process.stdin.once('data', resolve);
  });

  console.log('\nSaving session...');

  // Save storage state (cookies + localStorage)
  await context.storageState({ path: sessionPath });

  console.log(`Session saved to: ${sessionPath}`);
  console.log(`\nUse with capture.js:`);
  console.log(`  node capture.cjs --url URL --output out.png --session ${options.session}`);

  await browser.close();
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
Browser Session Saver

Saves authenticated browser sessions for use with screenshot capture.
Opens a browser where you can log in, then saves cookies and storage.

Usage:
  node save-session.js [options]

Options:
  --url           URL to open for login (default: https://github.com)
  --session       Session name to save as (default: default)

Examples:
  # Save GitHub session
  node save-session.js --url https://github.com --session github

  # Save session for another site
  node save-session.js --url https://example.com/login --session example

Session files are stored in: ${SESSION_DIR}

After saving, use the session with capture.js:
  node capture.cjs --url https://github.com/new --session github --output screenshot.png
`);
  process.exit(0);
}

if (args.includes('--list')) {
  if (!fs.existsSync(SESSION_DIR)) {
    console.log('No sessions saved yet.');
    process.exit(0);
  }
  
  const sessions = fs.readdirSync(SESSION_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
  
  if (sessions.length === 0) {
    console.log('No sessions saved yet.');
  } else {
    console.log('Saved sessions:');
    sessions.forEach(s => console.log(`  - ${s}`));
  }
  process.exit(0);
}

const options = parseArgs(args);
saveSessionInteractive(options).catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});