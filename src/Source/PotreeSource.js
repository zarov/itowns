import Source from 'Source/Source';
import Fetcher from 'Provider/Fetcher';
import PotreeBinParser from 'Parser/PotreeBinParser';
import PotreeCinParser from 'Parser/PotreeCinParser';
import LASParser from 'Parser/LASParser';

/**
 * @classdesc
 * PotreeSource are object containing informations on how to fetch points cloud resources.
 *
 *
 */

class PotreeSource extends Source {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * PotreeSource
     * @param {string} source.url - folder url.
     * @param {string} source.file - cloud file name.
     *
     * This `cloud` file stores information about the potree cloud in JSON format. the structure is :
     *
     * * __`version`__ - The cloud.js format may change over time. The version number is
     * necessary so that parsers know how to interpret the data.
     * * __`octreeDir`__ - Directory or URL where node data is stored. Usually points to
     * "data".
     * * __`boundingBox`__ - Contains the minimum and maximum of the axis aligned bounding box. This bounding box is cubic and aligned to fit to the octree root.
     * * __`tightBoundingBox`__ - This bounding box thightly fits the point data.
     * * __`pointAttributes`__ - Declares the point data format. May be 'LAS', 'LAZ' or in case if the BINARY format an array of attributes like
     * `['POSITION_CARTESIAN', 'COLOR_PACKED', 'INTENSITY']`
     * * __`POSITION_CARTESIAN`__ - 3 x 32bit signed integers for x/y/z coordinates
     * * __`COLOR_PACKED`__ - 4 x unsigned byte for r,g,b,a colors.
     * * __`spacing`__ - The minimum distance between points at root level.
     * ```
     * {
     *     version: '1.6',
     *     octreeDir: 'data',
     *     boundingBox: {
     *         lx: -4.9854,
     *         ly: 1.0366,
     *         lz: -3.4494,
     *         ux: 0.702300000000001,
     *         uy: 6.7243,
     *         uz: 2.2383
     *     },
     *     tightBoundingBox: {
     *         lx: -4.9854,
     *         ly: 1.0375,
     *         lz: -3.4494,
     *         ux: -0.7889,
     *         uy: 6.7243,
     *         uz: 1.1245
     *     },
     *     pointAttributes: [
     *         'POSITION_CARTESIAN',
     *         'COLOR_PACKED'
     *     ],
     *     spacing: 0.03,
     *     scale: 0.001,
     *     hierarchyStepSize: 5
     * }
     * ```
     *
     * @extends Source
     *
     * @constructor
     */
    constructor(source) {
        if (!source.file) {
            throw new Error('New PotreeSource: file is required');
        }

        super(source);
        this.file = source.file;
        this.fetcher = Fetcher.arrayBuffer;
        this.extensionOctree = 'hrc';

        // For cloud specification visit:
        // https://github.com/PropellerAero/potree-propeller-private/blob/master/docs/file_format.md#cloudjs
        this.whenReady = (source.cloud ? Promise.resolve(source.cloud) : Fetcher.json(`${this.url}/${this.file}`, this.networkOptions))
            .then((cloud) => {
                switch (cloud.pointAttributes) {
                    case 'CIN':
                        this.extension = 'cin';
                        this.parse = buffer => PotreeCinParser.parse(buffer);
                        break;
                    case 'LAS':
                        this.extension = 'las';
                        this.parse = buffer => LASParser.parse(buffer);
                        break;
                    case 'LAZ':
                        this.extension = 'laz';
                        this.parse = buffer => LASParser.parse(buffer);
                        break;
                    default:
                        this.extension = 'bin';
                        this.parse = buffer => PotreeBinParser.parse(buffer, cloud.pointAttributes);
                        break;
                }

                if (cloud.hierarchy) {
                    // eslint-ignore-next-line
                    console.warn('hierarchy property in Potree is deprecated - see potree documentation');
                    this.hierarchy = new Map(cloud.hierarchy);
                    this.baseurl = `${this.url}/${cloud.octreeDir}`;
                } else {
                    this.baseurl = `${this.url}/${cloud.octreeDir}/r`;
                }

                return cloud;
            });
    }
}

export default PotreeSource;
