import * as THREE from 'three';
import Fetcher from 'Provider/Fetcher';

const size = new THREE.Vector3();
const position = new THREE.Vector3();
const translation = new THREE.Vector3();

class EntwinePointTileNode {
    constructor(depth, x, y, z, layer, numPoints = 0) {
        this.layer = layer;
        this.isEPTNode = true;

        this.depth = depth;
        this.x = x;
        this.y = y;
        this.z = z;

        this.id = `${depth}-${x}-${y}-${z}`;

        this.url = `${this.layer.source.url}/ept-data/${this.id}.${this.layer.source.extension}`;

        this.numPoints = numPoints;

        this.children = [];

        this.bbox = new THREE.Box3();
        this.sse = -1;
    }

    add(node) {
        this.children.push(node);
        node.parent = this;
        // TODO: read this.source.sources to get the corresponding bbox - if it
        // exists
        this.createChildAABB(node);
    }

    createChildAABB(node) {
        // factor to apply, based on the depth difference (can be > 1)
        const f = 2 ** (node.depth - this.depth);

        // size of the child node bbox (Vector3), based on the size of the
        // parent node, and divided by the factor
        this.bbox.getSize(size).divideScalar(f);

        // initialize the child node bbox at the location of the parent node bbox
        node.bbox.min.copy(this.bbox.min);

        // position of the parent node, if it was at the same depth than the
        // child, found by multiplying the tree position by the factor
        position.copy(this).multiplyScalar(f);

        // difference in position between the two nodes, at child depth, and
        // scale it using the size
        translation.subVectors(node, position).multiply(size);

        // apply the translation to the child node bbox
        node.bbox.min.add(translation);

        // use the size computed above to set the max
        node.bbox.max.copy(node.bbox.min).add(size);


        // TODO: probleme avec le Z et les sous hierarchy
    }

    get octreeIsLoaded() {
        return this.numPoints >= 0;
    }

    load() {
        if (!this.octreeIsLoaded) {
            this.loadOctree();
        }

        return this.layer.source.fetcher(this.url, this.layer.source.networkOptions).then(this.layer.source.parse);
    }

    loadOctree() {
        return Fetcher.json(`${this.layer.source.url}/ept-hierarchy/${this.id}.json`, this.layer.source.networkOptions).then((hierarchy) => {
            this.numPoints = hierarchy[this.id];

            const stack = [];
            stack.push(this);

            while (stack.length) {
                const node = stack.shift();
                const depth = node.depth + 1;
                const x = node.x * 2;
                const y = node.y * 2;
                const z = node.z * 2;

                node.findAndCreateChild(depth, x,     y,     z,     hierarchy, stack);
                node.findAndCreateChild(depth, x + 1, y,     z,     hierarchy, stack);
                node.findAndCreateChild(depth, x,     y + 1, z,     hierarchy, stack);
                node.findAndCreateChild(depth, x + 1, y + 1, z,     hierarchy, stack);
                node.findAndCreateChild(depth, x,     y,     z + 1, hierarchy, stack);
                node.findAndCreateChild(depth, x + 1, y,     z + 1, hierarchy, stack);
                node.findAndCreateChild(depth, x,     y + 1, z + 1, hierarchy, stack);
                node.findAndCreateChild(depth, x + 1, y + 1, z + 1, hierarchy, stack);
            }
        });
    }

    findCommonAncestor(node) {
        if (node.depth == this.depth) {
            if (node.id == this.id) {
                return node;
            } else if (node.depth != 0) {
                return this.parent.findCommonAncestor(node.parent);
            }
        } else if (node.depth < this.depth) {
            return this.parent.findCommonAncestor(node);
        } else {
            return this.findCommonAncestor(node.parent);
        }
    }

    findAndCreateChild(depth, x, y, z, hierarchy, stack) {
        const id = `${depth}-${x}-${y}-${z}`;
        const numPoints = hierarchy[id];

        if (typeof numPoints == 'number') {
            const child = new EntwinePointTileNode(depth, x, y, z, this.layer, numPoints);
            this.add(child);
            stack.push(child);
        }
    }
}

export default EntwinePointTileNode;
