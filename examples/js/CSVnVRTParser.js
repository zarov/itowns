/* global itowns, Promise, THREE */

/**
 * A module to parse OGR Virtual Format files.
 *
 * See the [GDAL documentation](https://gdal.org/drivers/vector/vrt.html) and
 * the [xsd
 * schema](https://github.com/OSGeo/gdal/blob/master/gdal/data/ogrvrt.xsd) of
 * the OGR VRT file.
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
            data: lines
        };
    }

    function xml2json(xml, json) {
        var name = xml.nodeName;
        json[name] = {};


        var attributes = xml.getAttributeNames();
        if (attributes.length > 0) {
            json[name].attributes = {};
            for (var i = 0; i < attributes.length; i++) {
                json[name].attributes[attributes[i]] = xml.getAttributeNode(attributes[i]).value;
            }
        }

        if (xml.childElementCount > 0) {
            for (var i = 0; i < xml.childElementCount; i++) {
                xml2json(xml.children[i], json[name]);
            }
        } else if (xml.textContent) {
            json[name].value = xml.textContent;
        }
    }

    function getGeometryType(type) {
        switch (type) {
            case 'wkbPoint':
            case 'wkbMultiPoint':
                return itowns.FEATURE_TYPES.POINT;
            case 'wkbLineString':
            case 'wkbMultiLineString':
                return itowns.FEATURE_TYPES.LINE;
            case 'wkbPolygon':
            case 'wkbMultiPolygon':
                return itowns.FEATURE_TYPES.POLYGON;
            default:
                throw new Error('This type of GeometryType is not supported yet: ' + type);
                break;
        }
    }

    function OGRVRTLayer2Feature(json, layer, srs, options) {
        var crs = (layer.LayerSRS && layer.LayerSRS.value) || srs;

        var type = itowns.FEATURE_TYPES.POINT;
        if (layer.GeometryType) {
            type = getGeometryType(layer.GeometryType.value);
        }

        var feature = new itowns.Feature(itowns.FEATURE_TYPES.POINT, options.crsOut, options);

        if (layer.GeometryField) {
            switch (layer.GeometryField.attributes.encoding) {
                case 'PointFromColumns':
                    var x = json.header.indexOf(layer.GeometryField.attributes.x);
                    var y = json.header.indexOf(layer.GeometryField.attributes.y);
                    var z = json.header.indexOf(layer.GeometryField.attributes.z);
                    var m = json.header.indexOf(layer.GeometryField.attributes.m);

                    var line;
                    for (var i = 0; i < json.data.length; i++) {
                        line = json.data[i];
                        var geometry = feature.bindNewGeometry();

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
                    break;
            }
        }

        return feature;
    }

    return {
        parse: function _(data, options) {
            if (!data.csv || !data.vrt) {
                throw new Error('Missing files when parsing');
            }
            var json = csv2json(data.csv);

            var schema = {};
            xml2json(data.vrt.children[0], schema);

            var collection;
            if (schema.OGRVRTDataSource.OGRVRTLayer) {
                collection = new itowns.FeatureCollection(options.crsOut, options)
                var feature = OGRVRTLayer2Feature(json, schema.OGRVRTDataSource.OGRVRTLayer, schema.OGRVRTDataSource.TargetSRS.value, options);
                collection.pushFeature(feature);
            } else if (schema.OGRVRTDataSource.OGRVRTWarpedLayer) {
                throw new Error('not supported yet');
            } else if (schema.OGRVRTDataSource.OGRVRTUnionLayer) {
                throw new Error('not supported yet');
            }

            console.log(collection);

            return Promise.resolve(collection);
        },
    };
}());

if (typeof module != 'undefined' && module.exports) {
    module.exports = CSVnVRTParser;
}
