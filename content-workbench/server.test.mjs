import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";
import { startWorkbench } from "./server.mjs";
import { WorkbenchStore } from "./store.mjs";
async function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "omnibus-workbench-http-")),
    database = join(dir, "queue.sqlite");
  const store = new WorkbenchStore(database);
  store.importCsv(
    Buffer.from('titel;url\n"<script>alert(1)</script>";https://example.invalid/report'),
    { path: "private.csv", label: "Test" },
  );
  store.close();
  const { server, origin } = await startWorkbench({ database, port: 0 });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((ok) => server.close(ok));
    rmSync(dir, { recursive: true, force: true });
  });
  return {
    origin,
    get: (path, headers = {}) => fetch(origin + path, { headers }),
    post: (path, body, headers = {}) =>
      fetch(origin + path, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      }),
  };
}
test("local workbench serves only known assets; rejects hostile origins, hosts and file paths", async (t) => {
  const f = await fixture(t);
  const home = await f.get("/");
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(home.headers.get("cache-control"), "no-store");
  for (const path of ["/private.csv", "/../store.mjs", "/api/unknown", "/style.css?secret=x"])
    assert.equal((await f.get(path)).status, 404);
  const foreignHost = await new Promise((ok, fail) => {
    const req = request(
      f.origin + "/api/overview",
      { headers: { Host: "attacker.invalid" } },
      (res) => {
        res.resume();
        ok(res.statusCode);
      },
    );
    req.on("error", fail);
    req.end();
  });
  assert.equal(foreignHost, 400);
  assert.equal((await f.get("/api/overview", { Origin: "https://attacker.invalid" })).status, 403);
  assert.equal((await f.get("/api/overview", { "Sec-Fetch-Site": "cross-site" })).status, 403);
  const js = await (await f.get("/client.js")).text();
  assert(!js.includes("innerHTML"));
  assert(!js.includes("localStorage"));
});
test("updates require local origin and process token, reject stale revisions and publish attempts", async (t) => {
  const f = await fixture(t);
  const { token } = await (await f.get("/api/overview")).json();
  const { rows } = await (await f.get("/api/sources")).json();
  const id = rows[0].id;
  const change = {
    revision: 0,
    stage: "queued",
    disposition: "active",
    priority: "normal",
    note: "Test progress",
    reference: "",
  };
  const path = `/api/sources/${id}/progress`;
  assert.equal((await f.post(path, change)).status, 403);
  assert.equal(
    (await f.post("/api/evidence", { approved: true }, { "X-Workbench-Token": token })).status,
    404,
  );
  assert.equal(
    (await f.post(path, { ...change, evidence: "active" }, { "X-Workbench-Token": token })).status,
    400,
  );
  assert.equal(
    (await f.post(path, change, { "X-Workbench-Token": token, Origin: "https://attacker.invalid" }))
      .status,
    403,
  );
  assert.equal(
    (await f.post(path, { ...change, stage: "published" }, { "X-Workbench-Token": token })).status,
    400,
  );
  assert.equal((await f.post(path, change, { "X-Workbench-Token": token })).status, 200);
  assert.equal((await f.post(path, change, { "X-Workbench-Token": token })).status, 409);
  const detail = await (await f.get(`/api/sources/${id}`)).json();
  assert.equal(detail.history.length, 1);
  assert.equal(detail.title, "<script>alert(1)</script>");
  assert.equal((await f.get("/api/sources?limit=5000")).status, 400);
  assert.equal((await f.get("/api/sources?q=a&q=b")).status, 400);
  assert.equal(
    (await f.post(path, { ...change, note: "x".repeat(13000) }, { "X-Workbench-Token": token }))
      .status,
    413,
  );
});
