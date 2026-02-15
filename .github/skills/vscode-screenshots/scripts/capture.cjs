#!/usr/bin/env node

/**
 * VSCode Screenshot Capture - Semi-automated screenshot tool
 *
 * This script provides a semi-automated workflow for capturing VSCode screenshots:
 * 1. Displays setup instructions to the user
 * 2. Waits for the user to press Enter
 * 3. Captures the active window using platform-specific tools
 *
 * Usage:
 *   node capture.cjs --output path.png [options]
 *
 * Options:
 *   --output        Output file path (required)
 *   --instructions  Setup instructions to display
 *   --delay         Seconds to wait after Enter before capture (default: 5)
 *   --width         Suggested window width (for display only)
 *   --height        Suggested window height (for display only)
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const os = require('os');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

// Box drawing characters
const box = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
  horizontalDown: '┬',
  horizontalUp: '┴',
  verticalRight: '├',
  verticalLeft: '┤',
};

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    output: null,
    instructions: 'Set up VSCode as needed',
    delay: 5,
    width: 1280,
    height: 800,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--output':
        options.output = args[++i];
        break;
      case '--instructions':
        options.instructions = args[++i];
        break;
      case '--delay':
        options.delay = parseFloat(args[++i]);
        break;
      case '--width':
        options.width = parseInt(args[++i], 10);
        break;
      case '--height':
        options.height = parseInt(args[++i], 10);
        break;
      case '--help':
        showHelp();
        process.exit(0);
    }
  }

  return options;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
${colors.bold}VSCode Screenshot Capture${colors.reset}

Semi-automated tool for capturing VSCode window screenshots.

${colors.bold}Usage:${colors.reset}
  node capture.cjs --output path.png [options]

${colors.bold}Options:${colors.reset}
  --output        Output file path (required)
  --instructions  Setup instructions to display to user
  --delay         Seconds to wait after Enter before capture (default: 5)
  --width         Suggested window width (displayed in instructions)
  --height        Suggested window height (displayed in instructions)
  --help          Show this help message

${colors.bold}Examples:${colors.reset}
  # Basic capture
  node capture.cjs --output screenshot.png

  # With setup instructions
  node capture.cjs --output vscode-scm.png \\
    --instructions "Open Source Control: Cmd+Shift+G"

  # With dimension reminder
  node capture.cjs --output wide-shot.png \\
    --width 1440 --height 900 \\
    --instructions "Show the file explorer"

${colors.bold}Platform Support:${colors.reset}
  macOS   - Uses screencapture with window ID from AppleScript
  Linux   - Uses gnome-screenshot, scrot, or ImageMagick import
  Windows - Not yet supported
`);
}

/**
 * Detect the current platform
 */
function detectPlatform() {
  const platform = os.platform();
  if (platform === 'darwin') return 'macos';
  if (platform === 'linux') return 'linux';
  if (platform === 'win32') return 'windows';
  return 'unknown';
}

/**
 * Check if a command exists
 */
