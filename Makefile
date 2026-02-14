NAME := src/IBTrACS.since1980.list.v04r01.lines
URL  := https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/shapefile/IBTrACS.since1980.list.v04r01.lines.zip

.PHONY: all serve clean clobber upload

all: src/ibtracs.pmtiles

serve:
	npx --yes serve --listen 8000 src

clean:
	rm -f $(NAME).*

clobber: clean
	rm -f src/ibtracs.pmtiles

upload: src/ibtracs.pmtiles
	aws s3 --profile palewire cp $< s3://palewire-docs/first-pmtiles-map/ibtracs.pmtiles --acl public-read

$(NAME).zip:
	curl -L -o $@ "$(URL)"

$(NAME).shp: $(NAME).zip
	unzip -o $< -d src

$(NAME).geojson: $(NAME).shp
	ogr2ogr -f GeoJSON $@ $<

src/ibtracs.pmtiles: $(NAME).geojson
	tippecanoe -o $@ \
		--layer=storms \
		--minimum-zoom=3 \
		--maximum-zoom=3 \
		--no-feature-limit \
		--no-tile-size-limit \
		$(NAME).geojson
