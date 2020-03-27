import * as THREE from 'three';
import Coordinates from 'Core/Geographic/Coordinates';

const coord = new Coordinates('EPSG:4326');
let rect;

// set it once
let STYLE_TRANSFORM = '';

/**
 * An object that handles the display of a text and/or an icon, linked to a 3D
 * position. The content of the `Label` is managed through a DOM object, in a
 * `<div>` handled by the `Label2DRenderer`.
 *
 * @property {boolean} isLabel - Used to checkout whether this object is a
 * Label. Default is true. You should not change this, as it is used internally
 * for optimisation.
 * @property {Element} content - The DOM object that contains the content of the
 * label. The style and the position are applied on this object.
 * @property {THREE.Vector3} position - The position in the 3D world of the
 * label.
 * @property {Coordinates} coordinates - The coordinates of the label.
 */
class Label extends THREE.Object3D {
    /**
     * @param {Element|string} content - The content; can be a
     * string, with or without HTML tags in it, or it can be an Element.
     * @param {Coordinates} coordinates - The world coordinates, where to place
     * the Label.
     * @param {Object} options - Some options to apply to the label.
     * @param {string} options.crs - The CRS, used to place the label on the surface of
     * the view. Usually it is the CRS of the view.
     * @param {Style} style - The style to apply to the content. Once the style
     * is applied, it cannot be changed directly. However, if it really needed,
     * it can be accessed through `label.content.style`, but it is highly
     * discouraged to do so.
     */
    constructor(content, coordinates, options = {}, style) {
        if (content == undefined || coordinates == undefined) {
            throw new Error('content and coordinates are mandatory to add a Label');
        }

        super();

        let _visible = this.visible;
        // can't do an ES6 setter/getter here
        Object.defineProperty(this, 'visible', {
            set(v) {
                if (v != _visible) { // avoid changing the style
                    _visible = v;
                    this.content.style.display = v ? 'block' : 'none';
                }
            },
            get() {
                return _visible;
            },
        });

        this.isLabel = true;
        this.coordinates = coordinates;
        this.coordinates.as(options.crs || this.coordinates.crs, coord);
        coord.toVector3(this.position);
        this.needsToBeMoved = true;

        this.boundaries = { left: 0, right: 0, top: 0, bottom: 0 };

        this.content = document.createElement('div');
        this.content.style.userSelect = 'none';
        this.content.style.position = 'absolute';
        if (typeof content == 'string') {
            content = content.replace('\n', '<br/>');
            this.content.innerHTML = content || '';
        } else {
            this.content.appendChild(content);
        }

        if (style) {
            this.anchor = style.getTextAnchorPositionInCSS();
            style.applyToHTML(this.content);
        }

        this.addEventListener('removed', () => { this.visible = false; });

        // FIXME: this needs to be moved outside, to be executed only on start.
        // It can't for the moment because when doing unit testing, mocha is
        // first loading itowns, and then test files, including mock.js, which
        // contains a mock for document. So it fails.
        if (!STYLE_TRANSFORM && document) {
            if (document.documentElement.style.transform !== undefined) {
                STYLE_TRANSFORM = 'transform';
            } else if (document.documentElement.style.webkitTransform !== undefined) {
                STYLE_TRANSFORM = 'webkitTransform';
            } else if (document.documentElement.style.mozTransform !== undefined) {
                STYLE_TRANSFORM = 'mozTransform';
            } else if (document.documentElement.style.oTransform !== undefined) {
                STYLE_TRANSFORM = 'oTransform';
            } else {
                STYLE_TRANSFORM = 'transform';
            }
        }
    }

    /**
     * Moves a label on the screen, using screen coordinates. It updates the
     * boundaries as it moves it.
     *
     * @param {number} x - X coordinates in pixels, from left.
     * @param {number} y - Y coordinates in pixels, from top.
     */
    move(x, y) {
        if (x != this.x || y != this.y) {
            this.x = x;
            this.y = y;
            this.content.style[STYLE_TRANSFORM] = `${this.anchor} translate(${x}px, ${y}px)`;
            this.updateBoundaries();
        }
    }

    /**
     * Updates the `boundaries` object. It composed of four components: `left`,
     * `top`, `right` and `bottom`.
     */
    updateBoundaries() {
        this.boundaries.left = this.x;
        this.boundaries.right = this.x + this.width;
        this.boundaries.top = this.y;
        this.boundaries.bottom = this.y + this.height;
    }

    /**
     * Updates the screen dimensions of the label, using
     * `getBoundingClientRect`.  It updates `width` and `height` property of the
     * label, and the boundaries.
     */
    updateDimensions() {
        if (!this.width && !this.height) {
            rect = this.content.getBoundingClientRect();
            this.width = rect.width;
            this.height = rect.height;
            this.updateBoundaries();
        }
    }
}

export default Label;
