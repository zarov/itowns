import LayerUpdateState from 'Layer/LayerUpdateState';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';
import Layer from 'Layer/Layer';
import Coordinates from 'Core/Geographic/Coordinates';
import Extent from 'Core/Geographic/Extent';
import Label from 'Core/Label';
import { FEATURE_TYPES } from 'Core/Feature';
import DEMUtils from 'Utils/DEMUtils';

const coord = new Coordinates('EPSG:4326', 0, 0, 0);
function extentInsideSource(extent, source) {
    return !source.extentInsideLimit(extent) ||
        (source.parsedData &&
        !source.parsedData.extent.isPointInside(extent.center(coord)));
}

let content;
const _extent = new Extent('EPSG:4326', 0, 0, 0, 0);

/**
 * A layer to handle a bunch of `Label`. This layer can be created on its own,
 * but it is better to use the option `labelEnabled` on another `Layer` to let
 * it work with it (see the `vector_tile_raster_2d` example).
 *
 * @property {boolean} isLabelLayer - Used to checkout whether this layer is a
 * LabelLayer.  Default is true. You should not change this, as it is used
 * internally for optimisation.
 * @property {string} crs - The crs of this layer.
 */
class LabelLayer extends Layer {
    constructor(id, crs) {
        super(id);

        this.isLabelLayer = true;
        this.crs = crs;
    }

    /**
     * Reads each {@link FeatureGeometry} that contains label configuration, and
     * creates the corresponding {@link Label}. To create a `Label`, a geometry
     * needs to have a `label` object with at least a few properties:
     * - `content`, which refers to `Label#content`
     * - `position`, which refers to `Label#position`
     * - (optional) `config`, containing miscellaneous configuration for the
     *   label
     *
     * The geometry (or its parent Feature) needs to have a Style set.
     *
     * @param {FeatureCollection} data - The FeatureCollection to read the
     * labels from.
     * @param {Extent} extent
     *
     * @return {Label[]} An array containing all the created labels.
     */
    convert(data, extent) {
        const labels = [];

        const layerField = this.style && this.style.text && this.style.text.field;

        // Converting the extent now is faster for further operation
        extent.as(data.crs, _extent);
        coord.crs = data.crs;

        data.features.forEach((f) => {
            // TODO: add support for LINE and POLYGON
            if (f.type !== FEATURE_TYPES.POINT) {
                return;
            }

            const featureField = f.style && f.style.text.field;

            f.geometry.forEach((g) => {
                const geometryField = g.properties.style && g.properties.style.text.field;

                if (!geometryField && !featureField && !layerField) {
                    return;
                } else {
                    content = g.properties[geometryField || featureField || layerField];
                }

                // NOTE: this only works because only POINT is supported, it
                // needs more work for LINE and POLYGON
                coord.setFromArray(f.vertices, g.size * g.indices[0].offset);
                if (f.size == 2) { coord.z = 0; }

                if (this.source.isFileSource && !_extent.isPointInside(coord)) { return; }

                // FIXME: Style management needs improvement, see #1318.
                const label = new Label(content, coord.clone(), { crs: this.crs }, g.properties.style || f.style || this.style);
                // coord.x = (coord.x / data.scale.x) - data.translation.x;
                // coord.y = (coord.y / data.scale.y) - data.translation.y;

                if (f.size == 2) {
                    label.needsAltitude = true;
                }

                labels.push(label);
            });
        });

        return labels;
    }

    update(context, layer, node, parent) {
        if (!parent && node.children.length) {
            // if node has been removed dispose three.js resource
            ObjectRemovalHelper.removeChildrenAndCleanupRecursively(this, node);
            return;
        }

        if (this.frozen || !node.visible) {
            return;
        }

        if (node.layerUpdateState[this.id] === undefined) {
            node.layerUpdateState[this.id] = new LayerUpdateState();
        }

        if (!node.layerUpdateState[this.id].canTryUpdate()) {
            return;
        }

        const extentsDestination = node.getExtentsByProjection(this.source.projection) || [node.extent];

        const extentsSource = [];
        for (const extentDest of extentsDestination) {
            const ext = this.source.projection == extentDest.crs ? extentDest : extentDest.as(this.source.projection);
            if (extentInsideSource(ext, this.source)) {
                node.layerUpdateState[this.id].noMoreUpdatePossible();
                return;
            }
            extentsSource.push(extentDest);
        }
        node.layerUpdateState[this.id].newTry();

        const command = {
            layer: this,
            extentsSource,
            view: context.view,
            threejsLayer: this.threejsLayer,
            requester: node,
        };

        return context.scheduler.execute(command).then((result) => {
            if (!result) { return; }

            result.forEach((labels) => {
                if (!node.parent) {
                    labels.forEach(l => ObjectRemovalHelper.removeChildrenAndCleanupRecursively(this, l));
                    return;
                }

                labels.forEach((label) => {
                    if (label.parent) { return; }

                    label.minlevel = node.extent.zoom;

                    if (label.needsToBeMoved) {
                        node.worldToLocal(label.position);
                        label.needsToBeMoved = false;
                    }

                    node.add(label);
                    context.view.mainLoop.gfxEngine.label2dRenderer.domElement.appendChild(label.content);

                    if (label.needsAltitude) {
                        // TODO: add a Style property for the offset
                        label.position.z = DEMUtils.getElevationValueAt(this.parent, label.coordinates) + 2;
                    }

                    label.visible = true;
                    label.updateDimensions();
                    label.updateMatrixWorld();
                });
            });

            // Necessary event listener, to remove any Label attached to this
            // tile
            const removedHandler = node.addEventListener('removed', () => {
                node.removeEventListener(removedHandler);
                result.forEach(labels => labels.forEach(l => node.remove(l)));
            });

            // When zooming, a node keeps its visible state, but its material is
            // not visible anymore. The state of the material is used to hide
            // the labels, as it can't rely on the state of the node.
            node.material.addEventListener('invisible', () => {
                result.forEach(labels => labels.forEach((l) => { l.visible = false; }));
            });
            node.material.addEventListener('visible', () => {
                result.forEach(labels => labels.forEach((l) => { l.visible = true; }));
            });

            node.layerUpdateState[this.id].noMoreUpdatePossible();
        });
    }
}

export default LabelLayer;
