import * as THREE from 'three';
import PointCloudLayer from 'Layer/PointCloudLayer';
import PotreeNode from 'Core/PotreeNode';
import Extent from 'Core/Geographic/Extent';

const bboxMesh = new THREE.Mesh();
const box3 = new THREE.Box3();
bboxMesh.geometry.boundingBox = box3;

class PotreeLayer extends PointCloudLayer {
    /**
     * Constructs a new instance of point cloud layer.
     * @constructor
     * @extends PointCloudLayer
     *
     * @example
     * // Create a new point cloud layer
     * const points = new PotreeLayer('points',
     *  {
     *      source: new PotreeLayer({
     *          url: 'https://pointsClouds/',
     *          file: 'points.js',
     *      }
     *  }, view);
     *
     * View.prototype.addLayer.call(view, points);
     *
     * @param      {string}  id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param      {object}  config   configuration, all elements in it
     * will be merged as is in the layer.
     * @param {number} [config.pointBudget=2000000] max displayed points count.
     * @param {PotreeSource} config.source - Description and options of the source.
     * @param {number} [config.sseThreshold=2] screen space error Threshold.
     * @param {number} [config.pointSize=4] point size.
     * @param {THREE.Material} [config.material] override material.
     * @param {number} [config.mode=MODE.COLOR] displaying mode.
     *
     * @param  {View}  view  The view
     */
    constructor(id, config, view) {
        super(id, config, view);
        this.isPotreeLayer = true;

        const resolve = this.addInitializationStep();

        this.source.whenReady.then((cloud) => {
            this.scale = new THREE.Vector3().addScalar(cloud.scale);
            this.spacing = cloud.spacing;
            this.hierarchyStepSize = cloud.hierarchyStepSize;

            const normal = Array.isArray(cloud.pointAttributes) &&
                cloud.pointAttributes.find(elem => elem.startsWith('NORMAL'));
            if (normal) {
                this.material.defines[normal] = 1;
            }

            this.supportsProgressiveDisplay = (this.source.extension === 'cin');

            this.root = new PotreeNode(0, 0, this);
            this.root.bbox.min.set(cloud.boundingBox.lx, cloud.boundingBox.ly, cloud.boundingBox.lz);
            this.root.bbox.max.set(cloud.boundingBox.ux, cloud.boundingBox.uy, cloud.boundingBox.uz);

            this.extent = Extent.fromBox3(view.referenceCrs, this.root.bbox);
            return this.root.loadOctree().then(resolve);
        });
    }
}

export default PotreeLayer;
