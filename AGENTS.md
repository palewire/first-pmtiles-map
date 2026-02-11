## IBTrACS PMTiles Map

This repo builds a PMTiles archive of NOAA IBTrACS tropical cyclone tracks and serves it with MapLibre. It includes a GitHub Pages workflow to publish the static demo page and a Sphinx docs site published to https://palewi.re/docs/first-pmtiles-map/.

### Prerequisites

- `curl`
- `unzip`
- `gdal` (for `ogr2ogr`)
- `tippecanoe` (e.g., `brew install tippecanoe`)
- `python` (for data utilities)
- `node`/`npx` (for the local preview server)

### Local usage

- `make` builds `ibtracs.pmtiles` using the defaults in the [Makefile](Makefile): subset `since1980` and `lines` geometry.
- Options: `make SUBSET=NA` (North Atlantic), `SUBSET=ALL` (all basins), `SUBSET=last3years` (recency), or switch geometry with `GEOMETRY=points`.
- `make site` assembles the publishable bundle in `site/` (includes [src/index.html](src/index.html) and the generated `ibtracs.pmtiles`).
- `make serve` runs `npx serve` from `src/` at `http://localhost:8000` for quick preview.
- `make clean` removes the downloaded GeoJSON and `site/`; `make clobber` also deletes the PMTiles output.

### GitHub Pages

- Workflow: [.github/workflows/pages.yml](.github/workflows/pages.yml) runs on pushes to `main` (and manual triggers).
- Steps: installs GDAL + tippecanoe, runs `make site`, uploads `site/` as the Pages artifact, and deploys with `actions/deploy-pages`.
- Published content: the static bundle built from `make site` (map page + PMTiles + style).

### Docs

The Sphinx docs workflow for the tutorial remains separate at [.github/workflows/docs.yaml](.github/workflows/docs.yaml) and publishes to https://palewi.re/docs/first-pmtiles-map/.
