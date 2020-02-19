import * as THREE from 'three';

/**
 * A grid to manage labels on the screen. By default it is instanciated in
 * Label2DRenderer as a 10 by 8 grid.
 */
class ScreenGrid {
    constructor(x = 12, y = 10, width, height) {
        this.x = x;
        this.y = y;

        this.grid = [];
        this.reset();

        this.width = width;
        this.height = height;
    }

    reset() {
        for (let i = 0; i < this.x; i++) {
            this.grid[i] = [];
        }
    }

    // insert
    insert(obj, ax, ay, bx, by) {
        const minx = Math.max(0, Math.floor((ax || obj.boundaries.left) / this.width * this.x));
        const maxx = Math.min(this.x - 1, Math.floor((bx || obj.boundaries.right) / this.width * this.x));
        const miny = Math.max(0, Math.floor((ay || obj.boundaries.top) / this.height * this.y));
        const maxy = Math.min(this.y - 1, Math.floor((by || obj.boundaries.bottom) / this.height * this.y));

        for (let i = minx; i <= maxx; i++) {
            for (let j = miny; j <= maxy; j++) {
                if (this.grid[i][j] != undefined) {
                    return;
                }
            }
        }

        for (let i = minx; i <= maxx; i++) {
            for (let j = miny; j <= maxy; j++) {
                this.grid[i][j] = obj;
            }
        }

        obj.visible = true;
    }

    forEach(cb) {
        for (let i = 0; i < this.x; i++) {
            for (let j = 0; j < this.y; j++) {
                cb(this.grid[i][j], i, j);
            }
        }
    }
}

const viewProjectionMatrix = new THREE.Matrix4();
const vector = new THREE.Vector3();
const cameraSquaredPosition = new THREE.Vector3();

/**
 * This renderer is inspired by the
 * [`THREE.CSS2DRenderer`](https://threejs.org/docs/#examples/en/renderers/CSS2DRenderer).
 * It is instanciated in `c3DEngine`, as another renderer to handles Labels.
 */
class Label2DRenderer {
    constructor() {
        this.domElement = document.createElement('div');
        this.domElement.style.overflow = 'hidden';
        this.domElement.style.position = 'absolute';
        this.domElement.style.top = 0;
        this.domElement.style.zIndex = 1;

        this.halfWidth = 0;
        this.halfHeight = 0;

        this.grid = new ScreenGrid();
    }

    setSize(width, height) {
        this.domElement.style.width = `${width}`;
        this.domElement.style.height = `${height}`;

        this.halfWidth = width / 2;
        this.halfHeight = height / 2;

        this.grid.width = width;
        this.grid.height = height;
        this.grid.x = Math.ceil(width / 20);
        this.grid.y = Math.ceil(height / 20);
    }

    render(scene, camera) {
        this.grid.reset();
        viewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        cameraSquaredPosition.setFromMatrixPosition(camera.matrixWorld);

        // culling
        this.culling(scene);
    }

    culling(object) {
        // if the object isn't a Label, there are a few options:
        // - it is visible
        //      - it has a material but not visible
        //          - iterate through not Label children (essentially TileMesh)
        //      - otherwise iterate through its children
        // - it not visible, hide all its potential Label children
        if (!object.isLabel) {
            if (!object.visible) {
                return;
            }

            if (object.material && !object.material.visible) {
                object.children.forEach(c => !c.isLabel && this.culling(c));
            } else {
                object.children.forEach(c => this.culling(c));
            }
        } else if (this.computeLabelPosition(object)) {
            object.move(object.x * this.halfWidth + this.halfWidth, -object.y * this.halfHeight + this.halfHeight);

            this.grid.insert(object);
        }
    }

    // Move the label - screen coordinates are between [-1;1]
    computeLabelPosition(label) {
        vector.setFromMatrixPosition(label.matrixWorld);
        vector.applyMatrix4(viewProjectionMatrix);

        label.visible = false;

        if (vector.z < -1 || vector.z > 1) {
            return false;
        } else {
            label.x = vector.x;
            label.y = vector.y;
            return true;
        }
    }
}

export default Label2DRenderer;
