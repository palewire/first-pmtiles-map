---
name: page-scroll-video
description: Records short videos of web pages with smooth scrolling animation and browser chrome frame. Use this when asked to create promotional videos or demos that scroll through a web page for social media.
---

# Page Scroll Video Recording

Record short promotional videos of web pages that scroll down the page wrapped in a realistic macOS-style browser chrome frame. Perfect for social media promotion on Twitter/LinkedIn.

## When to Use

Use this skill when the user asks you to:

- Create a promotional video of a web page
- Record a scrolling demo of a website
- Generate social media content showing a page
- Make a GIF of a web page scrolling

## How to Record

Use the Playwright-based recording script located at `.github/skills/page-scroll-video/scripts/record.cjs`.

### Basic Recording

```bash
node .github/skills/page-scroll-video/scripts/record.cjs \
  --url http://localhost:5173 \
  --output static/videos/homepage-scroll.mp4
```

This generates both:

- `static/videos/homepage-scroll.mp4` - High quality MP4 video (H.264)
- `static/videos/homepage-scroll.gif` - Animated GIF for quick sharing

### Options

| Option       | Description                       | Default                 |
| ------------ | --------------------------------- | ----------------------- |
| `--url`      | URL to record (required)          | -                       |
| `--output`   | Output MP4 file path (required)   | -                       |
| `--duration` | Scroll duration in seconds        | `10`                    |
| `--speed`    | Scroll speed in pixels per second | `300`                   |
| `--title`    | Custom browser title bar text     | Auto-detected from page |
| `--no-gif`   | Skip GIF generation               | false                   |
| `--width`    | Viewport width                    | `900`                   |
| `--height`   | Viewport height                   | `900`                   |

### Examples

**Record for 10 seconds at default speed (300 px/s):**

```bash
node .github/skills/page-scroll-video/scripts/record.cjs \
  --url http://localhost:5173 \
  --output static/videos/homepage-scroll.mp4
```

**Record for 15 seconds:**

```bash
node .github/skills/page-scroll-video/scripts/record.cjs \
  --url http://localhost:5173 \
  --output static/videos/homepage-scroll.mp4 \
  --duration 15
```

**Record with faster scrolling (500 px/s):**

```bash
node .github/skills/page-scroll-video/scripts/record.cjs \
  --url http://localhost:5173 \
  --output static/videos/homepage-scroll.mp4 \
  --speed 500
```

**Record a script page with custom title:**

```bash
node .github/skills/page-scroll-video/scripts/record.cjs \
  --url http://localhost:5173/scripts/week-1 \
  --output static/videos/week-1-scroll.mp4 \
  --title "Week 1: Hello, World"
```

**Skip GIF generation (MP4 only):**

```bash
node .github/skills/page-scroll-video/scripts/record.cjs \
  --url http://localhost:5173 \
  --output static/videos/homepage-scroll.mp4 \
  --no-gif
```

## Output

### Video Specifications

- **Resolution:** 900×900 (square format, optimized for social media)
- **Format:** MP4 (H.264) for maximum compatibility
- **Frame rate:** 60fps scroll animation
- **Browser chrome:** Realistic macOS-style window frame with:
  - Traffic lights (red/yellow/green buttons)
  - Title bar with page title
  - Address bar with lock icon and URL
  - Frame borders on all sides

### GIF Specifications

- **Resolution:** 450px wide (half size for smaller file)
- **Frame rate:** 15fps
- **Optimized:** Two-pass palette optimization for smaller file size
- **Looping:** Infinite loop (`-loop 0`)

## Saving Videos

Save to `/static/videos/` with descriptive kebab-case filenames.

**Naming convention:**

- ✅ `homepage-scroll.mp4`
- ✅ `week-1-scroll.mp4`
- ❌ `HomepageScroll.mp4`

**Directory structure:**

```
static/videos/
  homepage-scroll.mp4
  homepage-scroll.gif
  week-1-scroll.mp4
  week-1-scroll.gif
```

## Prerequisites

1. **Playwright** must be installed:

   ```bash
   npm install playwright
   npx playwright install chromium
   ```

2. **ffmpeg** must be installed for MP4/GIF conversion:
   ```bash
   brew install ffmpeg
   ```

## How It Works

1. Launches a headless Chromium browser with video recording enabled
2. Navigates to the target URL
3. Injects browser chrome overlay (title bar, address bar, frame borders) as CSS/HTML
4. Waits for chrome to settle (prevents visual artifacts)
5. Scrolls down at constant speed for the specified duration
6. Closes browser and saves WebM recording
7. Converts WebM to MP4 using ffmpeg (H.264, trimming settling time)
8. Generates optimized GIF from MP4 using two-pass palette method

## Limitations

- **File size:** Longer durations produce larger videos. For very long pages, consider using faster scroll speed.
- **Dynamic content:** Heavy JavaScript sites may need the page to be fully loaded before recording looks correct.
