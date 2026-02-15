#!/usr/bin/env node

/**
 * capture.js - Playwright-based screenshot capture for tutorials
 *
 * Usage:
 *   node capture.js --url URL --output path.png [options]
 *
 * Options:
 *   --url           URL to capture (required)
 *   --output        Output file path (required)
 *   --width         Viewport width (default: 1280)
 *   --height        Viewport height (default: 800)
 *   --fullpage      Capture full scrollable page
 *   --element       CSS selector to capture specific element
 *   --highlight     CSS selector to highlight with red border
 *   --execute       JavaScript to run before capture
 *   --wait          Milliseconds to wait before capture (default: 500)
 *   --dark          Use dark color scheme
 *   --format        Output format: png or jpeg (default: png)
 *   --quality       JPEG quality 0-100 (default: 90)
 *   --deviceScale   Device scale factor (default: 2 for retina)
 *   --session       Named session to use for authenticated captures
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Session storage directory
const SESSION_DIR = path.join(os.homedir(), ".playwright-sessions");

// Parse command line arguments
function parseArgs(args) {
  const options = {
    url: null,
    output: null,
    width: 1280,
    height: 800,
    fullpage: false,
    element: null,
    highlight: null,
    execute: null,
    wait: 500,
    waitForSelector: null,
    dark: false,
    format: "png",
    quality: 90,
    deviceScale: 2,
    session: null,
    chrome: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--url":
        options.url = args[++i];
        break;
      case "--output":
        options.output = args[++i];
        break;
      case "--width":
        options.width = parseInt(args[++i], 10);
        break;
      case "--height":
        options.height = parseInt(args[++i], 10);
        break;
      case "--fullpage":
        options.fullpage = true;
        break;
      case "--element":
        options.element = args[++i];
        break;
      case "--highlight":
        options.highlight = args[++i];
        break;
      case "--execute":
        options.execute = args[++i];
        break;
      case "--wait":
        options.wait = parseInt(args[++i], 10);
        break;
      case "--waitForSelector":
        options.waitForSelector = args[++i];
        break;
      case "--dark":
        options.dark = true;
        break;
      case "--format":
        options.format = args[++i];
        break;
      case "--quality":
        options.quality = parseInt(args[++i], 10);
        break;
      case "--deviceScale":
        options.deviceScale = parseFloat(args[++i]);
        break;
      case "--session":
        options.session = args[++i];
        break;
      case "--chrome":
        options.chrome = true;
        break;
    }
  }

  return options;
}

async function captureScreenshot(options) {
  // Validate required options
  if (!options.url) {
    console.error("Error: --url is required");
    process.exit(1);
  }
  if (!options.output) {
    console.error("Error: --output is required");
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

  // Launch browser
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    // Create context with viewport settings and optional session
    const context = await browser.newContext({
      viewport: {
        width: options.width,
        height: options.height,
      },
      deviceScaleFactor: options.deviceScale,
      colorScheme: options.dark ? "dark" : "light",
      storageState: storageState,
    });

    const page = await context.newPage();

    // Navigate to URL
    console.log(`Navigating to: ${options.url}`);
    await page.goto(options.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Additional wait for dynamic content
    await page.waitForTimeout(1000);

    // Execute custom JavaScript if provided
    if (options.execute) {
      console.log("Executing custom script...");
      await page.evaluate(options.execute);
    }

    // Wait for a selector if provided
    if (options.waitForSelector) {
      console.log(`Waiting for selector: ${options.waitForSelector}`);
      await page.waitForSelector(options.waitForSelector, { timeout: 20000 });
    }

    // Apply faux browser chrome if requested
    if (!options.element && options.chrome) {
      console.log("Adding browser chrome frame...");
      await page.evaluate(
        ({ currentUrl, frameHeight }) => {
          const doc = document;
          const body = doc.body;

          // Outer padding/background
          body.style.margin = "0";
          // Keep the page's own background and layout; just add some breathing room
          body.style.margin = "0";
          body.style.padding = "16px";
          body.style.boxSizing = "border-box";

          const outer = doc.createElement("div");
          outer.id = "__capture_chrome_outer";
          outer.style.maxWidth = "calc(100vw - 32px)";
          outer.style.width = "100%";
          outer.style.margin = "0 auto";
          outer.style.borderRadius = "12px";
          outer.style.overflow = "visible";
          outer.style.boxShadow = "0 20px 60px rgba(0,0,0,0.25)";
          outer.style.border = "1px solid #dfe3e8";
          outer.style.background = "#fff";

          const toolbar = doc.createElement("div");
          toolbar.style.display = "flex";
          toolbar.style.alignItems = "center";
          toolbar.style.gap = "8px";
          toolbar.style.padding = "10px 14px";
          toolbar.style.background = "#f5f5f7";
          toolbar.style.borderBottom = "1px solid #e5e7eb";

          const dots = doc.createElement("div");
          dots.style.display = "flex";
          dots.style.gap = "6px";
          ["#ff5f56", "#ffbd2e", "#27c93f"].forEach((color) => {
            const dot = doc.createElement("span");
            dot.style.width = "12px";
            dot.style.height = "12px";
            dot.style.borderRadius = "50%";
            dot.style.background = color;
            dot.style.display = "inline-block";
            dots.appendChild(dot);
          });

          const address = doc.createElement("div");
          address.textContent = currentUrl.replace(/^https?:\/\//, "");
          address.style.flex = "1";
          address.style.marginLeft = "16px";
          address.style.padding = "6px 12px";
          address.style.borderRadius = "8px";
          address.style.background = "#fff";
          address.style.border = "1px solid #e5e7eb";
          address.style.font =
            '14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          address.style.color = "#374151";
          address.style.overflow = "hidden";
          address.style.textOverflow = "ellipsis";
          address.style.whiteSpace = "nowrap";

          toolbar.appendChild(dots);
          toolbar.appendChild(address);

          const content = doc.createElement("div");
          content.id = "__capture_chrome_content";
          content.style.background = "#fff";
          content.style.overflow = "visible";

          while (body.firstChild) {
            content.appendChild(body.firstChild);
          }

          outer.appendChild(toolbar);
          outer.appendChild(content);
          body.appendChild(outer);
        },
        { currentUrl: options.url, frameHeight: options.height },
      );
    }

    // Wait specified time
    if (options.wait > 0) {
      console.log(`Waiting ${options.wait}ms...`);
      await page.waitForTimeout(options.wait);
    }

    // Add highlight styling if specified
    if (options.highlight) {
      console.log(`Highlighting element: ${options.highlight}`);
      await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        if (element) {
          element.style.outline = "3px solid #FF0000";
          element.style.outlineOffset = "2px";
          element.style.borderRadius = "4px";
        } else {
          console.warn(`Element not found: ${selector}`);
        }
      }, options.highlight);
      // Small delay for style to apply
      await page.waitForTimeout(100);
    }

    // Prepare screenshot options
    const screenshotOptions = {
      path: options.output,
      type: options.format,
      fullPage: options.fullpage,
    };

    if (options.format === "jpeg") {
      screenshotOptions.quality = options.quality;
    }

    // Take screenshot
    if (options.element) {
      console.log(`Capturing element: ${options.element}`);
      const element = await page.$(options.element);
      if (element) {
        await element.screenshot(screenshotOptions);
      } else {
        console.error(`Element not found: ${options.element}`);
        process.exit(1);
      }
    } else if (options.chrome) {
      console.log("Capturing browser chrome frame...");
      const frameElement = await page.$("#__capture_chrome_outer");
      if (frameElement) {
        await frameElement.screenshot(screenshotOptions);
      } else {
        console.warn(
          "Chrome frame not found; falling back to page screenshot.",
        );
        await page.screenshot(screenshotOptions);
      }
    } else {
      console.log("Capturing screenshot...");
      await page.screenshot(screenshotOptions);
    }

    console.log(`Screenshot saved: ${options.output}`);
  } finally {
    await browser.close();
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help")) {
  console.log(`
Tutorial Screenshot Capture Tool

Usage:
  node capture.js --url URL --output path.png [options]

Options:
  --url           URL to capture (required)
  --output        Output file path (required)
  --width         Viewport width (default: 1280)
  --height        Viewport height (default: 800)
  --fullpage      Capture full scrollable page
  --element       CSS selector to capture specific element only
  --highlight     CSS selector to highlight with red border
  --execute       JavaScript to run before capture
  --wait          Milliseconds to wait before capture (default: 500)
  --dark          Use dark color scheme preference
  --format        Output format: png or jpeg (default: png)
  --quality       JPEG quality 0-100 (default: 90)
  --deviceScale   Device scale factor for retina (default: 2)
  --session       Named session for authenticated captures (use save-session.cjs first)

Examples:
  # Basic screenshot
  node capture.js --url http://localhost:5173 --output screenshot.png

  # Full page with dark mode
  node capture.js --url http://localhost:5173 --fullpage --dark --output full.png

  # Highlight a button
  node capture.js --url http://localhost:5173 --highlight ".submit-btn" --output highlighted.png

  # Capture specific element
  node capture.js --url http://localhost:5173 --element ".chart" --output chart.png

  # Execute script before capture
  node capture.js --url http://localhost:5173 --execute "document.querySelector('button').click()" --wait 1000 --output after-click.png

  # Capture with saved session (authenticated)
  node capture.js --url https://github.com/new --session github --output github-new-repo.png
`);
  process.exit(0);
}

const options = parseArgs(args);
captureScreenshot(options).catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
