import proj4 from 'proj4';
import LASParser from 'Parser/LASParser';
import Fetcher from 'Provider/Fetcher';
import Source from 'Source/Source';

class EntwinePointTileSource extends Source {
    constructor(config) {
        super(config);

        // https://entwine.io/entwine-point-tile.html#ept-json
        const json = Fetcher.json(`${this.url}/ept.json`, this.networkOptions)
            .then(metadata => Object.assign(this, metadata));

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

            if (this.srs && this.srs.authority && this.srs.horizontal) {
                this.projection = `${this.srs.authority}:${this.srs.horizontal}`;
                if (!proj4.defs(this.projection)) {
                    proj4.defs(this.projection, this.srs.wkt);
                }

                if (this.srs.vertical && this.srs.vertical !== this.srs.horizontal) {
                    console.warn('EPTSource: Vertical coordinates system code is not yet supported.');
                }
            }

            // NOTE: this spacing is kinda arbitrary here, we take the width and
            // length (height can be ignored), and we divide by the specified
            // span in ept.json. This needs improvements.
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
        // TODO: use and test PotreeBinParser
    }
}

export default EntwinePointTileSource;
