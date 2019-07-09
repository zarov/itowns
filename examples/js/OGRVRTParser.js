var OGRVRTParser = (function () {
    function xml2json(xml, json) {
        var res = {};

        var attributes = xml.getAttributeNames();
        if (attributes.length > 0) {
            res.attributes = {};
            for (var i = 0; i < attributes.length; i++) {
                res.attributes[attributes[i]] = xml.getAttributeNode(attributes[i]).value;
            }
        }

        if (xml.childElementCount > 0) {
            for (var j = 0; j < xml.childElementCount; j++) {
                xml2json(xml.children[j], res);
            }
        } else if (xml.textContent) {
            res.value = xml.textContent;
        }

        var name = xml.nodeName;

        if (!json[name]) {
            json[name] = res;
        } else if (json[name].length > 0) {
            json[name].push(res);
        } else {
            json[name] = [res];
        }

        return json;
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
        }
    }

    function readOGRVRTLayer(layer, target) {
        // SrcDataSource -> The URL to get
        // OpenOptions -> not supported
        // SrcLayer -> not supported
        // SrcSQL -> not supported
        // FID -> not supported
        // Style -> not supported
        // GeometryType -> getGeometryType()
        // LayerSRS -> inherits from parent if not present
        // GeometryField ->
        // SrcRegion -> not supported
        // Field -> gives properties of a feature
        // FeatureCount ->
        // Extent -> Give the extent of this layer
    }

    // A OGRVRTWarpedLayer will have its child converted to another projection
    function readOGRVRTWarpedLayer(layer, target) {
        // SrcSRS -> crsIn, if not present see the child SRS
        // TargetSRS -> crsOut
        // Extent -> Give the extent of this warped layer
        // WarpedGeomFieldName -> not supported
        if (layer.SrcSRS) {
            target.crsIn = layer.SrcSRS.value;
        }

        if (!layer.TargetSRS) {
            throw new Error('TargetSRS is missing');
        }
        target.crsOut = layer.TargetSRS.value;

        return readLayer(layer, target);
    }

    function multipleLayers(layers, name) {
        if (layers) {
            var target = [];
            var fakeLayer = {};

            if (!Array.isArray(layers)) {
                layers = [layers];
            }

            for (var i = 0; i < layers.length; i++) {
                fakeLayer[name] = layers[i];
                readLayer(fakeLayer, target[i]);
            }

            return target;
        }
    }

    // A OGRVRTUnionLayer will have all its children features merged
    function readOGRVRTUnionLayer(layer, target) {
        // PreserveSrcFID -> not supported
        // SourceLayerFieldName -> not supported
        // GeometryType -> if not present, let children specified their own,
        //                 otherwise children inherits from it
        // LayerSRS -> overrides the parent SRS
        // FieldStrategy -> not supported
        // Field -> not supported
        // GeometryField -> not supported
        // FeatureCount -> not supported
        // Extent -> give the extent of this union

        target.OGRVRTLayer = multipleLayers(layer.OGRVRTLayer, 'OGRVRTLayer');
        target.OGRVRTWarpedLayer = multipleLayers(layer.OGRVRTWarpedLayer, 'OGRVRTWarpedLayer');
        target.OGRVRTUnionLayer = multipleLayers(layer.OGRVRTUnionLayer, 'OGRVRTWarpedLayer');

        return target;
    }

    function readLayer(layer, target) {
        if (layer.OGRVRTLayer) {
            return readOGRVRTLayer(layer.OGRVRTLayer, target);
        } else if (layer.OGRVRTWarpedLayer) {
            return readOGRVRTWarpedLayer(layer.OGRVRTWarpedLayer, target);
        } else if (layer.OGRVRTUnionLayer) {
            return readOGRVRTUnionLayer(layer.OGRVRTUnionLayer, target);
        }
    }

    return {
        parse: function _(vrt, options) {
            var schema = xml2json(vrt.children[0], {});

            var result = readLayer(schema.OGRVRTDataSource, {});

            return Promise.resolve(result);
        },
    };
}());

if (typeof module != 'undefined' && module.exports) {
    module.exports = OGRVRTParser;
}
