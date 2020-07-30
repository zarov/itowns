import * as THREE from 'three';
import PointCloudNode from 'Core/PointCloudNode';
import Fetcher from 'Provider/Fetcher';

const dHalfLength = new THREE.Vector3();

class EntwinePointTileNode extends PointCloudNode {
    constructor(depth, x, y, z, layer, numPoints = 0) {
        super(numPoints, layer);

        this.isEPTNode = true;

        this.depth = depth;
        this.x = x;
        this.y = y;
        this.z = z;

        this.id = `${depth}-${x}-${y}-${z}`;

        this.url = `${this.layer.source.url}/ept-data/${this.id}.${this.layer.source.extension}`;
    }

    createChildAABB(node) {
        const divideFactor = 2 ** (node.depth - this.depth);
        dHalfLength.copy(this.bbox.max).sub(this.bbox.min).divideScalar(divideFactor);

        node.bbox.min.copy(dHalfLength);
        node.bbox.min.x *= node.x;
        node.bbox.min.y *= node.y;
        node.bbox.min.z *= node.z;
        node.bbox.min.add(this.bbox.min);

        node.bbox.max.copy(node.bbox.min).add(dHalfLength);
    }

    get octreeIsLoaded() {
        return this.numPoints >= 0;
    }

    loadOctree() {
        return Fetcher.json(`${this.layer.source.url}/ept-hierarchy/${this.id}.json`, this.layer.source.networkOptions).then((hierarchy) => {
            this.numPoints = hierarchy[this.id];

            for (const id in hierarchy) {
                if (id != this.id) {
                    const [depth, x, y, z] = id.split('-').map(c => parseInt(c, 10));
                    const node = new EntwinePointTileNode(depth, x, y, z, this.layer, hierarchy[id]);
                    const parent = this.findParent(
                        depth - 1,
                        Math.floor(x / 2),
                        Math.floor(y / 2),
                        Math.floor(z / 2),
                    );
                    parent.add(node);
                }
            }
        });
    }

    findParent(depth, x, y, z) {
        if (this.depth == depth && this.x == x && this.y == y && this.z == z) {
            return this;
        } else if (this.children.length > 0) {
            for (let i = 0; i < this.children.length; i++) {
                const parent = this.children[i].findParent(depth, x, y, z);
                if (parent) {
                    return parent;
                }
            }
        }
    }
}

export default EntwinePointTileNode;
