# What you will make

If you work through this class, you will create an interactive map of every tropical cyclone track recorded since 1980. The lines will be colored by storm intensity, from pale blue tropical depressions to deep red Category 5 hurricanes, all rendered on a dark globe that spins slowly in your browser.

```{raw} html
<div style="width: 100%; height: 400px; position: relative;">
    <div id="demo-map" style="position: absolute; top: 0; bottom: 0; left: 0; right: 0;"></div>
</div>
<script>
    const protocol = new pmtiles.Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    const stormsHttpUrl = "https://palewi.re/docs/first-pmtiles-map/ibtracs.pmtiles";
    const stormsTilesUrl = `pmtiles://${stormsHttpUrl}`;
    protocol.add(new pmtiles.PMTiles(stormsHttpUrl));

    function createGlobeSpinner(map, degreesPerSecond = 10) {
        let animationId = null;
        let lastTime;

        function spin() {
            const now = performance.now();
            const elapsed = (now - lastTime) / 1000;
            lastTime = now;
            const center = map.getCenter();
            center.lng += degreesPerSecond * elapsed;
            map.setCenter(center);
            animationId = requestAnimationFrame(spin);
        }

        return {
            start() {
                if (!animationId) {
                    lastTime = performance.now();
                    spin();
                }
            },
            stop() {
                if (animationId) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
            }
        };
    }

    fetch("https://tiles.openfreemap.org/styles/fiord")
        .then(r => r.json())
        .then(style => {
            style.projection = { type: "globe" };

            const map = new maplibregl.Map({
                container: "demo-map",
                style,
                center: [0, 15],
                zoom: 3,
                minZoom: 3,
                maxZoom: 3,
                interactive: false,
                attributionControl: false,
            });

            map.on("load", () => {
                map.addSource("storms", { type: "vector", url: stormsTilesUrl });

                const firstSymbolLayerId = map
                    .getStyle()
                    .layers.find(layer => layer.type === "symbol")?.id;

                map.addLayer(
                    {
                        id: "storms-line",
                        type: "line",
                        source: "storms",
                        "source-layer": "storms",
                        paint: {
                            "line-color": [
                                "interpolate",
                                ["linear"],
                                ["coalesce", ["get", "USA_SSHS"], -1],
                                -1, "#7aa6c7",
                                0,  "#4dc9ff",
                                1,  "#8bc34a",
                                2,  "#ffd166",
                                3,  "#f4a261",
                                4,  "#e76f51",
                                5,  "#c71f37",
                            ],
                            "line-width": [
                                "interpolate",
                                ["linear"],
                                ["coalesce", ["get", "USA_WIND"], 0],
                                0,   0.8,
                                50,  2,
                                100, 3.5,
                                150, 5,
                            ],
                            "line-opacity": 0.5,
                        },
                    },
                    firstSymbolLayerId
                );
            });

            const spinner = createGlobeSpinner(map);
            spinner.start();
        });
</script>
```

The whole thing runs from just two files: a single HTML page and a single PMTiles data file. There's no tile server. No database. No API key. No ongoing costs beyond basic file hosting.

## How is that possible?

The answer is [PMTiles](https://github.com/protomaps/PMTiles), a relatively new file format created by [Brandon Liu](https://bdon.org/) at [Protomaps](https://protomaps.com/). The idea is elegant: pack all the map tiles your browser needs into a single file and use [HTTP range requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests) to fetch only the bytes it needs on demand.

Range requests are a standard part of the web. When your browser asks for a file, it can say "just give me bytes 1,000 through 2,000" instead of downloading the whole thing. That's how video streaming works — you don't download an entire movie before watching it.

PMTiles exploits this technique to serve map tiles from a static file. When the map needs to show a particular part of the world at a particular zoom level, the PMTiles library figures out where those tile bytes live in the file, issues a range request and gets exactly the data it needs. No server-side code is involved.

This means you can host your map on Amazon S3, GitHub Pages, Cloudflare R2 or just about any web server that supports range requests. Upload one file and your map works indefinitely. There's nothing to maintain, no servers to patch, no databases to update.

## What it takes

You'll need a few open-source tools installed on your computer:

* [**GDAL**](https://gdal.org/en/stable/), a geospatial toolkit that includes `ogr2ogr`, a command-line utility for converting between data formats
* [**tippecanoe**](https://github.com/felt/tippecanoe), a tool that converts GeoJSON data into vector tiles
* [**Node.js**](https://nodejs.org/), a JavaScript runtime that we'll use to run a simple local web server

If you're on a Mac with [Homebrew](https://brew.sh/), you can install the first two with:

```bash
brew install gdal tippecanoe
```

If you're on another system, you can find installation instructions for [GDAL](https://gdal.org/en/stable/download.html) and [tippecanoe](https://github.com/felt/tippecanoe#installation) in their documentation.

You'll also want a code editor. We recommend [Visual Studio Code](https://code.visualstudio.com/), which includes a built-in terminal where you can run commands while editing files.

Ready?
