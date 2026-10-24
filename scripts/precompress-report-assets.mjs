import {brotliCompressSync, constants} from 'node:zlib';
import {createHash} from 'node:crypto';

// Optional standard HTTP representation, never another content publication.
// Run once on the final main-build assets (including worker assets), not for
// every module registration. Browsers still import the original hashed URL.
export function precompressReportAssets() {
  return {
    name: 'omnibus-precompress-report-assets',
    generateBundle(_options, bundle) {
      for (const asset of Object.values(bundle)) {
        const match = asset.fileName.match(/^assets\/report-content-([a-f0-9]{64})\.js$/);
        if (!match) continue;
        if (asset.type !== 'asset') throw Error('Invalid report compression input.');
        if (Object.hasOwn(bundle, asset.fileName + '.br')) throw Error('Report compression output already exists.');
        const bytes = Buffer.from(asset.source);
        if (bytes.length > 4 * 1024 * 1024 || createHash('sha256').update(bytes).digest('hex') !== match[1])
          throw Error('Invalid report compression input.');
        if (bytes.length <= 1024) continue;
        const compressed = brotliCompressSync(bytes, {params: {
          [constants.BROTLI_PARAM_QUALITY]: 11,
          [constants.BROTLI_PARAM_LGWIN]: 20,
          [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
          [constants.BROTLI_PARAM_SIZE_HINT]: bytes.length,
        }});
        if (compressed.length < bytes.length)
          this.emitFile({type: 'asset', fileName: asset.fileName + '.br', source: compressed});
      }
    },
  };
}
