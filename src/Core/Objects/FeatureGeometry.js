import * as THREE from 'three';
import Extent from 'Core/Geographic/Extent';

function defaultExtent(crs) {
    return new Extent(crs, Infinity, -Infinity, Infinity, -Infinity);
}

function _extendBuffer(feature, size) {
    feature.vertices.length += size * feature.size;
    if (feature.normals) {
        feature.normals.length = feature.vertices.length;
    }
}

const defaultNormal = new THREE.Vector3(0, 0, 1);

/**
 * @property {Extent} extent - The 2D extent containing all the points
 * composing the geometry.
 * @property {Object[]} indices - Contains the indices that define the geometry.
 * Objects stored in this array have two properties, an `offset` and a `count`.
 * The offset is related to the overall number of vertices in the Feature.
 *
 * @property {Object} properties - Properties of the geometry. It can be
 * anything specified in the GeoJSON under the `properties` property.
 */
class FeatureGeometry {
    /**
     * @param {Feature} feature geometry
     */
    constructor(feature) {
        this.extent = feature.extent ? defaultExtent(feature.crs) : undefined;
        this.indices = [];
        this.properties = {};
        this._currentExtent = feature.extent ? defaultExtent(feature.crs) : undefined;
        this.size = feature.size;
    }
    /**
     * Add a new marker to indicate the starting of sub geometry and extends the vertices buffer.
     * Then you have to push new the coordinates of sub geometry.
     * The sub geometry stored in indices, see constructor for more information.
     * @param {number} count - count of vertices
     * @param {Feature} feature - the feature containing the geometry
     */
    startSubGeometry(count, feature) {
        const last = this.indices.length - 1;
        const extent = this.extent ? defaultExtent(feature.crs) : undefined;
        const offset = last > -1 ?
            this.indices[last].offset + this.indices[last].count :
            feature.vertices.length / this.size;
        this.indices.push({ offset, count, extent });
        this._currentExtent = extent;
        _extendBuffer(feature, count);
    }

    /**
     * After you have pushed new the coordinates of sub geometry without
     * `startSubGeometry`, this function close sub geometry. The sub geometry
     * stored in indices, see constructor for more information.
     * @param {number} count count of vertices
     * @param {Feature} feature - the feature containing the geometry
     */
    closeSubGeometry(count, feature) {
        const last = this.indices.length - 1;
        const offset = last > -1 ?
            this.indices[last].offset + this.indices[last].count :
            feature.vertices.length / this.size - count;
        this.indices.push({ offset, count, extent: this._currentExtent });
        if (this.extent) {
            this.extent.union(this._currentExtent);
            this._currentExtent = defaultExtent(feature.crs);
        }
    }

    getLastSubGeometry() {
        const last = this.indices.length - 1;
        return this.indices[last];
    }
    /**
     * Push new coordinates in vertices buffer.
     * @param {Coordinates} coord The coordinates to push.
     * @param {Feature} feature - the feature containing the geometry
     */
    pushCoordinates(coord, feature) {
        if (coord.crs !== feature.crs) {
            coord.as(feature.crs, coord);
        }
        if (feature.normals) {
            coord.geodesicNormal.toArray(feature.normals, feature._pos);
        }

        feature._pushValues(coord.x, coord.y, coord.z);
        // expand extent if present
        if (this._currentExtent) {
            this._currentExtent.expandByCoordinates(coord);
        }
    }

    /**
     * Push new values coordinates in vertices buffer.
     * No geographical conversion is made or the normal doesn't stored.
     *
     * @param {Feature} feature - the feature containing the geometry
     * @param {number} long The longitude coordinate.
     * @param {number} lat The latitude coordinate.
     * @param {number} [alt=0] The altitude coordinate.
     * @param {THREE.Vector3} [normal=THREE.Vector3(0,0,1)] the normal on coordinates.
     */
    pushCoordinatesValues(feature, long, lat, alt = 0, normal = defaultNormal) {
        if (feature.normals) {
            normal.toArray(feature.normals, feature._pos);
        }

        feature._pushValues(long, lat, alt);
        // expand extent if present
        if (this._currentExtent) {
            this._currentExtent.expandByValuesCoordinates(long, lat, alt);
        }
    }

    /**
     * update geometry extent with the last sub geometry extent.
     */
    updateExtent() {
        if (this.extent) {
            const last = this.indices[this.indices.length - 1];
            if (last) {
                this.extent.union(last.extent);
            }
        }
    }
}

export default FeatureGeometry;
