
/*
 IO INTELLIGENCE
 산업연관 지표 확장 분석 화면
 기존 듀얼 히트맵 유지
*/
(() => {
  "use strict";

  const $ = s => document.querySelector(s);
  const host = $("#io-view-dual");

  if (!host || $("#io-metrics-panel")) return;

  const old = $("#premium-matrix");

  // 화면 디자인
  const style = document.createElement("style");

  style.textContent = `
    #io-metrics-tabbar {
      display:flex;
      gap:8px;
      margin:10px 0 18px;
      flex-wrap:wrap;
    }

    #io-metrics-tabbar button {
      margin:0;
      border:1px solid #d8e3f0;
      background:white;
      color:#536981;
      border-radius:11px;
      padding:12px 18px;
      font-size:13px;
      font-weight:700;
      cursor:pointer;
    }

    #io-metrics-tabbar button[aria-selected="true"] {
      background:#174b87;
      border-color:#174b87;
      color:white;
    }

    #io-metrics-panel {
      color:#193553;
      min-width:0;
    }

    #io-metrics-panel[hidden] {
      display:none!important;
    }

    #io-metrics-panel * {
      box-sizing:border-box;
    }

    #io-metrics-panel .im-card {
      background:#fff;
      border:1px solid #e0e8f3;
      border-radius:17px;
      padding:22px;
      margin-bottom:15px;
      box-shadow:0 8px 30px #1b385d0b;
    }

    #io-metrics-panel .im-top {
      display:flex;
      justify-content:space-between;
      gap:15px;
      align-items:center;
      flex-wrap:wrap;
    }

    #io-metrics-panel .im-eyebrow {
      font-size:10px;
      letter-spacing:1.6px;
      color:#5b7fae;
      font-weight:800;
    }

    #io-metrics-panel h2 {
      margin:7px 0;
      font-size:23px;
      color:#193759;
    }

    #io-metrics-panel h3 {
      font-size:17px;
      color:#204165;
      margin:8px 0;
    }

    #io-metrics-panel p {
      font-size:12px;
      color:#71859e;
      line-height:1.7;
    }

    #io-metrics-panel .im-primary {
      margin:0;
      background:#174b87;
      color:white;
      border:0;
      border-radius:10px;
      padding:12px 17px;
      cursor:pointer;
      font-weight:750;
    }

    #io-metrics-panel .im-primary:disabled {
      opacity:.5;
    }

    #io-metrics-panel .im-status {
      margin-top:12px;
      font-size:12px;
      color:#577392;
    }

    #io-metrics-panel .im-controls {
      display:grid;
      grid-template-columns:1fr 1.4fr 1fr 110px;
      gap:11px;
      margin-bottom:17px;
    }

    #io-metrics-panel .im-controls label {
      display:flex;
      flex-direction:column;
      gap:6px;
      font-size:11px;
      color:#7c8da4;
    }

    #io-metrics-panel select,
    #io-metrics-panel input {
      width:100%;
      margin:0;
      padding:10px;
      border:1px solid #dce5f0;
      border-radius:9px;
      font-size:12px;
      color:#244462;
      background:#fff;
    }

    #io-metrics-panel .im-stats {
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:11px;
      margin-bottom:18px;
    }

    #io-metrics-panel .im-stat {
      padding:14px;
      border:1px solid #e1e9f3;
      background:#f6f9fd;
      border-radius:12px;
    }

    #io-metrics-panel .im-stat small {
      display:block;
      color:#8392a6;
      font-size:11px;
    }

    #io-metrics-panel .im-stat strong {
      display:block;
      margin-top:5px;
      color:#235186;
      font-size:22px;
      font-variant-numeric:tabular-nums;
    }

    #io-metrics-panel .im-scroll {
      overflow:auto;
      max-height:630px;
      border:1px solid #e2eaf3;
      border-radius:10px;
    }

    #io-metrics-panel table {
      min-width:790px;
      width:100%;
      table-layout:fixed;
      border-spacing:2px;
      border-collapse:separate;
    }

    #io-metrics-panel th,
    #io-metrics-panel td {
      height:44px;
      padding:2px;
      border:0;
      text-align:center;
      font-size:11px;
    }

    #io-metrics-panel thead th {
      position:sticky;
      top:0;
      z-index:2;
      background:#ecf2fa;
      color:#4c6684;
    }

    #io-metrics-panel th:first-child {
      width:100px;
      background:#eef3f9;
      color:#4c6684;
    }

    #io-metrics-panel th:last-child,
    #io-metrics-panel td:last-child {
      width:85px;
    }

    #io-metrics-panel .im-cell {
      display:block;
      width:100%;
      height:42px;
      padding:2px;
      margin:0;
      border:0;
      border-radius:4px;
      font-size:11px;
      font-weight:800;
      cursor:pointer;
      color:#172d45;
      font-variant-numeric:tabular-nums;
    }

    #io-metrics-panel .im-cell:hover,
    #io-metrics-panel .im-cell.selected {
      outline:3px solid #1a4b87;
      outline-offset:-2px;
    }

    #io-metrics-panel .im-cell.dimmed {
      opacity:.2;
    }

    #io-metrics-panel .im-average {
      background:#e5edf6;
      color:#315780;
      font-weight:800;
    }

    #io-metrics-panel tfoot th,
    #io-metrics-panel tfoot td {
      position:sticky;
      bottom:0;
      background:#d7e4f3;
      z-index:2;
    }

    #io-metrics-panel .im-selected {
      background:#f4f8fd;
      border-radius:11px;
      padding:17px;
      margin-top:12px;
    }

    #io-metrics-panel .im-company {
      margin-top:12px;
      color:#234e7f;
      font-weight:700;
      font-size:13px;
    }

    #io-metrics-panel .im-export {
      background:#edf4fd;
      border:1px solid #d7e5f5;
      color:#24568d;
      border-radius:9px;
      margin-top:13px;
      padding:9px 13px;
      cursor:pointer;
    }

    @media(max-width:1000px) {
      #io-metrics-panel .im-controls {
        grid-template-columns:repeat(2,1fr);
      }
      #io-metrics-panel .im-stats {
        grid-template-columns:repeat(2,1fr);
      }
    }

    @media(max-width:600px) {
      #io-metrics-panel .im-card {
        padding:13px;
      }
      #io-metrics-panel .im-controls {
        grid-template-columns:1fr;
      }
    }
  `;

  document.head.append(style);

  // 기존 히트맵과 확장 히트맵 전환 버튼
  const tabs = document.createElement("div");
  tabs.id = "io-metrics-tabbar";

  tabs.innerHTML = `
    <button type="button"
      id="im-tab-old"
      aria-selected="true">
      영향력·감응도
    </button>

    <button type="button"
      id="im-tab-new"
      aria-selected="false">
      확장 산업연관 지표 (36)
    </button>
  `;

  host.insertBefore(
    tabs,
    old || host.firstChild
  );

  const panel = document.createElement("section");
  panel.id = "io-metrics-panel";
  panel.hidden = true;

  panel.innerHTML = `
    <div class="im-card">
      <div class="im-top">
        <div>
          <div class="im-eyebrow">
            IO INTELLIGENCE / EXTENDED ANALYTICS
          </div>

          <h2>산업연관 지표 종합 분석</h2>

          <p>
            생산유발·수입유발·부가가치·투입구조·
            파급분포 지표를 분석합니다.
          </p>
        </div>

        <button class="im-primary"
          id="im-run" type="button">
          전체 지표 계산
        </button>
      </div>

      <div id="im-status" class="im-status">
        먼저 Excel 자료를 불러오세요.
      </div>
    </div>

    <div id="im-results" hidden>
      <div class="im-card">

        <div class="im-controls">
          <label>
            지표 분류
            <select id="im-group"></select>
          </label>

          <label>
            분석 지표
            <select id="im-metric"></select>
          </label>

          <label>
            산업 검색
            <input type="search" id="im-search"
              placeholder="산업명 또는 코드">
          </label>

          <label>
            표시 산업
            <select id="im-limit">
              <option value="60">60개</option>
              <option value="100" selected>100개</option>
              <option value="200">200개</option>
              <option value="all">전체</option>
            </select>
          </label>
        </div>

        <div class="im-stats" id="im-stats"></div>

        <h3 id="im-title"></h3>
        <p id="im-description"></p>

        <div class="im-scroll">
          <table id="im-grid"></table>
        </div>

        <p>
          높은 순위부터 산업 10개를 한 행에 배치합니다.
          행·열 평균은 현재 표시된 산업을 기준으로 계산합니다.
          색상은 상대적 크기를 나타내며,
          지표마다 기준값 1을 의미하지는 않습니다.
        </p>

        <button class="im-export"
          id="im-export" type="button">
          현재 지표 CSV 저장
        </button>
      </div>

      <div class="im-card">
        <h3>선택 산업 상세</h3>
        <div id="im-selected">
          히트맵의 산업 셀을 클릭하세요.
        </div>
      </div>
    </div>
  `;

  tabs.insertAdjacentElement(
    "afterend",
    panel
  );

  const el = id =>
    panel.querySelector("#im-" + id);

  const text = (tag, value) => {
    const x = document.createElement(tag);
    x.textContent = value;
    return x;
  };

  const fmt = value =>
    Number(value).toLocaleString("ko-KR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 4
    });

  let data = null;
  let selected = null;
  let generation = 0;
  let loading = false;

  const metricKey = () => el("metric").value;

  function average(rows, key) {
    if (!rows.length) return null;

    return rows.reduce(
      (sum, r) => sum + r.metrics[key],
      0
    ) / rows.length;
  }

  function formatted(value) {
    return value == null ? "—" : fmt(value);
  }

  // 탭 변경
  function showNew(isNew) {
    panel.hidden = !isNew;

    if (old) {
      old.style.display = isNew ? "none" : "";
    }

    tabs.querySelector("#im-tab-old")
      .setAttribute(
        "aria-selected",
        String(!isNew)
      );

    tabs.querySelector("#im-tab-new")
      .setAttribute(
        "aria-selected",
        String(isNew)
      );
  }

  tabs.querySelector("#im-tab-old").onclick =
    () => showNew(false);

  tabs.querySelector("#im-tab-new").onclick =
    () => showNew(true);

  // 분류별 지표 목록
  function populateGroups() {
    const groups = [
      ...new Set(
        data.indicators.map(m => m.group)
      )
    ];

    el("group").replaceChildren(
      ...groups.map(group => {
        const o = text("option", group);
        o.value = group;
        return o;
      })
    );

    populateMetrics();
  }

  function populateMetrics() {
    const group = el("group").value;

    el("metric").replaceChildren(
      ...data.indicators
        .filter(m => m.group === group)
        .map(m => {
          const o = text("option", m.label);
          o.value = m.key;
          return o;
        })
    );

    draw();
  }

  // 기업 및 산업 상세
  function showIndustry(r) {
    if (!r) return;

    selected = r.code;

    const key = metricKey();

    const spec = data.indicators.find(
      m => m.key === key
    );

    const sorted = [...data.rows].sort(
      (a, b) =>
        b.metrics[key] - a.metrics[key]
    );

    const rank =
      sorted.findIndex(x => x.code === r.code) + 1;

    const container = el("selected");
    container.replaceChildren();

    container.append(
      text("h3", `${r.name} (${r.code})`)
    );

    const detail = document.createElement("div");
    detail.className = "im-selected";

    detail.append(
      text(
        "h3",
        `${fmt(r.metrics[key])} · ${spec.unit}`
      ),
      text(
        "p",
        `전체 ${data.count}개 산업 중 ${rank}위`
      ),
      text(
        "p",
        "지표 설명: " + spec.description
      ),
      text(
        "p",
        "계산식: " + spec.formula
      ),
      text(
        "p",
        spec.kind === "derived"
          ? "자체 파생지표"
          : "기본 산업연관계수"
      )
    );

    const company =
      window.IO_COMPANY_LOOKUP?.(
        r.code,
        r.name
      );

    if (company?.names?.length) {
      const c = text(
        "div",
        "예시 기업·기관: " +
        company.names.join(", ")
      );

      c.className = "im-company";
      detail.append(c);

      detail.append(
        text(
          "p",
          company.status ||
            "업종 참고기업·기관"
        )
      );
    }

    container.append(detail);

    panel.querySelectorAll(".im-cell")
      .forEach(button => {
        button.classList.toggle(
          "selected",
          button.dataset.code === r.code
        );
      });
  }

  // 히트맵 렌더링
  function draw() {
    if (!data || !metricKey()) return;

    const key = metricKey();

    const spec = data.indicators.find(
      m => m.key === key
    );

    const all = [...data.rows].sort(
      (a, b) =>
        b.metrics[key] - a.metrics[key]
    );

    const limit =
      el("limit").value === "all"
        ? all.length
        : Number(el("limit").value);

    const shown = all.slice(0, limit);

    const values = shown.map(
      r => r.metrics[key]
    );

    const min = Math.min(...values);
    const max = Math.max(...values);

    el("title").textContent =
      `${spec.label} · 산업별 히트맵`;

    el("description").textContent =
      `${spec.description} | ` +
      `산식: ${spec.formula} | ` +
      `단위: ${spec.unit}`;

    const stats = [
      ["표시 산업", shown.length + "개"],
      ["전체 평균", formatted(average(all, key))],
      ["최댓값", formatted(max)],
      ["최솟값", formatted(min)]
    ];

    el("stats").replaceChildren(
      ...stats.map(([label, value]) => {
        const card = document.createElement("div");
        card.className = "im-stat";

        card.append(
          text("small", label),
          text("strong", value)
        );

        return card;
      })
    );

    const table = el("grid");
    table.replaceChildren();

    // 상단
    const thead = document.createElement("thead");
    const header = document.createElement("tr");

    [
      "전체 순위",
      ...Array.from(
        { length: 10 },
        (_, i) => String(i + 1)
      ),
      "행 평균"
    ].forEach(label => {
      header.append(text("th", label));
    });

    thead.append(header);
    table.append(thead);

    // 본문
    const tbody = document.createElement("tbody");
    const query = el("search").value
      .trim().toLowerCase();

    for (let i = 0; i < shown.length; i += 10) {
      const chunk = shown.slice(i, i + 10);
      const tr = document.createElement("tr");

      tr.append(
        text(
          "th",
          `${i + 1}–${Math.min(
            i + 10,
            shown.length
          )}위`
        )
      );

      for (let j = 0; j < 10; j++) {
        const td = document.createElement("td");
        const r = chunk[j];

        if (r) {
          const button =
            document.createElement("button");

          button.type = "button";
          button.className = "im-cell";
          button.dataset.code = r.code;

          const value = r.metrics[key];

          const normalized =
            max > min
              ? (value - min) / (max - min)
              : 0.5;

          const hue = 8 + normalized * 135;

          button.style.background =
            `hsl(${hue} 55% ` +
            `${84 - normalized * 37}%)`;

          button.textContent = fmt(value);

          button.title =
            `${r.name} (${r.code})\n` +
            `${spec.label}: ${fmt(value)}`;

          if (
            query &&
            !(r.name + " " + r.code)
              .toLowerCase()
              .includes(query)
          ) {
            button.classList.add("dimmed");
          }

          if (selected === r.code) {
            button.classList.add("selected");
          }

          button.onclick = () =>
            showIndustry(r);

          td.append(button);
        }

        tr.append(td);
      }

      const rowAvg = text(
        "td",
        formatted(average(chunk, key))
      );

      rowAvg.className = "im-average";
      tr.append(rowAvg);

      tbody.append(tr);
    }

    table.append(tbody);

    // 하단 열 평균
    const footer = document.createElement("tfoot");
    const footerRow = document.createElement("tr");

    footerRow.append(
      text("th", "열 평균")
    );

    for (let j = 0; j < 10; j++) {
      const column = shown.filter(
        (_, index) => index % 10 === j
      );

      const cell = text(
        "td",
        formatted(average(column, key))
      );

      cell.className = "im-average";
      footerRow.append(cell);
    }

    const overall = text(
      "td",
      formatted(average(shown, key))
    );

    overall.className = "im-average";
    footerRow.append(overall);

    footer.append(footerRow);
    table.append(footer);

    const chosen =
      data.rows.find(r => r.code === selected) ||
      shown[0];

    showIndustry(chosen);
  }

  // 지표 계산 버튼
  el("run").onclick = async () => {
    if (loading) return;

    loading = true;
    el("run").disabled = true;

    const version = generation;
    el("status").textContent =
      "전체 지표를 계산하고 있습니다.";

    try {
      if ($("#sheet")?.disabled) {
        throw Error(
          "먼저 산업분류 Excel을 불러오세요."
        );
      }

      if (typeof call !== "function") {
        throw Error(
          "기존 계수 계산 함수에 연결되지 않았습니다."
        );
      }

      const result = await call("metrics", {});

      if (version !== generation) {
        throw Error(
          "분석 중 산업분류가 변경되었습니다."
        );
      }

      if (
        !result?.rows?.length ||
        !result?.indicators?.length
      ) {
        throw Error("지표 결과가 없습니다.");
      }

      data = result;
      selected = null;

      populateGroups();
      el("results").hidden = false;

      el("status").textContent =
        `${result.count}개 산업 × ` +
        `${result.indicators.length}개 지표 계산 완료`;

    } catch (error) {
      el("status").textContent =
        "계산 실패: " + error.message;
    } finally {
      loading = false;
      el("run").disabled = false;
    }
  };

  // 각 컨트롤
  el("group").onchange = populateMetrics;
  el("metric").onchange = draw;
  el("limit").onchange = draw;
  el("search").oninput = draw;

  // CSV 다운로드
  el("export").onclick = () => {
    if (!data) return;

    const key = metricKey();

    const meta = data.indicators.find(
      m => m.key === key
    );

    const csvEscape = value =>
      '"' + String(value ?? "")
        .replaceAll('"', '""') + '"';

    const rows = [
      [
        "산업코드",
        "산업명",
        meta.label + " (" + meta.unit + ")"
      ],
      ...data.rows.map(r => [
        r.code,
        r.name,
        r.metrics[key]
      ])
    ];

    const csv = "\ufeff" +
      rows.map(
        row => row.map(csvEscape).join(",")
      ).join("\r\n");

    const url = URL.createObjectURL(
      new Blob([csv], {
        type: "text/csv;charset=utf-8"
      })
    );

    const a = document.createElement("a");
    a.href = url;
    a.download = "io-2023-" + key + ".csv";
    a.click();

    setTimeout(
      () => URL.revokeObjectURL(url),
      1000
    );
  };

  // 새로운 분류를 불러올 때 데이터 초기화
  function reset() {
    generation++;
    data = null;
    selected = null;

    el("results").hidden = true;

    el("status").textContent =
      "새 산업분류를 불러온 뒤 지표 계산을 실행하세요.";
  }

  $("#load-basic")?.addEventListener(
    "click", reset, true
  );

  $("#io-classification")?.addEventListener(
    "change", reset
  );
})();
