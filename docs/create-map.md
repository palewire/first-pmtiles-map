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

- **`source`** tells MapLibre which data source to use. This matches the `"storms"` name we gave to `addSource`.
- **`"source-layer"`** tells MapLibre which layer _within_ the PMTiles file to draw. This matches the `--layer=storms` name we set in tippecanoe. A single PMTiles file can contain multiple layers, so this property is always required for vector tile sources.
- **`paint`** controls the visual appearance — color, width and opacity.
