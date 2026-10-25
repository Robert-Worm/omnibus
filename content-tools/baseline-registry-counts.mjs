// Validate the entire frozen JSON registry without building its large object
// tree. Hash/receipt verification remains the caller's responsibility. This is
// only for baseline counts, not a replacement for other evidence validation.
export function baselineRegistryCounts(bytes) {
  const need = (ok, message) => { if (!ok) throw Error("Baseline registry: " + message); };
  need(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= 64 * 1024 * 1024, "size exceeds bounded intake");
  let input;
  try { input = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw Error("Baseline registry: invalid UTF-8"); }
  let pos = 0, values = 0, reports = 0, lines = 0;
  const space = () => { while (pos < input.length && " \t\r\n".includes(input[pos])) pos++; };
  function token(start, end) {
    const raw = input.slice(start, end);
    need(Buffer.byteLength(raw) <= 8 * 1024 * 1024, "individual token exceeds 8 MiB");
    try { return JSON.parse(raw); }
    catch { throw Error("Baseline registry: invalid JSON token"); }
  }
  function string() {
    need(input[pos] === '"', "expected object key");
    const start = pos++;
    while (pos < input.length) {
      const char = input[pos++];
      if (char === '"') return token(start, pos);
      if (char === "\\") pos++;
    }
    throw Error("Baseline registry: unterminated string");
  }
  function value(kind = "other", depth = 0) {
    need(depth <= 128 && ++values <= 2_000_000, "complexity limit exceeded");
    space(); const char = input[pos];
    if (["root", "report", "framework"].includes(kind)) need(char === "{", "expected " + kind + " object");
    if (["corpus", "lines"].includes(kind)) need(char === "[", "expected " + kind + " array");
    if (char === "{") {
      pos++; space(); const keys = new Set();
      if (input[pos] !== "}") for (;;) {
        space(); const key = string();
        need(!keys.has(key), "duplicate object key"); keys.add(key); space();
        need(input[pos++] === ":", "expected colon");
        const child = kind === "root" && key === "corpus" ? "corpus" :
          kind === "report" && key === "framework" ? "framework" :
          kind === "framework" && key === "lines" ? "lines" : "other";
        value(child, depth + 1); space();
        if (input[pos] === "}") break;
        need(input[pos++] === ",", "expected object separator");
      }
      pos++;
      const required = { root: "corpus", report: "framework", framework: "lines" }[kind];
      if (required) need(keys.has(required), "missing " + required);
    } else if (char === "[") {
      pos++; space();
      if (input[pos] !== "]") for (;;) {
        value(kind === "corpus" ? "report" : "other", depth + 1);
        if (kind === "corpus") reports++;
        if (kind === "lines") lines++;
        space(); if (input[pos] === "]") break;
        need(input[pos++] === ",", "expected array separator");
      }
      pos++;
    } else if (char === '"') string();
    else {
      const start = pos;
      while (pos < input.length && !" \t\r\n,]}".includes(input[pos])) pos++;
      token(start, pos);
    }
  }
  value("root"); space(); need(pos === input.length, "trailing content");
  return { reports, lines };
}
