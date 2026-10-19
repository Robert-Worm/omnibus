import test from "node:test";
import assert from "node:assert/strict";
import { runtimeFixture } from "../local-data/test-support/runtime-fixture.mjs";
import { CatalogueRepository } from "../local-data/repository.mjs";
import { readRuntimePublication, publishRuntime } from "../local-data/runtime-publication.mjs";
import { webResource } from "../local-data/web-resources.mjs";
import { runtimeContractHash } from "../lib/runtime-contract-identity.mjs";
import { prepareDeferredWwkeImpact, prepareDeferredReportGoals } from "./runtime-delivery.mjs";
import {
  applyCatalogueEdits,
  registerCatalogueResource,
  ensureCatalogue,
  catalogueReady,
  onCatalogueChange,
} from "../lib/catalogue-runtime.mjs";

const impactId = "lib/wwke-reviewed/impact.json";
function fixture(t, suffix = "test") {
  const options = runtimeFixture(t);
  const repository = new CatalogueRepository(options.databasePath);
  options.beforeCleanup.push(() => repository.close());
  const publication = readRuntimePublication(repository, {
    ...options,
    contract: runtimeContractHash,
  });
  const key = `foundation:WWKE-${suffix}:catalogue:0`;
  publication.refs[key] = publication.refs.test;
  publication.registrations["lib/wwke-content.mjs"] = [key];
  publication.modules[impactId] = {
    edition: "Synthetic only",
    issues: [
      {
        id: "issue-1",
        usage_assessments: [{ point_id: "point-1", text: "Eén 🧪", status: "HOLD" }],
      },
      { id: "issue-2", usage_assessments: [{ point_id: "point-2", text: "Second assessment" }] },
    ],
    receipt: { source: "unchanged" },
  };
  return { options, repository, publication };
}

test("delivery projection preserves every field, order and release without mutating its input", (t) => {
  const { options, repository, publication } = fixture(t);
  const before = JSON.stringify(publication);
  const releaseBefore = JSON.stringify(repository.exportRelease(options.release));
  const projected = prepareDeferredWwkeImpact(repository, publication);
  assert.equal(JSON.stringify(publication), before);
  assert.equal(projected.release, publication.release);
  assert.equal(projected.contract, publication.contract);
  assert.equal(projected.routing, publication.routing);
  assert.equal(projected.summary, publication.summary);
  assert.deepEqual(projected.modules[impactId].issues, []);
  for (const [id, value] of Object.entries(publication.modules))
    if (id !== impactId) assert.equal(projected.modules[id], value);
  for (const [key, ref] of Object.entries(publication.refs)) assert.equal(projected.refs[key], ref);
  const restored = structuredClone(projected.modules[impactId]);
  for (const key of projected.registrations[impactId])
    applyCatalogueEdits(
      restored,
      webResource(repository, options.release, projected.refs[key].hash),
    );
  assert.equal(JSON.stringify(restored), JSON.stringify(publication.modules[impactId]));
  const id = publishRuntime(repository, projected, {
    release: options.release,
    contract: runtimeContractHash,
  });
  assert.deepEqual(
    readRuntimePublication(repository, {
      release: options.release,
      publication: id,
      contract: runtimeContractHash,
    }),
    projected,
  );
  assert.equal(JSON.stringify(repository.exportRelease(options.release)), releaseBefore);
  assert(
    readRuntimePublication(repository, { ...options, contract: runtimeContractHash }),
    "Original publication remains readable",
  );
});

test("bounded chunks preserve array identity and order after on-demand loading; retry is possible", async (t) => {
  const { repository, publication } = fixture(t, "retry");
  publication.modules[impactId].issues = Array.from({ length: 3 }, (_, i) => ({
    id: `issue-${i}`,
    text: "é".repeat(240_000),
    usage_assessments: [{ point_id: `p-${i}` }],
  }));
  const projected = prepareDeferredWwkeImpact(repository, publication);
  const data = projected.modules[impactId],
    array = data.issues;
  const keys = projected.registrations[impactId];
  assert.equal(keys.length, 3);
  let fail = true,
    calls = 0,
    refreshes = 0;
  const off = onCatalogueChange(() => {
    refreshes++;
    assert.equal(data.issues.length, 3);
  });
  t.after(off);
  for (const [index, key] of keys.entries()) {
    const ref = projected.refs[key];
    assert(ref.bytes <= 900_000);
    registerCatalogueResource(
      key,
      async () => {
        calls++;
        if (index === 1 && fail) throw Error("Synthetic transport failure");
        return webResource(repository, publication.release, ref.hash);
      },
      (edits) => applyCatalogueEdits(data, edits),
    );
  }
  assert.equal(catalogueReady(["foundation:WWKE-retry"]), false);
  assert.equal(calls, 0);
  await assert.rejects(ensureCatalogue(["foundation:WWKE-retry"]), /transport failure/);
  assert.deepEqual(data.issues, []);
  assert.equal(refreshes, 0);
  fail = false;
  await ensureCatalogue(["foundation:WWKE-retry"]);
  assert.equal(catalogueReady(["foundation:WWKE-retry"]), true);
  assert.equal(data.issues, array);
  assert.equal(JSON.stringify(data), JSON.stringify(publication.modules[impactId]));
  const count = calls;
  await ensureCatalogue(["foundation:WWKE-retry"]);
  assert.equal(calls, count);
  assert.equal(refreshes, 1);
});

