---
name: browser-screenshots
description: Captures browser screenshots and videos on request using Playwright for embedding in tutorials. Use this when asked to capture, document, screenshot, or record a web page or locally running development server.
---

# Browser Screenshot & Video Capture

Capture browser screenshots and record videos when the user requests them. This skill uses Playwright-based scripts to automate browser interactions and save screenshots or videos directly to disk.

## When to Use

Use this skill when the user asks you to:

- Capture a screenshot of a specific URL
- Document a web page or web application state
- Take screenshots of a locally running development server
- Capture a sequence of browser interactions
- Record a video or GIF of a page with animations
- Create looping videos to showcase animated content

## How to Capture

Use the Playwright capture script located at `.github/skills/browser-screenshots/scripts/capture.cjs`.

### Basic Screenshot

```bash
node .github/skills/browser-screenshots/scripts/capture.cjs \
  --url https://example.com \
  --output docs/_static/screenshots/example-homepage.png
```

### Common Options

| Option              | Description                               | Default |
| ------------------- | ----------------------------------------- | ------- |
| `--url`             | URL to capture (required)                 | -       |
| `--output`          | Output file path (required)               | -       |
| `--width`           | Viewport width                            | 1280    |
| `--height`          | Viewport height                           | 800     |
| `--fullpage`        | Capture full scrollable page              | false   |
| `--element`         | CSS selector to capture specific element  | -       |
| `--highlight`       | CSS selector to highlight with red border | -       |
| `--execute`         | JavaScript to run before capture          | -       |
| `--wait`            | Milliseconds to wait before capture       | 500     |
| `--waitForSelector` | CSS selector to wait for before capture   | -       |
| `--dark`            | Use dark color scheme                     | false   |
| `--chrome`          | Add a faux browser frame around the page  | false   |

### Examples

**Capture with dark mode:**

```bash
node .github/skills/browser-screenshots/scripts/capture.cjs \
  --url https://code.visualstudio.com \
  --dark \
  --output docs/_static/screenshots/vscode-homepage.png
```

**Capture with a browser frame:**

```bash
node .github/skills/browser-screenshots/scripts/capture.cjs \
  --url https://protomaps.com \
  --chrome \
  --waitForSelector "main" \
  --output docs/_static/screenshots/what-you-will-make/protomaps-home-framed.png
```

**Highlight a specific element:**

```bash
node .github/skills/browser-screenshots/scripts/capture.cjs \
  --url https://github.com/new \
  --highlight ".repo-name-input" \
  --output docs/_static/screenshots/github-repo-name.png
```

**Capture a specific element only:**

```bash
node .github/skills/browser-screenshots/scripts/capture.cjs \
  --url https://example.com \
  --element ".hero-section" \
  --output docs/_static/screenshots/hero-only.png
```

**Execute JavaScript before capture (e.g., click a button):**

```bash
node .github/skills/browser-screenshots/scripts/capture.cjs \
  --url https://example.com \
  --execute "document.querySelector('button').click()" \
  --wait 1000 \
  --output docs/_static/screenshots/after-click.png
```

**Full page screenshot:**

```bash
node .github/skills/browser-screenshots/scripts/capture.cjs \
  --url https://example.com \
  --fullpage \
  --output docs/_static/screenshots/full-page.png
```

## Saving Screenshots

For this repo's Sphinx docs, save screenshots under `docs/_static/screenshots/` with descriptive kebab-case filenames.

**Naming convention:** Use kebab-case:

- ✅ `github-new-repo.png`
- ✅ `homepage-hero-section.png`
- ❌ `GitHubNewRepo.png`

**Directory structure (recommended):**

```
docs/_static/
  screenshots/
    create-map/
      bare-basemap.png
      storm-tracks-lines.png
    build-tiles/
      download-zip.png
```

## Embedding in Sphinx/MyST Docs

This repo's tutorial docs are written in MyST Markdown and built with Sphinx (see `docs/conf.py`). For screenshots, embed images using MyST/Sphinx conventions.

### Preferred: MyST `figure` (caption + alt)

Use this in a `docs/*.md` page:

```md
:::{figure} \_static/screenshots/create-map/bare-basemap.png
:alt: Bare basemap running locally
:width: 100%

Bare basemap running locally.
:::
```