function commandExists(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the VSCode window ID on macOS using AppleScript
 */
function getMacOSVSCodeWindowId() {
  const script = `
    tell application "System Events"
      set vscodeProcess to first process whose name contains "Code"
      set vscodeWindow to first window of vscodeProcess
      return id of vscodeWindow
    end tell
  `;

  try {
    const result = execSync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return result;
  } catch (error) {
    // Fallback: try to get window ID using CGWindowListCopyWindowInfo
    return getMacOSWindowIdFallback();
  }
}

/**
 * Fallback method to get VSCode window ID on macOS
 */
function getMacOSWindowIdFallback() {
  // Use JXA (JavaScript for Automation) to get window list
  const script = `
    ObjC.import('CoreGraphics');
    ObjC.import('Cocoa');
    
    const windowList = $.CGWindowListCopyWindowInfo($.kCGWindowListOptionOnScreenOnly, $.kCGNullWindowID);
    const windows = ObjC.deepUnwrap(windowList);
    
    for (const win of windows) {
      const ownerName = win.kCGWindowOwnerName || '';
      const windowName = win.kCGWindowName || '';
      if (ownerName.includes('Code') || ownerName === 'Electron') {
        // Return the window number (ID)
        JSON.stringify({ id: win.kCGWindowNumber, name: windowName, owner: ownerName });
      }
    }
  `;

  try {
    // Simpler approach: just use the app name for screencapture
    const result = execSync(
      `osascript -l JavaScript -e 'Application("Visual Studio Code").windows[0].id()'`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    return result;
  } catch {
    return null;
  }
}

/**
 * Capture screenshot on macOS
 */
function captureMacOS(outputPath) {
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (outputDir && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Try to get VSCode window ID
  const windowId = getMacOSVSCodeWindowId();

  if (windowId) {
    // Capture specific window by ID
    try {
      execSync(`screencapture -l${windowId} -o -x "${outputPath}"`, {
        stdio: 'inherit',
      });
      return true;
    } catch {
      // Fall through to interactive capture
    }
  }

  // Fallback: Use interactive window capture
  console.log(
    `${colors.yellow}Note: Using interactive capture. Click on the VSCode window.${colors.reset}`
  );
  try {
    execSync(`screencapture -o -x -w "${outputPath}"`, {
      stdio: 'inherit',
    });
    return true;
  } catch (error) {
    console.error(`${colors.red}Screenshot capture failed: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Capture screenshot on Linux
 */
function captureLinux(outputPath) {
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (outputDir && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Try different screenshot tools in order of preference
  const tools = [
    {
      name: 'gnome-screenshot',
      check: () => commandExists('gnome-screenshot'),
      capture: () => execSync(`gnome-screenshot -w -f "${outputPath}"`, { stdio: 'inherit' }),
    },
    {
      name: 'scrot',
      check: () => commandExists('scrot'),
      capture: () => execSync(`scrot -u "${outputPath}"`, { stdio: 'inherit' }),
    },
    {
      name: 'import (ImageMagick)',
      check: () => commandExists('import') && commandExists('xdotool'),
      capture: () => {
        const windowId = execSync('xdotool getactivewindow', { encoding: 'utf8' }).trim();
        execSync(`import -window ${windowId} "${outputPath}"`, { stdio: 'inherit' });
      },
    },
    {
      name: 'maim',
      check: () => commandExists('maim') && commandExists('xdotool'),
      capture: () => {
        const windowId = execSync('xdotool getactivewindow', { encoding: 'utf8' }).trim();
        execSync(`maim -i ${windowId} "${outputPath}"`, { stdio: 'inherit' });
      },
    },
  ];

  for (const tool of tools) {
    if (tool.check()) {
      try {
        console.log(`${colors.dim}Using ${tool.name}...${colors.reset}`);
        tool.capture();
        return true;
      } catch (error) {
        console.error(
          `${colors.yellow}${tool.name} failed, trying next tool...${colors.reset}`
        );
      }
    }
  }

  console.error(`
${colors.red}No screenshot tool found!${colors.reset}

Please install one of the following:
  - gnome-screenshot: ${colors.dim}sudo apt install gnome-screenshot${colors.reset}
  - scrot: ${colors.dim}sudo apt install scrot${colors.reset}
  - ImageMagick + xdotool: ${colors.dim}sudo apt install imagemagick xdotool${colors.reset}
  - maim + xdotool: ${colors.dim}sudo apt install maim xdotool${colors.reset}
`);
  return false;
}

/**
 * Wrap text to fit within a given width
 */
function wrapText(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxWidth) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

/**
 * Display the instruction box
 */
function displayInstructionBox(options) {
  const boxWidth = 65;
  const contentWidth = boxWidth - 4; // Account for borders and padding

  const horizontalLine = box.horizontal.repeat(boxWidth - 2);

  console.log('\n');
  console.log(`${colors.cyan}${box.topLeft}${horizontalLine}${box.topRight}${colors.reset}`);
  console.log(
    `${colors.cyan}${box.vertical}${colors.reset}  ${colors.bold}VSCode Screenshot Capture${colors.reset}${' '.repeat(boxWidth - 29)}${colors.cyan}${box.vertical}${colors.reset}`
  );
  console.log(
    `${colors.cyan}${box.verticalRight}${horizontalLine}${box.verticalLeft}${colors.reset}`
  );
  console.log(
    `${colors.cyan}${box.vertical}${colors.reset}${' '.repeat(boxWidth - 2)}${colors.cyan}${box.vertical}${colors.reset}`
  );

  // Instructions
  console.log(
    `${colors.cyan}${box.vertical}${colors.reset}  ${colors.bold}Please set up VSCode:${colors.reset}${' '.repeat(boxWidth - 25)}${colors.cyan}${box.vertical}${colors.reset}`
  );
  console.log(
    `${colors.cyan}${box.vertical}${colors.reset}${' '.repeat(boxWidth - 2)}${colors.cyan}${box.vertical}${colors.reset}`
  );

  // Wrap and display instructions
  const instructionLines = wrapText(options.instructions, contentWidth - 4);
  for (const line of instructionLines) {
    const paddedLine = `  → ${line}`.padEnd(boxWidth - 2);
    console.log(`${colors.cyan}${box.vertical}${colors.reset}${paddedLine}${colors.cyan}${box.vertical}${colors.reset}`);
  }

  console.log(
    `${colors.cyan}${box.vertical}${colors.reset}${' '.repeat(boxWidth - 2)}${colors.cyan}${box.vertical}${colors.reset}`
  );

  // Output path
  const outputLabel = `  Output: ${colors.dim}${options.output}${colors.reset}`;
  // Calculate visible length (without ANSI codes)
  const outputVisible = `  Output: ${options.output}`;
  const outputPadding = boxWidth - 2 - outputVisible.length;
  console.log(
    `${colors.cyan}${box.vertical}${colors.reset}${outputLabel}${' '.repeat(Math.max(0, outputPadding))}${colors.cyan}${box.vertical}${colors.reset}`
  );

  // Dimensions hint
  if (options.width || options.height) {
    const dimText = `  Suggested size: ${options.width}×${options.height}`;
    console.log(
      `${colors.cyan}${box.vertical}${colors.reset}${colors.dim}${dimText}${colors.reset}${' '.repeat(boxWidth - 2 - dimText.length)}${colors.cyan}${box.vertical}${colors.reset}`
    );
  }

  console.log(
    `${colors.cyan}${box.vertical}${colors.reset}${' '.repeat(boxWidth - 2)}${colors.cyan}${box.vertical}${colors.reset}`
  );

  // Action prompt
  const promptText = '  Press ENTER when ready to capture...';
  console.log(
    `${colors.cyan}${box.vertical}${colors.reset}${colors.yellow}${promptText}${colors.reset}${' '.repeat(boxWidth - 2 - promptText.length)}${colors.cyan}${box.vertical}${colors.reset}`
  );

  console.log(
    `${colors.cyan}${box.vertical}${colors.reset}${' '.repeat(boxWidth - 2)}${colors.cyan}${box.vertical}${colors.reset}`
  );
  console.log(
    `${colors.cyan}${box.bottomLeft}${horizontalLine}${box.bottomRight}${colors.reset}`
  );
  console.log('');
}

/**
 * Wait for user to press Enter
 */
function waitForEnter() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('', () => {
      rl.close();
      resolve();
    });
  });
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Main capture function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    showHelp();
    process.exit(0);
  }

  const options = parseArgs(args);

  // Validate required options
  if (!options.output) {
    console.error(`${colors.red}Error: --output is required${colors.reset}`);
    process.exit(1);
  }

  // Detect platform
  const platform = detectPlatform();

  if (platform === 'windows') {
    console.error(`
${colors.red}Windows is not yet supported.${colors.reset}

Please take a manual screenshot and save it to:
  ${options.output}

Keyboard shortcut: Win+Shift+S (Snip & Sketch)
`);
    process.exit(1);
  }

  if (platform === 'unknown') {
    console.error(`${colors.red}Unknown platform: ${os.platform()}${colors.reset}`);
    process.exit(1);
  }

  // Display instruction box
  displayInstructionBox(options);

  // Wait for user to press Enter
  await waitForEnter();

  // Wait the specified delay with countdown
  if (options.delay > 0) {
    console.log(`${colors.yellow}Navigate to the view you want to capture...${colors.reset}`);
    for (let i = options.delay; i > 0; i--) {
      process.stdout.write(`\r${colors.dim}Capturing in ${i}s...${colors.reset}  `);
      await sleep(1000);
    }
    process.stdout.write('\r' + ' '.repeat(30) + '\r');
  }

  // Capture screenshot
  console.log(`${colors.blue}Capturing screenshot...${colors.reset}`);

  let success = false;
  if (platform === 'macos') {
    success = captureMacOS(options.output);
  } else if (platform === 'linux') {
    success = captureLinux(options.output);
  }

  if (success && fs.existsSync(options.output)) {
    const stats = fs.statSync(options.output);
    const sizeKB = Math.round(stats.size / 1024);
    console.log(`
${colors.green}✓ Screenshot saved!${colors.reset}
  Path: ${options.output}
  Size: ${sizeKB} KB
`);
  } else {
    console.error(`${colors.red}✗ Screenshot capture failed${colors.reset}`);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});