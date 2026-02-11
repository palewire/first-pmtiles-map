# Makefile: Download NOAA IBTrACS tropical cyclone tracks and convert to PMTiles
#
# Prerequisites:
#   - curl
#   - unzip
#   - ogr2ogr (from GDAL, e.g., `brew install gdal` or `apt install gdal-bin`)
#   - tippecanoe (https://github.com/felt/tippecanoe)
#   - node/npx (for the local preview server)
#
# Usage:
#   make                     # Downloads since-1980 track lines, builds PMTiles
#   make SUBSET=NA           # North Atlantic only
#   make SUBSET=ALL          # All basins, entire record
#   make SUBSET=last3years   # Recent storms only
#   make GEOMETRY=points     # Use point geometries instead of lines
#   make site                # Build site/ with index.html, style.json, ibtracs.pmtiles
#   make serve               # Build site/ and serve it on localhost
#   make clean               # Remove intermediates and the site directory
#   make clobber             # Remove everything including final PMTiles

# ---------- Configuration ----------

# IBTrACS version
VERSION := v04r01

# Choose a subset: ALL, since1980, last3years, NA, EP, WP, SI, SP, NI, SA
SUBSET   ?= since1980

# Geometry type: lines or points
GEOMETRY ?= lines

SITE_DIR   ?= site
SRC_DIR    ?= src
HTML_FILE  ?= $(SRC_DIR)/index.html
SITE_PORT  ?= 8000
SRC_READY  := $(SRC_DIR)/.ready
SITE_READY := $(SITE_DIR)/.ready

# Tippecanoe settings
MIN_ZOOM   := 0
MAX_ZOOM   := 10
LAYER_NAME := storms

# ---------- Derived variables ----------

BASENAME := $(SRC_DIR)/IBTrACS.$(SUBSET).list.$(VERSION).$(GEOMETRY)
ZIP_FILE := $(BASENAME).zip
SHP_FILE := $(BASENAME).shp
GEOJSON  := $(BASENAME).geojson
PMTILES  := $(SRC_DIR)/ibtracs.pmtiles

BASE_URL := https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/$(VERSION)/access/shapefile

# ---------- Targets ----------

.PHONY: all clean clobber site serve

all: $(PMTILES)

site: $(PMTILES) $(HTML_FILE) | $(SITE_READY)
	cp $(HTML_FILE) $(PMTILES) $(SITE_DIR)/

serve:
	npx --yes serve --listen $(SITE_PORT) $(SRC_DIR)

# Step 1: Download the shapefile zip from NOAA
$(ZIP_FILE): | $(SRC_READY)
	curl -L -o $@ "$(BASE_URL)/$(notdir $(ZIP_FILE))"

# Step 2: Unzip (produces .shp, .dbf, .shx, .prj)
$(SHP_FILE): $(ZIP_FILE)
	unzip -o $< -d $(SRC_DIR)
	touch $@

# Step 3: Convert shapefile to GeoJSON with ogr2ogr
#   - Reproject to WGS84 (defensive)
#   - Keep columns commonly used for quick mapping
$(GEOJSON): $(SHP_FILE)
	ogr2ogr -f GeoJSON \
		-t_srs EPSG:4326 \
		-select "SID,SEASON,NAME,ISO_TIME,NATURE,WMO_WIND,WMO_PRES,USA_WIND,USA_PRES,USA_SSHS,BASIN,SUBBASIN,DIST2LAND,LANDFALL,STORM_SPD" \
		$@ $(SHP_FILE)

# Step 4: Build PMTiles with tippecanoe
$(PMTILES): $(GEOJSON)
	tippecanoe \
		-o $@ \
		--name="NOAA IBTrACS $(SUBSET) $(GEOMETRY)" \
		--description="Global tropical cyclone tracks from IBTrACS $(VERSION)" \
		--attribution="NOAA NCEI IBTrACS" \
		--layer=$(LAYER_NAME) \
		--minimum-zoom=$(MIN_ZOOM) \
		--maximum-zoom=$(MAX_ZOOM) \
		--drop-densest-as-needed \
		--extend-zooms-if-still-dropping \
		--force \
		$(GEOJSON)

clean:
	rm -f $(ZIP_FILE) $(SHP_FILE) $(BASENAME).dbf $(BASENAME).shx $(BASENAME).prj $(BASENAME).cpg $(GEOJSON)
	rm -rf $(SITE_DIR)
	rm -f $(SRC_READY) $(SITE_READY)

clobber: clean
	rm -f $(PMTILES)

$(SRC_READY):
	mkdir -p $(SRC_DIR)
	touch $@

$(SITE_READY):
	mkdir -p $(SITE_DIR)
	touch $@
