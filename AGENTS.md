## First PMTiles Map

This repo's primary purpose is to write and publish the **First PMTiles Map** tutorial (a Sphinx site written in MyST Markdown).

The `src/` folder exists in support of that mission:

- It contains the working example map (`src/index.html`) that the tutorial teaches.
- It contains the demo artifacts (`src/ibtracs.pmtiles` and related data files) needed to run the map.
- It is deployed as a static demo site that the tutorial embeds (see the iframe in `docs/what-you-will-make.md`).

### Prerequisites

- `curl`
- `unzip`
- `gdal` (for `ogr2ogr`)
- `tippecanoe` (e.g., `brew install tippecanoe`)
- `node`/`npx` (for the local preview server)
- Python (used for Sphinx docs; CI installs Python 3.13)
- `uv` (used by the docs workflow to install/run Python dependencies)

### Local usage

**Authoring the tutorial (docs-first):**

- Edit pages under `docs/*.md` (the table of contents lives in `docs/index.md`).
- Local preview (requires Sphinx installed): `make -C docs html`
- Live reload (requires `sphinx-autobuild`): `make -C docs livehtml`

**Building/running the demo map (supports the tutorial):**

- `make` downloads the IBTrACS shapefile, converts to GeoJSON, and builds `src/ibtracs.pmtiles` using defaults in the [Makefile](Makefile).
- `make serve` runs `npx serve` from `src/` at `http://localhost:8000`.
- `make clean` removes extracted shapefile/GeoJSON artifacts; `make clobber` also deletes `src/ibtracs.pmtiles`.

### GitHub Pages

- Workflow: [.github/workflows/pages.yml](.github/workflows/pages.yml) runs on pushes to `main` (and manual triggers).
- Build behavior: the workflow does not run `make`; it simply uploads `src/` as the Pages artifact and deploys it.
- Published content: whatever is committed under `src/` (including `index.html` and `ibtracs.pmtiles`).

Because the tutorial embeds the demo site, changes to the tutorial that affect the demo should typically be paired with corresponding `src/` updates.

### Docs

**Docs are the product.** CI builds and deploys the tutorial separately from GitHub Pages.

- Source: `docs/*.md` with configuration in `docs/conf.py`
- Build (CI): [.github/workflows/docs.yaml](.github/workflows/docs.yaml) uses `uv sync` then runs `uv run sphinx-build -M html ./docs ./_build/`
- Deploy (CI): uploads the built HTML to S3 (see workflow for bucket/base-path secrets)

**Static assets (screenshots/videos):** put them in `docs/_static/` so Sphinx copies them into the built site.

- `docs/_static/screenshots/...`
- `docs/_static/videos/...`

When capturing browser screenshots for the tutorial, prefer writing outputs directly into those folders so embeds in `docs/*.md` can reference `_static/...` paths.
