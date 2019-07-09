/* global itowns, Promise */

/**
 * A module to parse OGR Virtual Format files.
 *
 * See the [GDAL documentation](https://gdal.org/drivers/vector/vrt.html) and
 * the [xsd
 * schema](https://github.com/OSGeo/gdal/blob/master/gdal/data/ogrvrt.xsd) of
 * the OGR VRT file.
 *
 * @example
 * Fetcher.multi('data', {
 *     xml: ['vrt'],
 *     text: ['csv']
 * }).then(function _(res) {
 *     return CSVnVRTParser.parse(res, {
 *         buildExtent: true,
 *         crsOut: 'EPSG:4326'
 *     });
 * }).then(function _(feature) {
 *     var source = new itowns.FileSource({ parsedData: feature });
 *     var layer = new itowns.ColorLayer('CSVnVRT', { source });
 *     view.addLayer(layer);
 * });
 *
 * @module CSVnVRTParser
 */
var CSVnVRTParser = (function _() {
    var coord = new itowns.Coordinates('EPSG:4326');

    function csv2json(csv) {
        var lines = csv.trim().split('\n');
        for (var i = 0; i < lines.length; i++) {
            lines[i] = lines[i].split(/;|\t|,/);
        }

        return {
            header: lines.shift(),
            content: lines,
        };
    }



    function OGRVRTLayer2Feature(layer, data, crs, options) {
        var collection = new itowns.FeatureCollection(options.crsOut, options);
        var feature = OGRVRTLayer2Feature(layer.OGRVRTLayer, data, layer.TargetSRS.value, options);
        collection.pushFeature(feature);

        var crs = (layer.LayerSRS && layer.LayerSRS.value) || crs;

        var type = itowns.FEATURE_TYPES.POINT;
        if (layer.GeometryType) {
            type = getGeometryType(layer.GeometryType.value);
        }

        var feature = new itowns.Feature(type, options.crsOut, options);

        if (layer.Field) {
            if (!layer.Field.length) {
                layer.Field = [layer.Field];
            }

            for (var i = 0; i < layer.Field.length; i++) {
                layer.Field[i].attributes.pos = data.header.indexOf(layer.Field[i].attributes.src);
            }
        }

        if (layer.GeometryField) {
            switch (layer.GeometryField.attributes.encoding) {
                case 'PointFromColumns':
                    var x = data.header.indexOf(layer.GeometryField.attributes.x);
                    var y = data.header.indexOf(layer.GeometryField.attributes.y);
                    var z = data.header.indexOf(layer.GeometryField.attributes.z);
                    var m = data.header.indexOf(layer.GeometryField.attributes.m);

                    var line;
                    for (var j = 0; j < data.content.length; j++) {
                        line = data.content[j];
                        var geometry = feature.bindNewGeometry();

                        if (layer.Field) {
                            for (var k = 0; k < layer.Field.length; k++) {
                                geometry.properties[layer.Field[k].attributes.name] = line[layer.Field[k].attributes.pos];
                            }
                        }

                        geometry.startSubGeometry(1);
                        coord.crs = (layer.GeometryField.SRS && layer.GeometryField.SRS.value) || crs;
                        coord.setFromValues(Number(line[x]), Number(line[y]), Number(line[z]) || 0);
                        geometry.pushCoordinates(coord);

                        geometry.updateExtent();
                        feature.updateExtent(geometry);
                    }

                    break;
                case undefined:
                    break;
                default:
                    throw new Error('This type of encoding is not supported yet: ' + layer.GeometryField.attributes.encoding);
            }
        }

        return feature;
    }

    // Convert an OGRVRTWarpedLayer to a Feature
    function OGRVRTWarpedLayer2Feature(layer, data, options) {
        var opts = Object.assign({}, options);

        if (layer.SrcSRS) {
            opts.crsIn = layer.SrcSRS.value;
        }

        if (layer.TargetSRS) {
            opts.crsOut = layer.TargetSRS.value;
        }

        if (layer.ExtentXMin && layer.ExtentYMin && layer.ExtentXMax && layer.ExtentYMax) {
            opts.buildExtent = false;
            opts.extent = new itowns.Extent(opts.crsOut,
                layer.ExtentXMin.value, layer.ExtentXMax.value,
                layer.ExtentYMin.value, layer.ExtentYMax.value);
        }

        if (layer.WarpedGeomFieldName) {
            console.warn('WarpedGeomFieldName is not supported yet');
        }

        return readLayer(layer, data, opts);
    }

    // Convert an OGRVRTUnionLayer to a Feature
    function OGRVRTUnionLayer2Feature(layer, data, options) {
        var opts = Object.assign({}, options);


        if (layer.GeometryType) {
            opts.type = getGeometryType(layer.GeometryType.value);
        }

        if (layer.LayerSRS) {
            opts.crs
        }

        if (layer.ExtentXMin && layer.ExtentYMin && layer.ExtentXMax && layer.ExtentYMax) {
            opts.buildExtent = false;
            opts.extent = new itowns.Extent(opts.crsOut,
                layer.ExtentXMin.value, layer.ExtentXMax.value,
                layer.ExtentYMin.value, layer.ExtentYMax.value);
        }

    }

    function readLayer(layer, data, options) {
        if (layer.OGRVRTLayer) {
            return OGRVRTLayer2Feature(layer, data, options);
        } else if (layer.OGRVRTWarpedLayer) {
            return OGRVRTWarpedLayer2Feature(layer, data, options);
        } else if (layer.OGRVRTUnionLayer) {
            return OGRVRTUnionLayer2Feature(layer, data, options);
        }
    }

    return {
        /**
         * Parse a CSV associated to a VRT and return a {@link
         * FeatureCollection}.
         *
         * @param {Object} data - The data needed.
         * @param {string} data.csv - Data from the CSV, with values separated
         * by comma, semicolon or tabulation.
         * @param {Document} data.vrt - The OGR VRT file, describing the CSV.
         * @param {geojsonParserOptions} [options]
         *
         * @return {Promise} A promise resolving with a [FeatureCollection]{@link
         * module:GeoJsonParser~FeatureCollection}.
         *
         * @memberof module:CSVnVRTParser
         */
        parse: function _(data, options) {
            if (!data.csv || !data.vrt) {
                throw new Error('Missing files when parsing');
            }
            var json = csv2json(data.csv);
            var schema = xml2json(data.vrt.children[0], {});

            var collection = readLayer(schema.OGRVRTDataSource, json, options);

            return Promise.resolve(collection);
        },
    };
}());

if (typeof module != 'undefined' && module.exports) {
    module.exports = CSVnVRTParser;
}
