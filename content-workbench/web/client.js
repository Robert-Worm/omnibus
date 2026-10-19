const $ = (id) => document.getElementById(id);
const number = (n) => new Intl.NumberFormat("nl-NL").format(n);
const el = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
let overview,
  mode = "table",
  stage = "",
  offset = 0,
  sequence = 0,
  current,
  detailSequence = 0,
  saving = false;
const notice = (message) => {
  $("notice").textContent = message;
};
async function api(path, options) {
  const response = await fetch(path, { cache: "no-store", ...options });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || "Ophalen mislukt.");
  return data;
}
function options(id, items) {
  for (const [value, label] of Object.entries(items)) {
    const o = el("option", label);
    o.value = value;
    $(id).append(o);
  }
}
const filters = () => ({
  q: $("q").value,
  collection: $("collection").value,
  priority: $("priority").value,
  disposition: $("disposition").value,
  evidence: $("evidence-filter").value,
});
const query = (values) => new URLSearchParams(values).toString();
function sourceButton(row) {
  const b = el("button", row.title, "title-button");
  b.type = "button";
  b.addEventListener("click", () => openDetail(row.id));
  return b;
}
function meta(row) {
  return [row.date, row.ministry, row.theme].filter(Boolean).join(" · ");
}
function stateBadge(row) {
  const wrap = el("div");
  wrap.append(el("span", overview.workflowStages[row.workflowStage], "badge"));
  if (row.disposition !== "active")
    wrap.append(el("span", overview.dispositions[row.disposition], "warning"));
  for (const evidence of visibleEvidence(row))
    wrap.append(el("span", evidenceLabel(evidence), "evidence-badge"));
  return wrap;
}
function evidenceLabel(evidence) {
  if (evidence.type === "review")
    return evidence.bothApproved
      ? "Reviewbinding: twee APPROVE"
      : "Reviewbinding: controleer besluiten";
  return overview.evidenceKinds[evidence.type];
}
function visibleEvidence(row) {
  return (row.evidence || []).filter(
    (e) =>
      e.type !== "candidate" ||
      !(row.evidence || []).some(
        (a) =>
          a.type === "active" &&
          a.package.id === e.package.id &&
          a.package.version === e.package.version,
      ),
  );
}
function renderTable(data) {
  if (!data.rows.length) {
    $("results").append(el("p", "Geen bronnen binnen deze selectie.", "empty"));
    return;
  }
  const table = el("table"),
    head = el("thead"),
    headers = el("tr");
  for (const text of ["Bron", "Verwerkingsstap", "Prioriteit"]) {
    const th = el("th", text);
    th.scope = "col";
    headers.append(th);
  }
  head.append(headers);
  table.append(head);
  const body = el("tbody");
  for (const row of data.rows) {
    const tr = el("tr"),
      title = el("td");
    title.append(sourceButton(row), el("span", meta(row), "meta"));
    if (row.shared_url_count > 1)
      title.append(el("span", "Gedeelde bron-URL · controleer mogelijke overlap", "warning"));
    const state = el("td");
    state.append(stateBadge(row));
    tr.append(title, state, el("td", overview.priorities[row.priority]));
    body.append(tr);
  }
  table.append(body);
  const scroll = el("div", undefined, "table-scroll");
  scroll.append(table);
  $("results").append(scroll);
}
function renderBoard(lanes) {
  const board = el("div", undefined, "board");
  for (const [key, data] of lanes) {
    const lane = el("section", undefined, "lane"),
      title = el("h3", overview.workflowStages[key]);
    const count = el("button", number(data.total), "lane-count");
    count.setAttribute(
      "aria-label",
      `Toon ${data.total} documenten: ${overview.workflowStages[key]}`,
    );
    count.addEventListener("click", () => showList({ step: key }));
    title.append(count);
    lane.append(title);
    for (const row of data.rows) {
      const card = el("article", undefined, "card");
      card.append(
        sourceButton(row),
        el("span", meta(row), "meta"),
        el("span", overview.priorities[row.priority], "meta"),
      );
      if (row.disposition !== "active")
        card.append(el("span", overview.dispositions[row.disposition], "warning"));
      for (const evidence of visibleEvidence(row))
        card.append(el("span", evidenceLabel(evidence), "evidence-badge"));
      lane.append(card);
    }
    if (!data.total) lane.append(el("p", "Geen bronnen in deze stap.", "empty"));
    if (data.total > data.rows.length) {
      const more = el("button", `Bekijk alle ${number(data.total)}`);
      more.addEventListener("click", () => {
        stage = key;
        mode = "table";
        offset = 0;
        void refresh();
      });
      lane.append(more);
    }
    board.append(lane);
  }
  $("results").append(board);
}
async function refresh() {
  const seq = ++sequence;
  try {
    const latest = await api("/api/overview");
    if (seq !== sequence) return;
    overview = latest;
    renderOverview();
    const f = filters();
    const data = await api("/api/sources?" + query({ ...f, stage, offset, limit: 30 }));
    const lanes =
      mode === "board"
        ? await Promise.all(
            Object.keys(overview.workflowStages)
              .filter((k) => !stage || stage === k)
              .map(async (key) => [
                key,
                await api("/api/sources?" + query({ ...f, stage: key, limit: 6 })),
              ]),
          )
        : null;
    if (seq !== sequence) return;
    notice("");
    $("filtered-count").textContent = number(data.total);
    $("results").replaceChildren();
    $("stages").replaceChildren();
    const counts = Object.fromEntries(data.counts.map((r) => [r.stage, r.count]));
    for (const [key, label] of [["", "Alle stappen"], ...Object.entries(overview.workflowStages)]) {
      const count = key ? counts[key] || 0 : data.counts.reduce((n, r) => n + r.count, 0);
      const b = el("button", `${label} (${number(count)})`);
      b.setAttribute("aria-pressed", String(stage === key));
      b.addEventListener("click", () => {
        stage = key;
        offset = 0;
        void refresh();
      });
      $("stages").append(b);
    }
    $("table-tab").setAttribute("aria-pressed", String(mode === "table"));
    $("board-tab").setAttribute("aria-pressed", String(mode === "board"));
    if (lanes) renderBoard(lanes);
    else renderTable(data);
    $("pagination").hidden = mode !== "table";
    $("prev").disabled = offset === 0;
    $("next").disabled = offset + data.rows.length >= data.total;
    $("page-label").textContent = data.total
      ? `${number(offset + 1)}–${number(offset + data.rows.length)} van ${number(data.total)}`
      : "0 resultaten";
    $("updated").textContent =
      "Bijgewerkt " +
      new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  } catch (error) {
    if (seq === sequence) notice(error.message);
  }
}
function renderDetail(data) {
  current = data;
  $("detail-title").textContent = data.title;
  $("detail-meta").textContent = meta(data);
  $("source-link").href = data.url;
  $("source-summary").textContent =
    data.origins[0]?.raw.samenvatting || "Geen samenvatting in deze export.";
  $("related").textContent = data.related.length
    ? `${data.related.length} andere bronrecords delen deze URL. Ze zijn niet automatisch samengevoegd.`
    : "";
  $("source-evidence").replaceChildren();
  for (const evidence of data.evidence || []) {
    const block = el("div", undefined, "evidence-item");
    block.append(
      el("strong", evidenceLabel(evidence)),
      el(
        "span",
        evidence.label + " · gecontroleerd " + new Date(evidence.checkedAt).toLocaleString("nl-NL"),
        "meta",
      ),
      el("p", evidence.package.id + " · " + evidence.reason),
      el("span", "Pakketversie: " + evidence.package.version, "hash"),
    );
    if (evidence.publication)
      block.append(el("span", "Publicatie: " + evidence.publication, "hash"));
    if (evidence.manifestSha256)
      block.append(el("span", "Intakemanifest: " + evidence.manifestSha256, "hash"));
    if (evidence.receiptSha256)
      block.append(el("span", "Historisch ontvangstbewijs: " + evidence.receiptSha256, "hash"));
    for (const review of evidence.reviews || [])
      block.append(
        el(
          "p",
          `${review.kind}: ${review.decision} · ${review.reviewer} · menselijke validatie: ${review.humanValidation ? "gemeld" : "nee"}`,
        ),
      );
    if (evidence.type === "review")
      block.append(
        el(
          "p",
          evidence.evidenceScope === "historical-review"
            ? "Historische review en de vastgelegde reviewbasis gecontroleerd; geen volledige intake of goedkeuring van latere tekstwijzigingen."
            : "Bestanden en reviewbinding gecontroleerd; geen nieuwe inhoudelijke beoordeling of vrijgave. Deze review geldt alleen voor dit intakemanifest.",
          "muted",
        ),
      );
    $("source-evidence").append(block);
  }
  for (const warning of data.evidenceWarnings || [])
    $("source-evidence").append(el("p", warning.message, "warning"));
  if (!data.evidence?.length)
    $("source-evidence").append(
      el(
        "p",
        "Nog geen bewijs gekoppeld. Dit betekent niet dat de bron nooit is verwerkt.",
        "muted",
      ),
    );
  $("edit-stage").value = data.stage;
  $("edit-disposition").value = data.disposition;
  $("edit-priority").value = data.priority;
  $("note").value = "";
  $("reference").value = data.history[0]?.reference || "";
  $("save-message").textContent = "";
  $("history").replaceChildren();
  for (const event of data.history) {
    const li = el("li");
    li.append(
      el("strong", overview.stages[event.stage] + " · " + overview.dispositions[event.disposition]),
      el(
        "span",
        new Date(event.created_at).toLocaleString("nl-NL") +
          " · " +
          overview.priorities[event.priority],
        "meta",
      ),
      el("p", event.note),
    );
    if (event.reference) li.append(el("p", event.reference, "muted"));
    $("history").append(li);
  }
  if (!data.history.length)
    $("history").append(
      el("li", "Nog geen verwerking vastgelegd. Een import is geen extractie of review."),
    );
  $("origins").replaceChildren();
  for (const origin of data.origins) {
    const block = el("section");
    block.append(
      el("h3", origin.label + " · gegevensrij " + origin.row_number),
      el("p", origin.path, "muted"),
      el("span", "SHA-256: " + origin.sha256, "hash"),
    );
    const dl = el("dl");
    for (const [k, v] of Object.entries(origin.raw)) {
      dl.append(el("dt", k), el("dd", v || "—"));
    }
    block.append(dl);
    $("origins").append(block);
  }
}
async function openDetail(id) {
  const seq = ++detailSequence;
  try {
    const data = await api("/api/sources/" + id);
    if (seq !== detailSequence) return;
    renderDetail(data);
    if (!$("detail").open) $("detail").showModal();
  } catch (error) {
    notice(error.message);
  }
}
$("close").addEventListener("click", () => {
  $("detail").close();
  detailSequence++;
});
$("progress").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!current || saving) return;
  saving = true;
  $("save").disabled = true;
  try {
    const data = await api(`/api/sources/${current.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Workbench-Token": overview.token },
      body: JSON.stringify({
        revision: current.revision,
        stage: $("edit-stage").value,
        disposition: $("edit-disposition").value,
        priority: $("edit-priority").value,
        note: $("note").value,
        reference: $("reference").value,
      }),
    });
    renderDetail(data);
    $("save-message").textContent = "Voortgang bewaard in de lokale Workbench.";
    await refresh();
  } catch (error) {
    $("save-message").textContent = error.message;
  } finally {
    saving = false;
    $("save").disabled = false;
  }
});
$("filters").addEventListener("submit", (e) => e.preventDefault());
let timer;
$("q").addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    offset = 0;
    void refresh();
  }, 200);
});
for (const id of ["collection", "priority", "disposition", "evidence-filter"])
  $(id).addEventListener("change", () => {
    offset = 0;
    void refresh();
  });
$("table-tab").addEventListener("click", () => {
  mode = "table";
  offset = 0;
  void refresh();
});
$("board-tab").addEventListener("click", () => {
  mode = "board";
  offset = 0;
  void refresh();
});
$("prev").addEventListener("click", () => {
  offset = Math.max(0, offset - 30);
  void refresh();
});
$("next").addEventListener("click", () => {
  offset += 30;
  void refresh();
});
$("refresh").addEventListener("click", () => refresh());
function showList({ evidence, step, reset = false } = {}) {
  clearTimeout(timer);
  if (reset) {
    for (const id of ["q", "collection", "priority", "disposition", "evidence-filter"])
      $(id).value = "";
    stage = "";
  }
  if (evidence !== undefined) $("evidence-filter").value = evidence;
  if (step !== undefined) stage = step;
  mode = "table";
  offset = 0;
  void refresh();
  $("table-tab").focus();
}
$("source-count").addEventListener("click", () => showList({ reset: true }));
$("filtered-count").addEventListener("click", () => showList());
$("publication-count").addEventListener("click", () =>
  showList({ reset: true, evidence: "active" }),
);
$("close-inventory").addEventListener("click", () => $("catalogue-inventory").close());
function renderOverview() {
  $("source-count").textContent = number(overview.sources);
  const evidence = overview.evidence;
  $("publication-count").textContent = overview.publicationLinked
    ? `${number(evidence.counts.active || 0)} gekoppelde bronrecords`
    : "Niet bevestigd";
  $("evidence-time").textContent = evidence
    ? "Gecontroleerd " + new Date(evidence.checkedAt).toLocaleString("nl-NL")
    : "Nog geen bewijscontrole uitgevoerd.";
  $("publication-count").disabled = !overview.publicationLinked;
  $("evidence-counts").replaceChildren();
  for (const key of ["intake", "review", "candidate"]) {
    const count = evidence?.counts[key] || 0;
    if (!count) continue;
    const button = el("button", `${overview.evidenceKinds[key]} (${number(count)})`);
    button.addEventListener("click", () => showList({ reset: true, evidence: key }));
    $("evidence-counts").append(button);
  }
  const packages =
    evidence?.results.find((r) => r.type === "active" && r.status === "verified")?.otherPackages ||
    [];
  for (const { label, kinds } of [
    { label: "Wetten en kaders", kinds: ["law", "foundation"] },
    { label: "Modellen", kinds: ["model"] },
  ]) {
    const items = packages.filter((p) => kinds.includes(p.kind));
    if (!items.length) continue;
    const button = el("button", `${label} in publicatie (${number(items.length)})`);
    button.addEventListener("click", () => {
      $("inventory-title").textContent = `${label} (${number(items.length)})`;
      $("inventory-list").replaceChildren();
      for (const item of items) {
        const li = el("li", undefined, "evidence-item");
        const details = el("details");
        details.append(
          el("summary", "Publicatiebinding"),
          el("span", "Pakketversie: " + item.version, "hash"),
        );
        li.append(el("strong", item.title), el("span", item.id, "meta"), details);
        $("inventory-list").append(li);
      }
      $("catalogue-inventory").showModal();
    });
    $("evidence-counts").append(button);
  }
  $("evidence-overview").replaceChildren();
  if (!evidence) $("evidence-overview").append(el("p", "Nog geen bewijscontrole uitgevoerd."));
  for (const result of evidence?.results || []) {
    const row = el("div", undefined, "evidence-item");
    row.append(el("strong", result.label + " · " + overview.evidenceKinds[result.type]));
    if (result.status === "failed") row.append(el("p", result.message, "warning"));
    else
      row.append(
        el(
          "p",
          result.reportCount !== undefined
            ? `${number(result.matched)} van ${number(result.reportCount)} rapporten gekoppeld.`
            : "Bewijsbinding gecontroleerd; geen nieuwe inhoudelijke vrijgave.",
        ),
      );
    if (result.unmatched?.length) {
      const list = el("ul");
      for (const item of result.unmatched)
        list.append(el("li", item.id + " · " + item.title + " — " + item.reason));
      row.append(list);
    }
    $("evidence-overview").append(row);
  }
  const selected = $("collection").value;
  $("collection").replaceChildren();
  const all = el("option", "Alle collecties");
  all.value = "";
  $("collection").append(all);
  for (const c of overview.collections) {
    const option = el("option", c.label);
    option.value = c.label;
    $("collection").append(option);
  }
  $("collection").value = selected;
  $("imports").replaceChildren();
  for (const item of overview.imports) {
    const row = el("div", undefined, "import-row");
    row.append(
      el("strong", item.label),
      el(
        "span",
        `${number(item.rows)} oorspronkelijke rijen · ${new Date(item.created_at).toLocaleString("nl-NL")}`,
        "meta",
      ),
      el("span", "SHA-256: " + item.sha256, "hash"),
    );
    $("imports").append(row);
  }
}
async function start() {
  try {
    overview = await api("/api/overview");
    renderOverview();
    options("priority", overview.priorities);
    options("disposition", overview.dispositions);
    options("evidence-filter", overview.evidenceKinds);
    options("edit-stage", overview.stages);
    options("edit-disposition", overview.dispositions);
    options("edit-priority", overview.priorities);
    const subset = overview.collections.find((c) => /non.assurance/i.test(c.label));
    if (subset) $("collection").value = subset.label;
    await refresh();
    setInterval(() => {
      if (!document.hidden && !$("detail").open && !$("catalogue-inventory").open) void refresh();
    }, 30000);
  } catch (error) {
    notice(error.message);
  }
}
void start();
