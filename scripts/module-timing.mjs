// Development-only build instrumentation. Records how long each module's own
// top-level statements take to evaluate, so startup cost can be attributed.
// Not used by the released offline build.
const DIRECTIVE = /^\s*(['"])use [a-z ]+\1\s*;?\s*/;

export function moduleTimingPlugin() {
  return {
    name: 'omnibus-module-timing',
    enforce: 'post',
    transform(code, id) {
      if (id.includes('\0') || /\.(css|json)($|\?)/.test(id)) return null;
      if (!/\.(mjs|js|ts|tsx|jsx)($|\?)/.test(id)) return null;
      const label = id.replace(/^.*[\\/]viewer[\\/]/, '').replace(/\?.*$/, '');
      const start = `globalThis.__MT=globalThis.__MT||[];const __mt_s=performance.now();`;
      const end = `\n;globalThis.__MT.push([${JSON.stringify(label)},performance.now()-__mt_s]);`;
      const m = code.match(DIRECTIVE);
      if (m) return { code: m[0] + start + code.slice(m[0].length) + end, map: null };
      return { code: start + code + end, map: null };
    },
  };
}
