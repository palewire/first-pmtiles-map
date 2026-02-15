---
name: vscode-screenshots
description: Captures VSCode window screenshots using a semi-automated workflow. Use this when asked to capture, document, or screenshot VSCode, terminal output, or other desktop application states.
---

# VSCode Screenshot Capture

Capture screenshots of Visual Studio Code using a semi-automated workflow. This skill displays setup instructions to the user, waits for confirmation, then captures the active VSCode window.

## When to Use

Use this skill when the user asks you to:
- Capture a screenshot of VSCode in a specific state
- Document VSCode UI elements (Source Control, Extensions, Copilot Chat, etc.)
- Take screenshots of terminal output
- Capture any desktop application window (not just browsers)

**For web pages and browser content, use the `browser-screenshots` skill instead.**

## How to Capture

Use the capture script located at `.github/skills/vscode-screenshots/scripts/capture.cjs`.

### Basic Usage

```bash
node .github/skills/vscode-screenshots/scripts/capture.cjs \
  --output static/screenshots/week-1/vscode-welcome.png \
  --instructions "Show the VSCode Welcome tab"
```

The script will:
1. Display the setup instructions in a formatted box
2. Wait for the user to press Enter
3. Capture the active VSCode window
4. Save to the specified output path

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--output` | Output file path (required) | - |
| `--instructions` | Setup instructions for the user | "Set up VSCode as needed" |
| `--delay` | Seconds to wait after Enter before capture (with countdown) | 5 |
| `--width` | Suggested window width (displayed in instructions) | 1280 |
| `--height` | Suggested window height (displayed in instructions) | 800 |

### Examples

**Capture the Source Control panel:**
```bash
node .github/skills/vscode-screenshots/scripts/capture.cjs \
  --output static/screenshots/week-1/vscode-source-control.png \
  --instructions "Open Source Control panel: Cmd+Shift+G (Mac) or Ctrl+Shift+G (Linux/Windows)"
```

**Capture Extensions marketplace:**
```bash
node .github/skills/vscode-screenshots/scripts/capture.cjs \
  --output static/screenshots/week-1/vscode-extensions.png \
  --instructions "Open Extensions: Cmd+Shift+X (Mac) or Ctrl+Shift+X (Linux/Windows)"
```

**Capture Copilot Chat panel:**
```bash
node .github/skills/vscode-screenshots/scripts/capture.cjs \
  --output static/screenshots/week-1/vscode-copilot-chat.png \
  --instructions "Open Copilot Chat: Cmd+Shift+I (Mac) or Ctrl+Shift+I (Linux/Windows)"
```

**Capture a specific file open:**
```bash
node .github/skills/vscode-screenshots/scripts/capture.cjs \
  --output static/screenshots/week-1/vscode-readme.png \
  --instructions "Open README.md in the editor"
```

**Capture with custom dimensions reminder:**
```bash
node .github/skills/vscode-screenshots/scripts/capture.cjs \
  --output static/screenshots/week-1/vscode-wide.png \
  --width 1440 \
  --height 900 \
  --instructions "Resize window to approximately 1440x900, then show the file explorer"
```

## Common VSCode Keyboard Shortcuts

Include these in your instructions to help users:

| Action | Mac | Linux/Windows |
|--------|-----|---------------|
| File Explorer | Cmd+Shift+E | Ctrl+Shift+E |
| Source Control | Cmd+Shift+G | Ctrl+Shift+G |
| Extensions | Cmd+Shift+X | Ctrl+Shift+X |
| Copilot Chat | Cmd+Shift+I | Ctrl+Shift+I |
| Terminal | Cmd+` | Ctrl+` |
| Problems | Cmd+Shift+M | Ctrl+Shift+M |
| Command Palette | Cmd+Shift+P | Ctrl+Shift+P |
| Markdown Preview | Cmd+Shift+V | Ctrl+Shift+V |

## Saving Screenshots

Save to `/static/screenshots/week-{week}/` with descriptive kebab-case filenames.

**Naming convention:**
- ✅ `vscode-source-control.png`
- ✅ `vscode-readme-preview.png`
- ✅ `vscode-copilot-response.png`
- ❌ `VSCodeSourceControl.png`

**Directory structure:**
```
static/screenshots/
  week-1/
    vscode-welcome.png
    vscode-source-control.png
    github-homepage.png  (from browser-screenshots)
  week-2/
    ...
```

## Embedding in Tutorials

When embedding in `.svx` files, use the Screenshot component **without** browser chrome:

```svelte
<script>
  import Screenshot from '$lib/components/Screenshot.svelte';
</script>

<Screenshot 
  src="/screenshots/week-1/vscode-source-control.png" 
  alt="VSCode Source Control panel showing staged changes"
  showChrome={false}
/>
```

**Note:** VSCode screenshots should use `showChrome={false}` since they already have the VSCode window frame.

## Platform Support

| Platform | Screenshot Method |
|----------|-------------------|
| **macOS** | `screencapture` with window ID from AppleScript |
| **Linux** | `gnome-screenshot`, `scrot`, or ImageMagick `import` |
| **Windows** | Not yet supported (manual screenshots required) |

The script auto-detects the platform and uses the appropriate tool.

### Linux Dependencies

On Linux, ensure one of these tools is installed:
- `gnome-screenshot` (GNOME desktop)
- `scrot` (`sudo apt install scrot`)
- `import` from ImageMagick (`sudo apt install imagemagick`)
- `xdotool` for active window detection (`sudo apt install xdotool`)

## Limitations

- **Semi-automated:** Requires user interaction (cannot run unattended)
- **Active window only:** Captures whichever window is focused
- **Cannot capture:** OS dialogs, authentication popups, tooltips
- **Windows:** Not yet supported

## Troubleshooting

**"No screenshot tool found"**: Install one of the supported tools (see Linux Dependencies)

**Screenshot shows wrong window**: Make sure VSCode is the active/focused window when the countdown finishes

**Window dimensions wrong**: The script shows suggested dimensions; manually resize VSCode before capturing

## Workflow Tips

**When running from Cline (VSCode integrated terminal):**

1. Run the capture command - the instruction box appears
2. Press Enter to start the 5-second countdown  
3. Quickly navigate away from the terminal tab (click on an editor tab or use Cmd+1)
4. Set up the VSCode view you want during the countdown
5. When the interactive capture triggers, click on the VSCode window

The 5-second default delay gives you time to switch away from the terminal output before the screenshot is taken. You can adjust with `--delay 10` for more time or `--delay 0` to capture immediately.
