# Building your tiles

Our first task is to download a big geospatial dataset, convert it to the PMTiles format and inspect the result. We'll do it all from the terminal using a series of commands that form a reproducible pipeline.

## The data

We're going to map the tracks of tropical cyclones using a dataset called [IBTrACS](https://www.ncei.noaa.gov/products/international-best-track-archive), the International Best Track Archive for Climate Stewardship. It's maintained by NOAA and merges storm track data from meteorological agencies around the world into one comprehensive, public-domain archive.

The dataset goes back to the 1840s and includes the path, wind speed, pressure and classification of every known tropical cyclone on Earth. We'll use the subset covering storms since 1980, which is the period with the most reliable satellite observations.

## Download the data

Open a terminal in Visual Studio Code and create a new directory for your project. Navigate into it.

```bash
mkdir first-pmtiles-map
cd first-pmtiles-map
```

Now download the IBTrACS shapefile using `curl`. This is a zipfile containing the polyline tracks of every storm since 1980.

```bash
curl -L -o IBTrACS.since1980.list.v04r01.lines.zip "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/shapefile/IBTrACS.since1980.list.v04r01.lines.zip"
```

Unzip it.

```bash
unzip -o IBTrACS.since1980.list.v04r01.lines.zip
```

You should see several files appear, including one ending in `.shp`. That's the shapefile, an old but durable format for storing geographic features. It's actually a collection of files that work together — the `.shp` holds the geometry, `.dbf` holds the attributes and `.prj` holds the map projection.

## Convert to GeoJSON

Tippecanoe, the tool we'll use to create our tiles, reads [GeoJSON](https://geojson.org/), a modern, human-readable format for geographic data. So we need to convert our shapefile first.

That's a job for `ogr2ogr`, a Swiss Army knife for geospatial data that ships with GDAL. The syntax puts the output file before the input, which takes some getting used to.

```bash
ogr2ogr -f GeoJSON IBTrACS.since1980.list.v04r01.lines.geojson IBTrACS.since1980.list.v04r01.lines.shp
```

This will take a moment. When it's done, you'll have a GeoJSON file containing every storm track as a polyline feature, with dozens of attributes attached to each one.

:::{note}
If you're curious, you can peek at the first few lines of the file with `head -20 IBTrACS.since1980.list.v04r01.lines.geojson`. You'll see the familiar GeoJSON structure with coordinates and properties for each storm.
:::

## Create PMTiles

Now for the main event. [Tippecanoe](https://github.com/felt/tippecanoe) is a tool originally built at Mapbox and now maintained by [Felt](https://felt.com/) that converts GeoJSON features into vector tiles. It's designed to handle large datasets intelligently, simplifying geometry and managing tile density so the result looks good at every zoom level.

Run it on the GeoJSON file:

```bash
tippecanoe -o ibtracs.pmtiles \
    --layer=storms \
    --minimum-zoom=3 \
    --maximum-zoom=3 \
    --no-feature-limit \
    --no-tile-size-limit \
    IBTrACS.since1980.list.v04r01.lines.geojson
```

Let's break down what each flag does:

* **`-o ibtracs.pmtiles`** — The output file. Tippecanoe knows to produce the PMTiles format because of the `.pmtiles` extension.
* **`--layer=storms`** — Sets the name of the layer inside the tileset. You'll use this name later when you tell MapLibre which layer to draw.
* **`--minimum-zoom=3`** and **`--maximum-zoom=3`** — Restricts the tileset to a single zoom level. For a global overview, zoom 3 is a reasonable choice that keeps the file small and processing fast. In a production map you might want a wider range.
* **`--no-feature-limit`** and **`--no-tile-size-limit`** — Tells tippecanoe to include every feature in every tile, even if it makes tiles large. Without these flags, tippecanoe would drop some storm tracks to keep individual tiles within default size limits.

:::{tip}
Tippecanoe's zoom flags can be confusing. The shorthand versions use different cases: lowercase `-z` sets the **maximum** zoom, while uppercase `-Z` sets the **minimum** zoom. The longform flags `--minimum-zoom` and `--maximum-zoom` are easier to remember and what we recommend.
:::

The command should finish in a few seconds and produce a file called `ibtracs.pmtiles`. Check its size:

```bash
ls -lh ibtracs.pmtiles
```

You should see something around 8 to 10 megabytes. That's thousands of storm tracks compressed into a single file that any web server can host.

## Inspect the tiles

Before we build a map, let's verify that our PMTiles file contains what we expect. There are several ways to do this.

The quickest option is the web-based viewer at [pmtiles.io](https://pmtiles.io/). Open that URL in your browser and drag your `ibtracs.pmtiles` file onto the page. You'll see a preview of the data on a map, along with metadata about the file's layers, zoom levels and tile statistics.

You should see a single layer called `storms` at zoom level 3, with line geometry and a long list of attribute fields like `NAME`, `SEASON`, `USA_WIND` and `USA_SSHS`.

:::{note}
If you prefer to inspect PMTiles from the command line, you can install the `pmtiles` CLI tool from [its GitHub releases page](https://github.com/protomaps/go-pmtiles/releases). Once installed, run `pmtiles show ibtracs.pmtiles` to see the same metadata in your terminal.
:::

Two fields will be important for our map:

* **`USA_SSHS`** — The storm's classification on the Saffir-Simpson Hurricane Scale, ranging from -1 (tropical depression) through 0 (tropical storm) up to 5 (Category 5 hurricane).
* **`USA_WIND`** — The maximum sustained wind speed in knots.

Now that we have our tiles, it's time to put them on a map.
