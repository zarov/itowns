import { MODE } from 'Renderer/PointsMaterial';

export default {
    initTools(view, layer, dat) {
        dat.width = 400;

        const update = () => view.notifyChange(layer, true);

        const folderName = `PointCloud layer - ${layer.id}`;
        if (dat.__folders[folderName]) {
            dat.removeFolder(dat.__folders[folderName]);
        }
        layer.debugUI = dat.addFolder(folderName);

        layer.debugUI.add(layer, 'visible').name('Visible').onChange(update);
        layer.debugUI.add(layer, 'opacity', 0, 1).name('Opacity').onChange(update);
        layer.debugUI.add(layer, 'pointSize', 0, 15).name('Point Size').onChange(update);
        layer.debugUI.add(layer, 'pointBudget', 1, 5000000).name('Max points displayed').onChange(update);
        layer.debugUI.add(layer.object3d.position, 'z', -50, 50).name('Z translation').onChange(() => {
            layer.object3d.updateMatrixWorld();
            view.notifyChange(layer);
        });

        layer.debugUI.add(layer.bboxes, 'visible').name('Display Bounding Boxes').onChange(update);

        layer.debugUI.add(layer.material, 'mode', MODE).name('Display mode').onChange(update);
    },
};
