# Building your tiles

The first step is to convert the shapefiles into the GeoJSON format, an open standard that PMTiles prefers as input. That's a job for `ogr2ogr`, a Swiss Army knife for working with mapping data.

:::{figure} \_static/screenshots/build-tiles/ogr2ogr.png
:alt: GDAL
:width: 100%
:::

It's part of a broader library called [GDAL](https://gdal.org/), which you'll need to install on your computer. If you're on a Mac, the easiest way is with the [Homebrew](https://brew.sh/) package manager:

```bash
brew install gdal
```

After you have GDAL installed, you can run the following command to ensure it's available in your terminal:

```bash
ogr2ogr --version
```

You should see something like "GDAL 3.11.3 "Eganville", released 2025/07/12."

:::{note}
Don't have Homebrew installed? Visit [brew.sh](https://brew.sh/) for instructions.
:::

Now that it's ready, we'll use `ogr2ogr` to convert the shapefile into GeoJSON format. This might take some time to complete.

```bash
ogr2ogr -f GeoJSON IBTrACS.since1980.list.v04r01.lines.geojson IBTrACS.since1980.list.v04r01.lines.shp
```

When it's done, you'll have a GeoJSON file containing every storm track as a polyline feature, with dozens of attributes attached to each one.

Peek at the first few lines with:

```bash
head -20 IBTrACS.since1980.list.v04r01.lines.geojson
```

You can see its massive size with:

```bash
ls -lh IBTrACS.since1980.list.v04r01.lines.geojson
```

Converting the GeoJSON into PMTiles requires another tool called [Tippecanoe](https://github.com/felt/tippecanoe), an open-source utility originally developed at [Mapbox](https://www.mapbox.com/).

:::{figure} \_static/screenshots/build-tiles/tippecanoe.png
:alt: Tippecanoe
:width: 100%
:::

We'll also install Tippecanoe with Homebrew:

```bash
brew install tippecanoe
```

You can verify it's installed with:

```bash
tippecanoe --version
```

The tippecanoe command to convert the GeoJSON into PMTiles is more complex. It expects you to dictate how the tiles are built by providing command-line flags, which are options that start two dashes (`--`) and are followed by a value.

The most important flags for our use case are:

| Flag                   | What it does                                                                |
| ---------------------- | --------------------------------------------------------------------------- |
| `--output`             | Names the output; use a `.pmtiles` extension to produce PMTiles.            |
| `--layer`              | Sets the layer name inside the tileset; MapLibre will reference this later. |
| `--minimum-zoom`       | Sets the minimum zoom level for the tileset.                                |
| `--maximum-zoom`       | Sets the maximum zoom level for the tileset.                                |
| `--no-feature-limit`   | Include all features in each tile, even if tiles get large.                 |
| `--no-tile-size-limit` | Remove the default tile size cap, allowing larger tiles.                    |

For interactive maps, zoom levels get higher as you zoom in, with 0 being the whole world and 14 being a close-up view of a city. The more zoom levels you include, the larger the file will be and the longer it will take to build, but the smoother the map will feel when you zoom in.

For this example, we'll build a file that covers zooms ranging from 0 to 10, which will allow us to zoom in fairly close to the storm tracks without making the processing time too long.

Including the `--no-feature-limit` and `--no-tile-size-limit` is often an important choice when making maps for journalism, where you want to ensure that all of the data is included, even if it results in larger tiles. By default, Tippecanoe will try to keep file sizes down by dropping features from tiles that exceed a certain size, which can lead to missing data on the map.

Putting it all together, the command to build our PMTiles file looks like the following. Give it a try.

```bash
tippecanoe \
    --output=ibtracs.pmtiles \
    --layer=storms \
    --minimum-zoom=0 \
    --maximum-zoom=10 \
    --no-feature-limit \
    --no-tile-size-limit \
    IBTrACS.since1980.list.v04r01.lines.geojson
```

The command can take a few minutes to finish and produce a file called `ibtracs.pmtiles`.

Before we build a map, let's verify that our PMTiles file contains what we expect. There are several ways to do this.

The quickest option is the web-based viewer at [pmtiles.io](https://pmtiles.io/). Open that URL in your browser and drag your `ibtracs.pmtiles` file onto the page. You'll see a preview of the data on a map.

:::{figure} \_static/screenshots/build-tiles/pmtiles-upload.png
:alt: PMTiles.io with uploaded file
:width: 100%
:::

If you turn on the "Inspect features" option, you can click on the storm tracks and see the attributes that were included in the tileset.

:::{figure} \_static/screenshots/build-tiles/pmtiles-inspect.png
:alt: Inspecting features in PMTiles.io
:width: 100%
:::

For each feature you should see a long list of attribute fields like `NAME` and `SEASON`. Documentation for all the columns is available on the [NOAA website](https://www.ncei.noaa.gov/sites/default/files/2025-09/IBTrACS_v04r01_column_documentation.pdf).

Two fields will be important for our map:

| Field      | Meaning                                              |
| ---------- | ---------------------------------------------------- |
| `USA_SSHS` | Classification on the Saffir-Simpson Hurricane Scale |
| `USA_WIND` | Maximum sustained wind speed (knots).                |

Now that we have our tiles, it's time to put them on a map.
