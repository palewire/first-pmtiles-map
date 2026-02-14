# Creating your map

Now that we have a PMTiles file, it's time to display it in the browser. We'll use [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/), a free and open-source library for rendering interactive vector maps. For our basemap — the underlying map of coastlines, borders and labels — we'll use [OpenFreeMap](https://openfreemap.org/), which provides beautiful map styles with no API key required.

We'll build up our HTML file step by step, starting with the simplest possible map and gradually adding features until we arrive at the final product.

## Start the server

Before we write any code, we need a local web server. PMTiles relies on HTTP range requests to fetch only the bytes it needs, and not every server supports them. Python's built-in `http.server` module, for instance, does not.

The easiest option is `npx serve`, which comes with [Node.js](https://nodejs.org/). From your project directory, run:

```bash
npx --yes serve --listen 8000
```

This will start a server on port 8000. Leave it running in its own terminal tab and open a new tab for editing files. You can visit [http://localhost:8000](http://localhost:8000) in your browser to verify it's working, though there's nothing to see yet.

## A bare basemap

Create a new file called `index.html` in your project directory. Start with the minimum boilerplate needed to display a MapLibre map.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>First PMTiles Map</title>
    <script src="https://unpkg.com/maplibre-gl@5.15.0/dist/maplibre-gl.js"></script>
    <link
      href="https://unpkg.com/maplibre-gl@5.15.0/dist/maplibre-gl.css"
      rel="stylesheet"
    />
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
        height: 100%;
      }
      #map {
        position: absolute;
        inset: 0;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      fetch("https://tiles.openfreemap.org/styles/fiord")
        .then((r) => r.json())
        .then((style) => {
          const map = new maplibregl.Map({
            container: "map",
            style,
            center: [0, 15],
            zoom: 3,
          });
        });
    </script>
  </body>
</html>
```

Save the file and open [http://localhost:8000](http://localhost:8000) in your browser. You should see a dark blue map of the world courtesy of OpenFreeMap's "fiord" style. You can pan and zoom around it.

Let's walk through what's happening. The `<script>` and `<link>` tags in the `<head>` load the MapLibre GL JS library and its stylesheet from a CDN. The CSS makes the map fill the entire browser window.

In the JavaScript, we fetch OpenFreeMap's fiord style — a JSON document that tells MapLibre how to draw coastlines, borders, labels and other features. Once it loads, we create a new map centered on the equator at zoom level 3.

## Add the PMTiles source

Now let's load our storm data. This requires two additions: the PMTiles JavaScript library and a few lines of code to register it with MapLibre.

First, add the PMTiles script tag to the `<head>`, right after the MapLibre script:

{emphasize-lines="8"}
```html
    <script src="https://unpkg.com/maplibre-gl@5.15.0/dist/maplibre-gl.js"></script>
    <script src="https://unpkg.com/pmtiles@3/dist/pmtiles.js"></script>
    <link
      href="https://unpkg.com/maplibre-gl@5.15.0/dist/maplibre-gl.css"
      rel="stylesheet"
    />
```

Now update the `<script>` block at the bottom to register the PMTiles protocol and add our tileset as a map source. Replace the existing script with:

{emphasize-lines="1-6,16-17"}
```html
    <script>
      // Register PMTiles protocol so MapLibre can load .pmtiles files
      const protocol = new pmtiles.Protocol();
      maplibregl.addProtocol("pmtiles", protocol.tile);

      const stormsTilesUrl = "pmtiles://http://localhost:8000/ibtracs.pmtiles";

      fetch("https://tiles.openfreemap.org/styles/fiord")
        .then((r) => r.json())
        .then((style) => {
          const map = new maplibregl.Map({
            container: "map",
            style,
            center: [0, 15],
            zoom: 3,
          });

          map.on("load", () => {
            map.addSource("storms", {
              type: "vector",
              url: stormsTilesUrl,
            });
          });
        });
    </script>
```

The first two highlighted lines are the key to making PMTiles work. They create a protocol adapter and register it with MapLibre under the `pmtiles://` prefix. From that point on, any URL that starts with `pmtiles://` will be handled by the PMTiles library, which knows how to fetch individual tiles from the archive using range requests.

Inside the `map.on("load")` callback, we add our tileset as a vector source named `"storms"`. The `url` uses the `pmtiles://` prefix, which triggers the protocol adapter.

Save and refresh your browser. The map will look exactly the same — we've loaded the data but haven't told MapLibre how to draw it yet.

## Draw the storm tracks

Let's add a layer that draws the storm tracks as lines. Add the following inside the `map.on("load")` callback, after the `addSource` call:

{emphasize-lines="6-15"}
```js
          map.on("load", () => {
            map.addSource("storms", {
              type: "vector",
              url: stormsTilesUrl,
            });

            map.addLayer({
              id: "storms-line",
              type: "line",
              source: "storms",
              "source-layer": "storms",
              paint: {
                "line-color": "#ffffff",
                "line-width": 1,
                "line-opacity": 0.5,
              },
            });
          });
```

Save and refresh. You should now see thousands of white lines tracing storm paths across the globe. The oceans will be thick with them.

A few things to notice about the layer definition:

* **`source`** tells MapLibre which data source to use. This matches the `"storms"` name we gave to `addSource`.
* **`"source-layer"`** tells MapLibre which layer *within* the PMTiles file to draw. This matches the `--layer=storms` name we set in tippecanoe. A single PMTiles file can contain multiple layers, so this property is always required for vector tile sources.
* **`paint`** controls the visual appearance — color, width and opacity.

## Color by storm intensity

White lines are fine, but the real power of vector tiles is data-driven styling. Each storm track carries its attributes from the original dataset, and we can use them to control how features are drawn.

Let's color the lines by the Saffir-Simpson Hurricane Scale category stored in the `USA_SSHS` field. Replace the `paint` block with an [`interpolate`](https://maplibre.org/maplibre-style-spec/expressions/#interpolate) expression:

{emphasize-lines="5-18"}
```js
            map.addLayer({
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
                "line-width": 1,
                "line-opacity": 0.5,
              },
            });
```

Save and refresh. The storm tracks should now range from pale blue for tropical depressions to deep red for Category 5 hurricanes.

Let's unpack that expression. MapLibre's style language uses a Lisp-like syntax where everything is a nested array:

* **`"interpolate"`** produces a smooth, continuous output between stop values. Unlike `"step"`, which jumps between discrete values, `"interpolate"` blends smoothly.
* **`["linear"]`** means the blending is uniform between stops.
* **`["coalesce", ["get", "USA_SSHS"], -1]`** reads the `USA_SSHS` property from each feature. The `coalesce` wrapper provides a fallback value of -1 if the property is missing — some records in the dataset have gaps.
* The remaining pairs are input-output stops: when `USA_SSHS` is -1, use `#7aa6c7` (pale blue); when it's 5, use `#c71f37` (deep red). Values between stops are smoothly blended.

:::{tip}
This expression syntax is shared by MapLibre, Mapbox GL and the [Maputnik](https://maputnik.github.io/) style editor. Once you learn it, you can use it across all of these tools. Maputnik is especially useful for experimenting with styles visually — you can paste in a style JSON and tweak colors, widths and expressions with a point-and-click interface.
:::

## Vary the line width

We can apply the same technique to line width using the `USA_WIND` field, which records the maximum sustained wind speed in knots. Replace the static `"line-width": 1` with another `interpolate` expression:

{emphasize-lines="19-27"}
```js
            map.addLayer({
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
            });
```

Save and refresh. The most powerful storms will now appear as thicker lines, while weaker ones stay thin. The combination of color and width makes it easy to see where the most intense storms traveled.

## Layer below labels

You may have noticed that the storm tracks draw on top of the country labels from the basemap. We can fix that by telling MapLibre to insert our layer below the first symbol (label) layer in the style.

Add a line that finds the first symbol layer, then pass its `id` as a second argument to `addLayer`:

{emphasize-lines="1-3,34"}
```js
            const firstSymbolLayerId = map
              .getStyle()
              .layers.find((layer) => layer.type === "symbol")?.id;

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
              firstSymbolLayerId,
            );
```

Save and refresh. The labels should now float above the storm tracks, making both easier to read.

## Add the globe and spin

As a finishing touch, let's display the map as a 3D globe and set it spinning. MapLibre supports a globe projection that you can enable by modifying the style before creating the map.

Update the section where the style is loaded to set the projection, lock the zoom level and disable user interaction:

{emphasize-lines="2,9-12"}
```js
        .then((style) => {
          style.projection = { type: "globe" };

          const map = new maplibregl.Map({
            container: "map",
            style,
            center: [0, 15],
            zoom: 3,
            minZoom: 3,
            maxZoom: 3,
            interactive: false,
          });
```

Then, after the `map.on("load")` block, add a globe spinner function and start it:

```js
          const spinner = createGlobeSpinner(map);
          spinner.start();
        });
```

You'll need to define the `createGlobeSpinner` function. Add it to the top of the `<script>` block, after the PMTiles setup:

```js
      // Globe rotation
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
          },
        };
      }
```

Save and refresh. You should see a slowly spinning globe with storm tracks glowing across its surface. Congratulations — you've built a complete PMTiles map.

## The final file

Here's the complete `index.html` for reference. If something isn't working, compare your file to this one.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>First PMTiles Map</title>
    <script src="https://unpkg.com/maplibre-gl@5.15.0/dist/maplibre-gl.js"></script>
    <script src="https://unpkg.com/pmtiles@3/dist/pmtiles.js"></script>
    <link
      href="https://unpkg.com/maplibre-gl@5.15.0/dist/maplibre-gl.css"
      rel="stylesheet"
    />
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
        height: 100%;
      }
      #map {
        position: absolute;
        inset: 0;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      // Register PMTiles protocol so MapLibre can load .pmtiles files
      const protocol = new pmtiles.Protocol();
      maplibregl.addProtocol("pmtiles", protocol.tile);

      const stormsTilesUrl =
        "pmtiles://http://localhost:8000/ibtracs.pmtiles";

      // Globe rotation
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
          },
        };
      }

      fetch("https://tiles.openfreemap.org/styles/fiord")
        .then((r) => r.json())
        .then((style) => {
          style.projection = { type: "globe" };

          const map = new maplibregl.Map({
            container: "map",
            style,
            center: [0, 15],
            zoom: 3,
            minZoom: 3,
            maxZoom: 3,
            interactive: false,
          });

          map.on("load", () => {
            map.addSource("storms", {
              type: "vector",
              url: stormsTilesUrl,
            });

            const firstSymbolLayerId = map
              .getStyle()
              .layers.find((layer) => layer.type === "symbol")?.id;

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
              firstSymbolLayerId,
            );
          });

          const spinner = createGlobeSpinner(map);
          spinner.start();
        });
    </script>
  </body>
</html>
```

## What's next

You've learned a workflow that applies to any geospatial dataset: download, convert, tile, display and style. Here are some ideas for taking it further:

* **Try a different dataset.** The USGS provides real-time earthquake data as GeoJSON at [earthquake.usgs.gov](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php). You could color circles by magnitude using the same `interpolate` technique.
* **Add interactivity.** Remove the `interactive: false` setting to let users pan and zoom. Add a [`popup`](https://maplibre.org/maplibre-gl-js/docs/API/classes/Popup/) on click to show storm names and wind speeds.
* **Experiment with styles.** Try the [Maputnik](https://maputnik.github.io/) visual editor to tweak colors, or swap the basemap to one of OpenFreeMap's other styles like `liberty`, `bright` or `positron`.
* **Deploy it.** Upload your `index.html` and `ibtracs.pmtiles` to GitHub Pages, Amazon S3 or any static file host and you'll have a live map with no server to maintain.

```{tip}
If you'd like to learn how to deploy a page like this to the web using [GitHub Pages](https://docs.github.com/en/pages), you might enjoy our related lesson, ["Go big with GitHub Actions."](https://palewi.re/docs/go-big-with-github-actions/deploy.html)
```
