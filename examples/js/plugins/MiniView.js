var MiniView = (function () {
    var miniView;

    return {
        init(div, view, position) {
            var miniDiv = document.createElement('div');
            miniDiv.id = 'miniDiv';
            div.appendChild(miniDiv);

            miniView = new itowns.GlobeView(miniDiv, position, {
                // `limit globe' subdivision level:
                // we're don't need a precise globe model
                // since the mini globe will always be seen from a far point of view (see minDistance above)
                maxSubdivisionLevel: 2,
                // Don't instance default controls since miniview's camera will be synced
                // on the main view's one (see view.addFrameRequester)
                noControls: true,
            });

            // Set a 0 alpha clear value (instead of the default '1')
            // because we want a transparent background for the miniglobe view to be able
            // to see the main view "behind"
            miniView.mainLoop.gfxEngine.renderer.setClearColor(0x000000, 0);


            // update miniview's camera with the view's camera position
            view.addFrameRequester(itowns.MAIN_LOOP_EVENTS.AFTER_RENDER, function updateMiniView() {
                // clamp distance camera from globe
                var distanceCamera = view.camera.camera3D.position.length();
                var distance = Math.min(Math.max(distanceCamera * 1.5, minDistance), maxDistance);
                var camera = miniView.camera.camera3D;
                var cameraTargetPosition = view.controls.getCameraTargetPosition();
                // Update target miniview's camera
                camera.position.copy(cameraTargetPosition).setLength(distance);
                camera.lookAt(cameraTargetPosition);
                miniView.notifyChange(camera);
            });
        },

        addLayer(layer) {
            miniView.addLayer(layer);
        }
    };
}());

if (typeof module != 'undefined' && module.exports) {
    module.exports = MiniView;
}