test("ambiguous boundaries, existing projections, oversized issues and collisions fail before writes", (t) => {
  const { repository, publication } = fixture(t);
  const count = () => repository.db.prepare("SELECT COUNT(*) AS n FROM web_resources").get().n;
  const before = count();
  for (const change of [
    (value) => {
      value.modules[impactId].issues = {};
    },
    (value) => {
      value.registrations["lib/wwke-content.mjs"] = [];
    },
    (value) => {
      value.registrations["lib/wwke-content.mjs"].push("foundation:OTHER:catalogue:0");
    },
    (value) => {
      value.registrations[impactId] = ["already-projected"];
    },
    (value) => {
      value.refs["foundation:WWKE-test:wwke-impact:0"] = value.refs.test;
    },
    (value) => {
      value.modules[impactId].issues.push({ text: "x".repeat(900_000) });
    },
  ]) {
    const input = structuredClone(publication);
    change(input);
    const original = JSON.stringify(input);
    assert.throws(() => prepareDeferredWwkeImpact(repository, input), /WWKE/);
    assert.equal(count(), before);
    assert.equal(JSON.stringify(input), original);
  }
  publication.modules[impactId].issues = [];
  assert.equal(prepareDeferredWwkeImpact(repository, publication), publication);
  assert.equal(count(), before);
});

const goalIds = ["app/organizational-goals.json", "app/report-objectives.json"];
function goalFixture(t) {
  const fixtureData = fixture(t);
  const { publication } = fixtureData;
  publication.routing.reports = { L1: "GOAL-P", L2: "GOAL-Q", L3: "GOAL-P" };
  for (const reportId of ["GOAL-P", "GOAL-Q"])
    publication.refs[`report:${reportId}:catalogue:0`] = publication.refs.test;
  publication.registrations["app/reviewed-reports.json"] = [
    "report:GOAL-P:catalogue:0",
    "report:GOAL-Q:catalogue:0",
  ];
  for (const id of goalIds)
    publication.modules[id] = {
      L1: { text: "First goal 🧪", evidence_ids: ["e1"] },
      L2: { text: "Other report goal", evidence_ids: ["e2"] },
      L3: { text: "Same report, later key", evidence_ids: ["e3"], reason: "Synthetic" },
    };
  return fixtureData;
}

test("report goals load only with their owner, preserving values and lookup order across reports", async (t) => {
  const { repository, publication } = goalFixture(t);
  const before = JSON.stringify(publication);
  const projected = prepareDeferredReportGoals(repository, publication);
  assert.equal(JSON.stringify(publication), before);
  const calls = [];
  for (const id of goalIds) {
    assert.deepEqual(projected.modules[id], { L1: null, L2: null, L3: null });
    for (const key of projected.registrations[id])
      registerCatalogueResource(
        key,
        async () => {
          calls.push(key);
          return webResource(repository, publication.release, projected.refs[key].hash);
        },
        (edits) => applyCatalogueEdits(projected.modules[id], edits),
      );
  }
  assert.deepEqual(calls, []);
  await ensureCatalogue(["report:GOAL-Q"]);
  assert.equal(calls.length, 2);
  for (const id of goalIds) {
    assert.equal(projected.modules[id].L1, null);
    assert.equal(projected.modules[id].L3, null);
    assert.deepEqual(projected.modules[id].L2, publication.modules[id].L2);
  }
  await ensureCatalogue(["report:GOAL-P"]);
  assert.equal(calls.length, 4);
  for (const id of goalIds)
    assert.equal(JSON.stringify(projected.modules[id]), JSON.stringify(publication.modules[id]));
  await ensureCatalogue(["report:GOAL-P", "report:GOAL-Q"]);
  assert.equal(calls.length, 4);
  for (const [id, module] of Object.entries(publication.modules))
    if (!goalIds.includes(id)) assert.equal(projected.modules[id], module);
});

test("report goal planning rejects unmapped, unsafe, changed and oversized input before database writes", (t) => {
  const { repository, publication } = goalFixture(t);
  const count = () => repository.db.prepare("SELECT COUNT(*) AS n FROM web_resources").get().n;
  const before = count();
  for (const change of [
    (value) => {
      delete value.routing.reports.L1;
    },
    (value) => {
      value.routing.reports.L1 = "UNKNOWN";
    },
    (value) => {
      value.registrations["app/reviewed-reports.json"] = [];
    },
    (value) => {
      value.routing.reports.L1 = "bad:id";
    },
    (value) => {
      value.modules[goalIds[1]].L3 = null;
    },
    (value) => {
      value.modules[goalIds[1]].L3.text = "x".repeat(900_000);
    },
    (value) => {
      value.modules[goalIds[1]] = JSON.parse('{"__proto__":{"text":"bad"}}');
    },
    (value) => {
      value.registrations[goalIds[1]] = ["existing"];
    },
    (value) => {
      value.refs["report:GOAL-P:app/organizational-goals.json:goals:0"] = value.refs.test;
    },
  ]) {
    const input = structuredClone(publication);
    change(input);
    const original = JSON.stringify(input);
    assert.throws(() => prepareDeferredReportGoals(repository, input), /Report goal/);
    assert.equal(count(), before);
    assert.equal(JSON.stringify(input), original);
  }
});

test("large per-report goal sets use bounded chunks and restore exact order", (t) => {
  const { repository, publication } = goalFixture(t);
  for (const id of goalIds)
    for (const goal of Object.values(publication.modules[id])) goal.text = "é".repeat(240_000);
  const projected = prepareDeferredReportGoals(repository, publication);
  for (const id of goalIds) {
    const keys = projected.registrations[id];
    assert.equal(keys.length, 3);
    const restored = structuredClone(projected.modules[id]);
    for (const key of [...keys].reverse()) {
      assert(projected.refs[key].bytes <= 900_000);
      applyCatalogueEdits(
        restored,
        webResource(repository, publication.release, projected.refs[key].hash),
      );
    }
    assert.equal(JSON.stringify(restored), JSON.stringify(publication.modules[id]));
  }
});
