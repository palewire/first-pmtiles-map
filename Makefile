# Makefile: Build IBTrACS PMTiles and a minimal static site

VERSION   := v04r01
SUBSET    ?= since1980          # ALL, since1980, last3years, NA, EP, WP, SI, SP, NI, SA
GEOMETRY  ?= lines              # lines or points
MIN_ZOOM  := 0
MAX_ZOOM  := 10
LAYER_NAME:= storms

SRC_DIR   ?= src
SITE_DIR  ?= site
HTML_FILE ?= $(SRC_DIR)/index.html
SITE_PORT ?= 8000

BASENAME := $(SRC_DIR)/IBTrACS.$(SUBSET).list.$(VERSION).$(GEOMETRY)
ZIP_FILE := $(BASENAME).zip
SHP_FILE := $(BASENAME).shp
GEOJSON  := $(BASENAME).geojson
PMTILES  := $(SRC_DIR)/ibtracs.pmtiles
BASE_URL := https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/$(VERSION)/access/shapefile

.PHONY: all site serve clean clobber

all: $(PMTILES)

site: $(PMTILES) $(HTML_FILE) | $(SITE_DIR)
	cp $(HTML_FILE) $(PMTILES) $(SITE_DIR)/

serve: | $(SRC_DIR)
	npx --yes serve --listen $(SITE_PORT) $(SRC_DIR)

$(ZIP_FILE): | $(SRC_DIR)
	curl -L -o $@ "$(BASE_URL)/$(notdir $(ZIP_FILE))"

$(SHP_FILE): $(ZIP_FILE)
	unzip -o $< -d $(SRC_DIR)

$(GEOJSON): $(SHP_FILE)
	ogr2ogr -f GeoJSON \
		-t_srs EPSG:4326 \
		-select "SID,SEASON,NAME,ISO_TIME,NATURE,WMO_WIND,WMO_PRES,USA_WIND,USA_PRES,USA_SSHS,BASIN,SUBBASIN,DIST2LAND,LANDFALL,STORM_SPD" \
		$@ $(SHP_FILE)

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

$(SRC_DIR) $(SITE_DIR):
	mkdir -p $@

clean:
	rm -f $(ZIP_FILE) $(SHP_FILE) $(BASENAME).dbf $(BASENAME).shx $(BASENAME).prj $(BASENAME).cpg $(GEOJSON)
	rm -rf $(SITE_DIR)

clobber: clean
	rm -f $(PMTILES)
