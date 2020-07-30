import * as THREE from 'three';
import EntwinePointTileNode from 'Core/EntwinePointTileNode';
import PointCloudLayer from 'Layer/PointCloudLayer';
import Extent from 'Core/Geographic/Extent';

const bboxMesh = new THREE.Mesh();
const box3 = new THREE.Box3();
bboxMesh.geometry.boundingBox = box3;

class EntwinePointTileLayer extends PointCloudLayer {
    constructor(id, config, view) {
        super(id, config, view);
        this.isEntwinePointTileLayer = true;

        this.source = config.source;
        this.scale = new THREE.Vector3(1, 1, 1);

        const resolve = this.addInitializationStep();
        this.whenReady = this.source.whenReady.then(() => {
            this.root = new EntwinePointTileNode(0, 0, 0, 0, this, -1);
            this.root.bbox.min.fromArray(this.source.boundsConforming, 0);
            this.root.bbox.max.fromArray(this.source.boundsConforming, 3);

            this.extent = Extent.fromBox3(view.referenceCrs, this.root.bbox);
            return this.root.loadOctree().then(resolve);
        });
    }

    get spacing() {
        return this.source.spacing;
    }
}

export default EntwinePointTileLayer;
