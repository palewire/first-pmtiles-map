# First PMTiles Map

Display a big dataset on an interactive map without a server, a database or even an API key

## What you will learn

This class will walk you through the process of creating an interactive web map from a large geospatial dataset. You will do it using only free, open-source tools and a handful of static files.

It will teach you how to:

- Convert a shapefile to the [PMTiles](https://github.com/protomaps/PMTiles) format using [tippecanoe](https://github.com/felt/tippecanoe)
- Inspect a PMTiles file to understand its layers and data
- Display the tiles on an interactive map using [MapLibre GL JS](https://maplibre.org/projects/maplibre-gl-js/)
- Create a data-driven style that colors features based on their attributes

By the end, you will have a spinning globe showing the tracks of every tropical cyclone since 1980, colored by intensity. And you will understand a workflow you can apply to any large geospatial dataset.

## Who can take it

This course is free. Anyone with a basic comfort level using a terminal is qualified. You don't need to be an expert programmer, but you should know how to navigate to a directory and run a command.

If you've never worked with a command-line interface, consider reviewing the [Software Carpentry's shell tutorial](https://swcarpentry.github.io/shell-novice/) first.

## Table of contents

```{toctree}
:maxdepth: 1
:name: mastertoc
:numbered:

what-you-will-make
build-tiles
create-map
```

## About this class

[Ben Welsh](https://palewi.re/who-is-ben-welsh/) prepared this guide for [a training session](https://schedules.ire.org/nicar-2026/) at the National Institute for Computer-Assisted Reporting's 2026 conference. Some of the copy was written with the assistance of Anthropic's Claude, an AI-powered text generator. The materials are available as free and [open source on GitHub](https://github.com/palewire/first-pmtiles-map).