Notes:

- Paths are relative to the `docs/` source root.
- Put the file itself at `docs/_static/screenshots/...`.

### Simple inline image (no caption)

```md
![Bare basemap running locally](_static/screenshots/create-map/bare-basemap.png)
```

## Recording Videos

Use the video recording script for pages with animations, GIFs, or dynamic content that needs to be captured over time.

### Basic Video Recording

```bash
node .github/skills/browser-screenshots/scripts/record-video.cjs \
  --url https://example.com \
  --output docs/_static/screenshots/animation.gif \
  --duration 5
```

### Video Recording Options

| Option       | Description                                        | Default |
| ------------ | -------------------------------------------------- | ------- |
| `--url`      | URL to capture (required)                          | -       |
| `--output`   | Output file path - .gif, .mp4, or .webm (required) | -       |
| `--width`    | Viewport width                                     | 1280    |
| `--height`   | Viewport height                                    | 800     |
| `--duration` | Recording duration in seconds                      | 5       |
| `--fps`      | Frames per second for GIF output                   | 10      |
| `--execute`  | JavaScript to run before recording                 | -       |
| `--wait`     | Milliseconds to wait before recording              | 500     |
| `--dark`     | Use dark color scheme                              | false   |

### Video Examples

**Record a 5-second GIF:**

```bash
node .github/skills/browser-screenshots/scripts/record-video.cjs \
  --url https://example.com \
  --output docs/_static/screenshots/demo.gif \
  --duration 5
```

**Record MP4 video:**

```bash
node .github/skills/browser-screenshots/scripts/record-video.cjs \
  --url https://example.com \
  --output docs/_static/videos/demo.mp4 \
  --duration 10
```

**Higher framerate GIF for smoother animation:**

```bash
node .github/skills/browser-screenshots/scripts/record-video.cjs \
  --url https://example.com \
  --output docs/_static/screenshots/smooth.gif \
  --fps 15 \
  --duration 3
```

### Embedding Videos in Tutorials

For GIFs, embed them like screenshots (MyST `figure` or Markdown image).

For MP4/WebM, use a raw HTML block in a `docs/*.md` page:

````md
```{raw} html
<video autoplay loop muted playsinline width="100%">
  <source src="_static/videos/demo.mp4" type="video/mp4" />
</video>
```
````

````

## Authenticated Sessions

Some pages require login to display certain elements (e.g., the "Use this template" button on GitHub). You can save authenticated sessions and reuse them for captures.

### Saving a Session

Run the session saver script, which opens a browser where you can log in:

```bash
node .github/skills/browser-screenshots/scripts/save-session.cjs \
  --url https://github.com \
  --session github
````

This opens a browser window. Log in to the site, then press Enter in the terminal to save your session. Sessions are stored in `~/.playwright-sessions/`.

### Using a Saved Session

Add the `--session` flag to capture or record commands:

```bash
# Screenshot with GitHub session
node .github/skills/browser-screenshots/scripts/capture.cjs \
  --url https://github.com/palewire/cuny-jour-static-site-template \
  --session github \
  --output docs/_static/screenshots/github-repo.png

# Video with GitHub session
node .github/skills/browser-screenshots/scripts/record-video.cjs \
  --url https://github.com/settings \
  --session github \
  --output docs/_static/screenshots/github-settings.gif
```

### Listing Saved Sessions

```bash
node .github/skills/browser-screenshots/scripts/save-session.cjs --list
```

### Session Options

| Option      | Description             | Default            |
| ----------- | ----------------------- | ------------------ |
| `--url`     | URL to open for login   | https://github.com |
| `--session` | Name to save session as | default            |
| `--list`    | List all saved sessions | -                  |

## Prerequisites

Playwright must be installed. If not already installed:

```bash
npm init -y
npm install playwright
npx playwright install chromium
```

For GIF output, ffmpeg must also be installed:

```bash
brew install ffmpeg
```

## Limitations

- **Cannot capture:** VS Code windows, terminal output, system dialogs (these require manual screenshots)
- **Requires network access:** URLs must be reachable from the machine running the script
- **GIF output requires ffmpeg:** Install via `brew install ffmpeg` on macOS
- **Sessions expire:** Saved sessions will expire based on the site's cookie policies; re-run save-session when needed
