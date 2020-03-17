import * as THREE from 'three';
import Feature from 'Core/Objects/Feature';
import Extent from 'Core/Geographic/Extent';

function defaultExtent(crs) {
    return new Extent(crs, Infinity, -Infinity, Infinity, -Infinity);
}

/**
 * @property {Feature[]} features - The array of features composing the
 * collection.
 * @property {Extent?} extent - The 2D extent containing all the features
 * composing the collection.
 * @property {string} crs - Geographic or Geocentric coordinates system.
 * @property {boolean} isFeatureCollection - Used to check whether this is FeatureCollection.
 * @property {THREE.Vector3} translation - Apply translation on vertices and extent to transform on coordinates system.
 * @property {THREE.Vector3} scale - Apply scale on vertices and extent to transform on coordinates system.
 *
 * An object regrouping a list of [features]{@link Feature} and the extent of this collection.
 */
class FeatureCollection {
    constructor(crs, options) {
        this.isFeatureCollection = true;
        this.crs = crs;
        this.features = [];
        this.optionsFeature = options || {};
        this.extent = this.optionsFeature.buildExtent ? defaultExtent(crs) : undefined;
        this.translation = new THREE.Vector3();
        this.scale = new THREE.Vector3(1, 1, 1);
    }

    /**
     * Update FeatureCollection extent with `extent` or all features extent if
     * `extent` is `undefined`.
     * @param {Extent} extent
     */
    updateExtent(extent) {
        if (this.extent) {
            const extents = extent ? [extent] : this.features.map(feature => feature.extent);
            for (const ext of extents) {
                this.extent.union(ext);
            }
        }
    }

    /**
     * Remove features that don't have [FeatureGeometry]{@link FeatureGeometry}.
     */
    removeEmptyFeature() {
        this.features = this.features.filter(feature => feature.geometry.length);
    }

    /**
     * Push the `feature` in FeatureCollection.
     * @param {Feature} feature
     */
    pushFeature(feature) {
        this.features.push(feature);
        this.updateExtent(feature.extent);
    }

    requestFeature(type, callback) {
        const feature = this.features.find(callback);
        if (feature && this.optionsFeature.mergeFeatures) {
            return feature;
        } else {
            const newFeature = new Feature(type, this.crs, this.optionsFeature);
            this.features.push(newFeature);
            return newFeature;
        }
    }

    /**
     * Returns the Feature by type if `mergeFeatures` is `true` or returns the
     * new instance of typed Feature.
     *
     * @param {string} type the type requested
     * @returns {Feature}
     */
    requestFeatureByType(type) {
        return this.requestFeature(type, feature => feature.type === type);
    }

    /**
     * Returns the Feature by type if `mergeFeatures` is `true` or returns the
     * new instance of typed Feature.
     *
     * @param {string} id the id requested
     * @param {string} type the type requested
     * @returns {Feature}
     */
    requestFeatureById(id, type) {
        return this.requestFeature(type, feature => feature.id === id);
    }
    /**
     * Add a new feature with references to all properties.
     * It allows to have features with different styles
     * without having to duplicate the geometry.
     * @param      {Feature}   feature  The feature to reference.
     * @return     {Feature}  The new referenced feature
     */
    newFeatureByReference(feature) {
        const ref = new Feature(feature.type, this.crs, this.optionsFeature);
        ref.extent = feature.extent;
        ref.geometry = feature.geometry;
        ref.normals = feature.normals;
        ref.size = feature.size;
        ref.vertices = feature.vertices;
        ref._pos = feature._pos;
        this.features.push(ref);
        return ref;
    }
}

export default FeatureCollection;
