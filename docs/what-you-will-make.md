# What you will make

If you work through this class, you will create an interactive map of every tropical cyclone track recorded since 1980. The lines will be colored by storm intensity, from pale blue tropical depressions to deep red Category 5 hurricanes, all rendered on a dark globe that spins slowly in your browser.

```{raw} html
<div class="pmtiles-map-embed">
  <iframe
    src="https://palewire.github.io/first-pmtiles-map/"
    title="IBTrACS PMTiles Map"
    loading="lazy"
    class="pmtiles-map-embed__frame"
  ></iframe>
</div>

<style>
  .pmtiles-map-embed {
    width: 100%;
    height: 400px;
  }

  .pmtiles-map-embed__frame {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }
</style>
```

The whole thing runs from just two files: a single HTML page and a single PMTiles data file. There's no tile server. No database. No API key. No ongoing costs beyond basic file hosting.

## How is that possible?

The answer is [PMTiles](https://github.com/protomaps/PMTiles), a relatively new file format created by [Brandon Liu](https://bdon.org/) at [Protomaps](https://protomaps.com/). The idea is elegant: pack all the map tiles your browser needs into a single file and use [HTTP range requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests) to fetch only the bytes it needs on demand.

Range requests are a standard part of the web. When your browser asks for a file, it can say "just give me bytes 1,000 through 2,000" instead of downloading the whole thing. That's how video streaming works — you don't download an entire movie before watching it.

PMTiles exploits this technique to serve map tiles from a static file. When the map needs to show a particular part of the world at a particular zoom level, the PMTiles library figures out where those tile bytes live in the file, issues a range request and gets exactly the data it needs. No server-side code is involved.

This means you can host your map on Amazon S3, GitHub Pages, Cloudflare R2 or just about any web server that supports range requests. Upload one file and your map works indefinitely. There's nothing to maintain, no servers to patch, no databases to update.

## What it takes

You'll need a few open-source tools installed on your computer:

- [**GDAL**](https://gdal.org/en/stable/), a geospatial toolkit that includes `ogr2ogr`, a command-line utility for converting between data formats
- [**tippecanoe**](https://github.com/felt/tippecanoe), a tool that converts GeoJSON data into vector tiles
- [**Node.js**](https://nodejs.org/), a JavaScript runtime that we'll use to run a simple local web server

If you're on a Mac with [Homebrew](https://brew.sh/), you can install the first two with:

```bash
brew install gdal tippecanoe
```

If you're on another system, you can find installation instructions for [GDAL](https://gdal.org/en/stable/download.html) and [tippecanoe](https://github.com/felt/tippecanoe#installation) in their documentation.

You'll also want a code editor. We recommend [Visual Studio Code](https://code.visualstudio.com/), which includes a built-in terminal where you can run commands while editing files.

Ready?
