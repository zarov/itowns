import Extent from 'Core/Geographic/Extent';
import FeatureGeometry from 'Core/Objects/FeatureGeometry';

function defaultExtent(crs) {
    return new Extent(crs, Infinity, -Infinity, Infinity, -Infinity);
}

function push2DValues(value0, value1) {
    this.vertices[this._pos++] = value0;
    this.vertices[this._pos++] = value1;
}

function push3DValues(value0, value1, value2 = 0) {
    this.vertices[this._pos++] = value0;
    this.vertices[this._pos++] = value1;
    this.vertices[this._pos++] = value2;
}

export const FEATURE_TYPES = {
    POINT: 0,
    LINE: 1,
    POLYGON: 2,
};

/**
 *
 * This class improves and simplifies the construction and conversion of geographic data structures.
 * It's an intermediary structure between geomatic formats and THREE objects.
 *
 * @property {string} type - Geometry type, can be `point`, `line`, or
 * `polygon`.
 * @property {number[]} vertices - All the vertices of the Feature.
 * @property {number[]} normals - All the normals of the Feature.
 * @property {number} size - the number of values of the array that should be associated with a coordinates.
 * The size is 3 with altitude and 2 without altitude.
 * @property {string} crs - Geographic or Geocentric coordinates system.
 * @property {Array.<FeatureGeometry>} geometry - The feature's geometry.
 * @property {Extent?} extent - The extent containing all the geometries
 * composing the feature.
 */
class Feature {
    /**
     *
     * @param {string} type type of Feature. It can be 'point', 'line' or 'polygon'.
     * @param {string} crs Geographic or Geocentric coordinates system.
     * @param {Object} [options={}] options to build feature.
     * @param {boolean} [options.buildExtent] Build extent and update when adding new vertice.
     * @param {boolean} [options.withAltitude] Set vertice altitude when adding new vertice.
     * @param {boolean} [options.withNormal] Set vertice normal when adding new vertice.
     */
    constructor(type, crs, options = {}) {
        if (Object.keys(FEATURE_TYPES).find(t => FEATURE_TYPES[t] === type)) {
            this.type = type;
        } else {
            throw new Error(`Unsupported Feature type: ${type}`);
        }
        this.geometry = [];
        this.vertices = [];
        this.normals = options.withNormal ? [] : undefined;
        this.crs = crs;
        this.size = options.withAltitude ? 3 : 2;
        this.extent = options.buildExtent ? defaultExtent(crs) : undefined;
        this._pos = 0;
        this._pushValues = (this.size === 3 ? push3DValues : push2DValues).bind(this);
    }
    /**
     * Instance a new {@link FeatureGeometry}  and push in {@link Feature}.
     * @returns {FeatureGeometry} the instancied geometry.
     */
    bindNewGeometry() {
        const geometry = new FeatureGeometry(this);
        this.geometry.push(geometry);
        return geometry;
    }
    /**
     * Update {@link Extent} feature with {@link Extent} geometry
     * @param {FeatureGeometry} geometry used to update Feature {@link Extent}
     */
    updateExtent(geometry) {
        if (this.extent) {
            this.extent.union(geometry.extent);
        }
    }

    /**
     * @returns {number} the count of geometry.
     */
    get geometryCount() {
        return this.geometry.length;
    }
}

export default Feature;
