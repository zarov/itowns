import LASParser from 'Parser/LASParser';
import Fetcher from 'Provider/Fetcher';
import Source from 'Source/Source';
import Coordinates from 'Core/Geographic/Coordinates';

class EntwinePointTileSource extends Source {
    constructor(config) {
        super(config);

        // https://entwine.io/entwine-point-tile.html#ept-json
        const json = Fetcher.json(`${this.url}/ept.json`, this.networkOptions)
            .then(metadata => Object.assign(this, metadata));

        // TODO: case with no list
        // https://entwine.io/entwine-point-tile.html#ept-sources
        this.sources = {};
        this.sourcesMetadata = {};
        const list = Fetcher.json(`${this.url}/ept-sources/list.json`, this.networkOptions)
            .then((list) => {
                list.forEach((obj) => {
                    this.sources[obj.id] = obj;
                    if (obj.url && !this.sourcesMetadata[obj.url]) {
                        this.sourcesMetadata[obj.url] = {};
                    }
                });

                for (const s in this.sourcesMetadata) {
                    if (typeof s == 'string') {
                        Fetcher.json(`${this.url}/ept-sources/${s}`, this.networkOptions).then((source) => {
                            this.sourcesMetadata[s] = source;
                        });
                    }
                }
            });

        this.whenReady = Promise.all([json, list]).then(() => {
            // Set parser and its configuration from schema
            this.parse = this.dataType === 'laszip' ? data => this.parseLaz(data) : data => this.parseBin(data);
            this.extension = this.dataType === 'laszip' ? 'laz' : 'bin';

            // TODO:
            // - srs
            // - scale
            // - offset (replacing this.center)
            // - others things from this.schema
            this.center = new Coordinates('EPSG:3857',
                (this.boundsConforming[3] + this.boundsConforming[0]) / 2,
                (this.boundsConforming[4] + this.boundsConforming[1]) / 2,
                (this.boundsConforming[5] + this.boundsConforming[2]) / 2);

            this.spacing = (Math.abs(this.boundsConforming[3] - this.boundsConforming[0])
                + Math.abs(this.boundsConforming[4] - this.boundsConforming[1])) / (2 * this.span);

            return this;
        });

        this.fetcher = Fetcher.arrayBuffer;
    }

    parseLaz(data) {
        return LASParser.parse(data, this.schema);
    }

    parseBin() {
        // TODO: use PotreeBinParser
    }
}

export default EntwinePointTileSource;
