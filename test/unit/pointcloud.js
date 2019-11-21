import assert from 'assert';
import GeometryLayer from 'Layer/GeometryLayer';
import View from 'Core/View';
import GlobeView from 'Core/Prefab/GlobeView';
import HttpsProxyAgent from 'https-proxy-agent';
import Renderer from './mock';

describe('point cloud', function () {
    const positionOnGlobe = { longitude: 4.631512, latitude: 43.675626, altitude: 250 };
    let renderer;
    let viewer;
    let pointcloud;
    let context;
    let elt;

    before(function () {
        renderer = new Renderer();
        viewer = new GlobeView(renderer.domElement, positionOnGlobe, { renderer });

        // Configure Point Cloud layer
        pointcloud = new GeometryLayer('eglise_saint_blaise_arles', viewer.scene);
        pointcloud.file = 'eglise_saint_blaise_arles.js';
        pointcloud.protocol = 'potreeconverter';
        pointcloud.url = 'https://raw.githubusercontent.com/gmaillet/dataset/master';
        pointcloud.onPointsCreated = () => {};

        if (process.env.HTTPS_PROXY) {
            pointcloud.fetchOptions = { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) };
        }

        context = {
            camera: viewer.camera,
            engine: viewer.mainLoop.gfxEngine,
            scheduler: viewer.mainLoop.scheduler,
            geometryLayer: pointcloud,
            view: viewer,
        };
    });

    it('Add point cloud layer', function (done) {
        View.prototype.addLayer.call(viewer, pointcloud).then((layer) => {
            context.camera.camera3D.updateMatrixWorld();
            assert.equal(layer.root.children.length, 7);
            layer.bboxes.visible = true;
            done();
        });
    });

    it('preupdate point cloud layer', function () {
        elt = pointcloud.preUpdate(context, new Set([pointcloud]));
        assert.equal(elt.length, 1);
    });

    it('update point cloud layer', function (done) {
        assert.equal(pointcloud.group.children.length, 0);
        pointcloud.update(context, pointcloud, elt[0]);
        elt[0].promise.then(() => {
            assert.equal(pointcloud.group.children.length, 1);
            done();
        });
    });

    it('postUpdate point cloud layer', function () {
        pointcloud.postUpdate(context, pointcloud);
    });
});

