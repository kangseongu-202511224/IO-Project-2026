
/*
 IO INTELLIGENCE
 36개 산업연관 지표 공통 분석 모듈
 기존 분석 기능 보존
*/
(() => {
  "use strict";

  const $ = s => document.querySelector(s);

  const views = [
    "home", "explorer", "quadrant",
    "treemap", "compare", "ranking",
    "types", "simulation", "detail", "legacy"
  ];

  const panels = new Map();
  const state = new Map();

  let data = null;
  let pending = null;
  let epoch = 0;

  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = String(txt);
    return e;
  };

  const fmt = n =>
    Number.isFinite(n)
      ? n.toLocaleString("ko-KR", {
          maximumFractionDigits: 4
        })
      : "—";

  const val = (r, k) => Number(r.metrics[k]);

  const mean = (rows, k) =>
    rows.reduce((s, r) => s + val(r, k), 0) /
    Math.max(rows.length, 1);

  const spec = key =>
    data.indicators.find(x => x.key === key);

  const sorted = (key, asc = false) =>
    [...data.rows].sort((a, b) =>
      asc
        ? val(a, key) - val(b, key)
        : val(b, key) - val(a, key)
    );

  const create = (parent, tag, cls, txt) => {
    const e = el(tag, cls, txt);
    parent.append(e);
    return e;
  };

  const svgEl = (tag, attrs = {}) => {
    const e = document.createElementNS(
      "http://www.w3.org/2000/svg", tag
    );

    Object.entries(attrs).forEach(([k, v]) =>
      e.setAttribute(k, String(v))
    );

    return e;
  };

  const st = id => state.get(id);
  const box = id => panels.get(id);

  function choices(select, current) {
    select.replaceChildren();

    const groups = [
      ...new Set(data.indicators.map(x => x.group))
    ];

    groups.forEach(g => {
      const group = el("optgroup");
      group.label = g;

      data.indicators
        .filter(x => x.group === g)
        .forEach(x => {
          const option = el("option", null, x.label);
          option.value = x.key;
          group.append(option);
        });

      select.append(group);
    });

    if (
      current &&
      data.indicators.some(x => x.key === current)
    ) {
      select.value = current;
    }
  }

  const selectOf = (id, which) =>
    box(id).querySelector(
      '[data-role="' + which + '"]'
    );

  function header(id) {
    const root = box(id);
    const s = st(id);

    const one = selectOf(id, "metric");
    const two = selectOf(id, "metric2");

    choices(one, s.metric);

    if (two) choices(two, s.metric2);

    s.metric = one.value;

    if (two) {
      if (two.value === one.value) {
        two.selectedIndex = Math.min(
          two.options.length - 1, 1
        );
      }

      s.metric2 = two.value;
    }

    root.querySelector(".iam-ready").hidden = false;
    root.querySelector(".iam-start").hidden = true;

    root.querySelector(".iam-status").textContent =
      `${data.count}개 산업 · ` +
      `${data.indicators.length}개 지표 분석 가능`;
  }

  async function loadData() {
    if (data) return data;

    if ($("#sheet")?.disabled) {
      throw Error("먼저 Excel 자료를 불러오세요.");
    }

    if (typeof call !== "function") {
      throw Error(
        "Python 계산 서비스가 준비되지 않았습니다."
      );
    }

    if (pending) return pending;

    const version = epoch;

    pending = (async () => {
      const result = await call("metrics", {});

      if (version !== epoch) {
        throw Error(
          "자료가 변경되었습니다. 새로 계산하세요."
        );
      }

      if (
        !result?.rows?.length ||
        !result?.indicators?.length
      ) {
        throw Error("분석 결과가 비어 있습니다.");
      }

      data = result;

      panels.forEach((_, id) => header(id));
      panels.forEach((_, id) => render(id));

      return result;
    })();

    try {
      return await pending;
    } finally {
      pending = null;
    }
  }

  function render(id) {
    if (!data) return;

    const s = st(id);
    const root = box(id);

    const out = root.querySelector(".iam-output");
    out.replaceChildren();

    const k = s.metric;
    const m = spec(k);

    if (!m) return;

    create(
      out, "p", "iam-note",
      `${m.description} · 단위: ${m.unit} · ` +
      `산식: ${m.formula}`
    );

    if (id === "quadrant" || id === "types") {
      return twoAxis(id, out);
    }

    if (id === "treemap") {
      return treemap(out, k);
    }

    if (id === "compare") {
      return compare(id, out, k);
    }

    if (id === "detail") {
      return detail(id, out);
    }

    return ranking(id, out, k);
  }

  // 산업별 순위, 대시보드, 원자료 및 시뮬레이션
  function ranking(id, out, k) {
    const s = st(id);
    const list = sorted(k, s.ascending);
    const query = s.query.toLowerCase();

    const results = list.filter(r =>
      (String(r.code) + " " + r.name)
        .toLowerCase()
        .includes(query)
    );

    const summary = create(
      out, "div", "iam-summary"
    );

    create(
      summary, "span", null,
      `평균 ${fmt(mean(data.rows, k))}`
    );

    create(
      summary, "span", null,
      `최댓값 ${fmt(Math.max(
        ...data.rows.map(r => val(r, k))
      ))}`
    );

    create(
      summary, "span", null,
      `최솟값 ${fmt(Math.min(
        ...data.rows.map(r => val(r, k))
      ))}`
    );

    const shown = results.slice(0, s.limit);

    const max = Math.max(
      ...shown.map(r => Math.max(0, val(r, k))), 0
    );

    shown.forEach((r, i) => {
      const line = create(
        out, "div", "iam-barline"
      );

      create(
        line, "span", "iam-name",
        `${i + 1}. ${r.name} (${r.code})`
      );

      const track = create(
        line, "div", "iam-track"
      );

      const fill = create(
        track, "div", "iam-fill"
      );

      fill.style.width =
        (max > 0
          ? 100 * Math.max(0, val(r, k)) / max
          : 0) + "%";

      create(
        line, "strong", null,
        fmt(val(r, k))
      );
    });

    create(
      out, "p", "iam-note",
      `검색 결과 ${results.length}개 중 ` +
      `${shown.length}개 표시. ` +
      "막대는 양수 값을 기준으로 표시합니다."
    );
  }

  // 36개 지표 중 2개를 선택하는 산점도
  function twoAxis(id, out) {
    const s = st(id);

    const a = s.metric;
    const b = s.metric2;

    if (!spec(b)) return;

    const av = mean(data.rows, a);
    const bv = mean(data.rows, b);

    const rows = data.rows;

    const lx = rows.map(r => val(r, a));
    const ly = rows.map(r => val(r, b));

    let xmin = Math.min(...lx, av);
    let xmax = Math.max(...lx, av);
    let ymin = Math.min(...ly, bv);
    let ymax = Math.max(...ly, bv);

    const dx = (xmax - xmin) || 1;
    const dy = (ymax - ymin) || 1;

    xmin -= dx * 0.05;
    xmax += dx * 0.05;
    ymin -= dy * 0.05;
    ymax += dy * 0.05;

    const w = 780;
    const h = 460;

    const left = 70;
    const right = 25;
    const top = 25;
    const bottom = 65;

    const xx = v =>
      left +
      (v - xmin) / (xmax - xmin) *
      (w - left - right);

    const yy = v =>
      h - bottom -
      (v - ymin) / (ymax - ymin) *
      (h - top - bottom);

    const svg = svgEl("svg", {
      viewBox: `0 0 ${w} ${h}`,
      role: "img",
      "aria-label": "산업별 지표 4분면 산점도"
    });

    svg.style.width = "100%";
    svg.style.height = "auto";

    svg.append(
      svgEl("line", {
        x1: xx(av),
        y1: top,
        x2: xx(av),
        y2: h - bottom,
        stroke: "#6989ae",
        "stroke-dasharray": "5,5"
      })
    );

    svg.append(
      svgEl("line", {
        x1: left,
        y1: yy(bv),
        x2: w - right,
        y2: yy(bv),
        stroke: "#6989ae",
        "stroke-dasharray": "5,5"
      })
    );

    svg.append(
      svgEl("line", {
        x1: left,
        y1: h - bottom,
        x2: w - right,
        y2: h - bottom,
        stroke: "#8796a6"
      })
    );

    svg.append(
      svgEl("line", {
        x1: left,
        y1: top,
        x2: left,
        y2: h - bottom,
        stroke: "#8796a6"
      })
    );

    rows.forEach(r => {
      const x = val(r, a);
      const y = val(r, b);

      const group =
        (x >= av ? 1 : 0) +
        (y >= bv ? 2 : 0);

      const colors = [
        "#8798af",
        "#ed9c46",
        "#4883c7",
        "#24a184"
      ];

      const dot = svgEl("circle", {
        cx: xx(x),
        cy: yy(y),
        r: 3.8,
        fill: colors[group],
        opacity: 0.67
      });

      const title = svgEl("title");

      title.textContent =
        `${r.name} (${r.code})\n` +
        `${spec(a).label}: ${fmt(x)}\n` +
        `${spec(b).label}: ${fmt(y)}`;

      dot.append(title);
      svg.append(dot);
    });

    const tx = svgEl("text", {
      x: w / 2,
      y: h - 12,
      "text-anchor": "middle",
      "font-size": 13,
      fill: "#25476c"
    });

    tx.textContent = spec(a).label;
    svg.append(tx);

    const ty = svgEl("text", {
      x: 18,
      y: h / 2,
      transform: `rotate(-90 18 ${h / 2})`,
      "text-anchor": "middle",
      "font-size": 13,
      fill: "#25476c"
    });

    ty.textContent = spec(b).label;
    svg.append(ty);

    out.append(svg);

    create(
      out, "p", "iam-note",
      `X축 평균: ${fmt(av)} · ` +
      `Y축 평균: ${fmt(bv)}. ` +
      "점을 가리키면 산업명과 값을 볼 수 있습니다."
    );

    if (id === "types") {
      const groups = [
        ["동시 하위", 0],
        ["X 상위", 1],
        ["Y 상위", 2],
        ["동시 상위", 3]
      ];

      const row = create(
        out, "div", "iam-summary"
      );

      groups.forEach(([name, v]) => {
        const count = rows.filter(r =>
          (val(r, a) >= av ? 1 : 0) +
          (val(r, b) >= bv ? 2 : 0) === v
        ).length;

        create(
          row, "span", null,
          `${name} ${count}개`
        );
      });
    }
  }

  // 선택 지표 기준 트리맵
  function treemap(out, k) {
    const raw = sorted(k)
      .slice(0, 30)
      .map(r => ({
        r,
        weight: Math.max(0, val(r, k))
      }));

    const total = raw.reduce(
      (sum, x) => sum + x.weight, 0
    );

    if (total <= 0) {
      create(
        out, "p", null,
        "이 지표는 양수 면적으로 표현할 수 없습니다."
      );
      return;
    }

    const svg = svgEl("svg", {
      viewBox: "0 0 900 490",
      role: "img",
      "aria-label": "산업별 지표값 비례 트리맵"
    });

    svg.style.width = "100%";
    svg.style.height = "auto";

    const colors = [
      "#295b91",
      "#3e7da8",
      "#4a93a6",
      "#6385b5",
      "#327d91"
    ];

    function split(items, x, y, w, h, depth = 0) {
      if (!items.length) return;

      if (items.length === 1) {
        const item = items[0];

        const g = svgEl("g");

        const rect = svgEl("rect", {
          x: x + 1,
          y: y + 1,
          width: Math.max(0, w - 2),
          height: Math.max(0, h - 2),
          rx: 5,
          fill: colors[depth % colors.length]
        });

        g.append(rect);

        const title = svgEl("title");

        title.textContent =
          `${item.r.name} (${item.r.code})\n` +
          `${spec(k).label}: ` +
          fmt(val(item.r, k));

        g.append(title);

        if (w > 75 && h > 36) {
          const t = svgEl("text", {
            x: x + 7,
            y: y + 19,
            fill: "#fff",
            "font-size": 11
          });

          t.textContent = item.r.name.slice(
            0,
            Math.max(5, Math.floor(w / 12))
          );

          g.append(t);
        }

        svg.append(g);
        return;
      }

      const total = items.reduce(
        (sum, item) => sum + item.weight, 0
      );

      let sum = 0;
      let cut = 1;

      for (let i = 0; i < items.length - 1; i++) {
        sum += items[i].weight;
        cut = i + 1;

        if (sum >= total / 2) break;
      }

      const fraction = total
        ? sum / total
        : 0.5;

      if (w >= h) {
        split(
          items.slice(0, cut),
          x, y,
          w * fraction, h,
          depth + 1
        );

        split(
          items.slice(cut),
          x + w * fraction, y,
          w * (1 - fraction), h,
          depth + 2
        );
      } else {
        split(
          items.slice(0, cut),
          x, y,
          w, h * fraction,
          depth + 1
        );

        split(
          items.slice(cut),
          x, y + h * fraction,
          w, h * (1 - fraction),
          depth + 2
        );
      }
    }

    split(raw, 0, 0, 900, 490);
    out.append(svg);

    create(
      out, "p", "iam-note",
      "상위 30개 산업의 선택 지표값을 " +
      "면적으로 표현합니다. 산업의 시장점유율을 " +
      "의미하는 것은 아닙니다."
    );
  }

  // 최대 5개 산업 비교
  function compare(id, out, k) {
    const s = st(id);

    const toolbar = create(
      out, "div", "iam-comparebar"
    );

    const sel = create(
      toolbar, "select", "iam-company-select"
    );

    data.rows.forEach(r => {
      const option = el(
        "option",
        null,
        `${r.name} (${r.code})`
      );

      option.value = String(r.code);
      sel.append(option);
    });

    const add = create(
      toolbar, "button", "iam-action",
      "비교 산업 추가"
    );

    add.type = "button";

    add.onclick = () => {
      if (
        !s.codes.includes(sel.value) &&
        s.codes.length < 5
      ) {
        s.codes.push(sel.value);
      }

      render(id);
    };

    if (!s.codes.length) {
      s.codes = data.rows
        .slice(0, 3)
        .map(r => String(r.code));
    }

    const rows = s.codes
      .map(code => data.rows.find(
        r => String(r.code) === code
      ))
      .filter(Boolean);

    const max = Math.max(
      0,
      ...rows.map(r => val(r, k))
    );

    rows.forEach(r => {
      const line = create(
        out, "div", "iam-barline"
      );

      create(
        line, "span", "iam-name",
        `${r.name} (${r.code})`
      );

      const track = create(
        line, "div", "iam-track"
      );

      const fill = create(
        track, "div", "iam-fill"
      );

      fill.style.width = (
        max > 0
          ? Math.max(0, val(r, k)) / max * 100
          : 0
      ) + "%";

      create(
        line, "strong", null,
        fmt(val(r, k))
      );

      const del = create(
        line, "button", "iam-remove", "제거"
      );

      del.type = "button";

      del.onclick = () => {
        s.codes = s.codes.filter(
          code => code !== String(r.code)
        );

        render(id);
      };
    });

    create(
      out, "p", "iam-note",
      "최대 5개 산업의 선택 지표를 비교합니다."
    );
  }

  // 특정 산업의 모든 36개 지표
  function detail(id, out) {
    const s = st(id);

    const toolbar = create(
      out, "div", "iam-comparebar"
    );

    const sel = create(
      toolbar, "select", "iam-company-select"
    );

    data.rows.forEach(r => {
      const option = el(
        "option", null,
        `${r.name} (${r.code})`
      );

      option.value = String(r.code);
      sel.append(option);
    });

    if (!s.industry) {
      s.industry = String(data.rows[0].code);
    }

    sel.value = s.industry;

    sel.onchange = () => {
      s.industry = sel.value;
      render(id);
    };

    const r = data.rows.find(
      r => String(r.code) === s.industry
    ) || data.rows[0];

    create(
      out, "h3", null,
      `${r.name} (${r.code})`
    );

    const groups = [
      ...new Set(data.indicators.map(x => x.group))
    ];

    groups.forEach(group => {
      create(out, "h4", null, group);

      const table = create(
        out, "table", "iam-table"
      );

      data.indicators
        .filter(x => x.group === group)
        .forEach(m => {
          const tr = create(table, "tr");

          create(tr, "td", null, m.label);
          create(
            tr, "td", null,
            fmt(val(r, m.key))
          );
          create(tr, "td", null, m.unit);
        });
    });
  }

  // 각 화면에 분석 패널 추가
  function makePanel(id) {
    const target = $("#io-view-" + id);

    if (!target) return;

    const s = {
      metric: "production_total",
      metric2: "va_induced",
      query: "",
      limit: 20,
      ascending: false,
      codes: [],
      industry: ""
    };

    state.set(id, s);

    const panel = el("section", "iam-panel");
    panel.dataset.extensionView = id;

    const top = create(
      panel, "div", "iam-head"
    );

    create(
      top, "h2", null,
      "36개 산업연관 지표 확장 분석"
    );

    create(
      top, "p", "iam-note",
      "생산유발·수입유발·부가가치·투입구조·" +
      "파급분포 지표를 추가로 분석합니다."
    );

    const loading = create(
      panel, "div", "iam-start"
    );

    const button = create(
      loading, "button", "iam-action",
      "36개 지표 불러오기"
    );

    button.type = "button";

    const status = create(
      panel, "p", "iam-status",
      "Excel을 불러온 뒤 지표 분석을 실행하세요."
    );

    button.onclick = async () => {
      button.disabled = true;
      status.textContent = "지표 계산 중…";

      try {
        await loadData();
      } catch (error) {
        status.textContent =
          "계산 실패: " + error.message;
      } finally {
        button.disabled = false;
      }
    };

    const ready = create(
      panel, "div", "iam-ready"
    );

    ready.hidden = true;

    const controls = create(
      ready, "div", "iam-controls"
    );

    function field(label, role) {
      const wrap = create(controls, "label");

      create(wrap, "span", null, label);

      const select = create(wrap, "select");

      select.dataset.role = role;

      return select;
    }

    const metric = field(
      "분석 지표", "metric"
    );

    metric.onchange = () => {
      s.metric = metric.value;
      render(id);
    };

    if (id === "quadrant" || id === "types") {
      const second = field(
        "Y축 지표", "metric2"
      );

      second.onchange = () => {
        s.metric2 = second.value;
        render(id);
      };
    }

    const rankingViews = [
      "ranking", "home", "explorer",
      "simulation", "legacy"
    ];

    if (rankingViews.includes(id)) {
      const limit = field(
        "표시 개수", "limit"
      );

      [10, 20, 40, 100].forEach(v => {
        const option = el(
          "option", null, v + "개"
        );

        option.value = v;
        limit.append(option);
      });

      limit.value = "20";

      limit.onchange = () => {
        s.limit = Number(limit.value);
        render(id);
      };

      const sort = field("정렬", "sort");

      [
        ["desc", "높은 순"],
        ["asc", "낮은 순"]
      ].forEach(([v, t]) => {
        const option = el("option", null, t);
        option.value = v;
        sort.append(option);
      });

      sort.onchange = () => {
        s.ascending = sort.value === "asc";
        render(id);
      };

      const label = create(
        controls, "label"
      );

      create(
        label, "span", null,
        "산업 검색"
      );

      const input = create(
        label, "input"
      );

      input.placeholder = "산업명 또는 코드";
      input.type = "search";

      input.oninput = () => {
        s.query = input.value.trim();
        render(id);
      };
    }

    create(
      ready, "div", "iam-output"
    );

    const heading = target.querySelector(
      ".io-pagehead"
    );

    target.insertBefore(
      panel,
      heading?.nextSibling || target.firstChild
    );

    panels.set(id, panel);
  }

  // 공통 디자인
  const style = el("style");

  style.textContent = `
    .iam-panel {
      background: white;
      border: 1px solid #dde7f3;
      border-radius: 16px;
      padding: 20px;
      margin: 15px 0 20px;
      color: #234463;
    }

    .iam-panel * {
      box-sizing: border-box;
    }

    .iam-panel [hidden] {
      display: none !important;
    }

    .iam-panel h2 {
      font-size: 20px;
      margin: 0 0 8px;
    }

    .iam-panel h3 {
      font-size: 16px;
      margin-top: 22px;
    }

    .iam-panel h4 {
      font-size: 14px;
      margin: 17px 0 7px;
    }

    .iam-note {
      font-size: 12px;
      color: #71859c;
      line-height: 1.7;
    }

    .iam-action {
      background: #174b87;
      color: white;
      border: 0;
      border-radius: 9px;
      padding: 10px 14px;
      cursor: pointer;
      font-weight: 700;
    }

    .iam-action:disabled {
      opacity: .5;
    }

    .iam-status {
      font-size: 12px;
      color: #577392;
    }

    .iam-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 18px 0;
    }

    .iam-controls label {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 155px;
      flex: 1;
      font-size: 12px;
      color: #617c97;
    }

    .iam-controls select,
    .iam-controls input,
    .iam-company-select {
      max-width: 100%;
      width: 100%;
      min-height: 38px;
      border: 1px solid #d7e1ed;
      border-radius: 8px;
      padding: 8px;
      color: #234463;
      background: white;
    }

    .iam-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 14px 0;
    }

    .iam-summary span {
      padding: 9px 12px;
      background: #f0f5fc;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
    }

    .iam-barline {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 0;
      border-bottom: 1px solid #edf2f7;
      font-size: 12px;
    }

    .iam-name {
      flex: 0 1 230px;
      min-width: 120px;
    }

    .iam-track {
      flex: 1;
      height: 13px;
      border-radius: 7px;
      background: #edf2f7;
      overflow: hidden;
    }

    .iam-fill {
      height: 100%;
      background: #327bb5;
    }

    .iam-barline strong {
      min-width: 70px;
      text-align: right;
      font-size: 12px;
    }

    .iam-comparebar {
      display: flex;
      gap: 10px;
      margin: 15px 0;
    }

    .iam-comparebar select {
      max-width: 370px;
    }

    .iam-remove {
      border: 1px solid #d6e0ea;
      background: white;
      border-radius: 7px;
      color: #627c99;
      padding: 5px;
      cursor: pointer;
    }

    .iam-table {
      border-collapse: collapse;
      width: 100%;
      font-size: 12px;
    }

    .iam-table td {
      padding: 9px;
      border-bottom: 1px solid #e4ebf4;
    }

    .iam-table td:nth-child(2) {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    @media (max-width: 650px) {
      .iam-barline {
        flex-wrap: wrap;
      }

      .iam-name {
        flex: 1 1 100%;
      }

      .iam-panel {
        padding: 12px;
      }
    }
  `;

  document.head.append(style);

  views.forEach(makePanel);

  // Excel 변경 시 기존 분석 결과 초기화
  function reset() {
    epoch++;
    data = null;
    pending = null;

    panels.forEach(panel => {
      panel.querySelector(
        ".iam-ready"
      ).hidden = true;

      panel.querySelector(
        ".iam-start"
      ).hidden = false;

      panel.querySelector(
        ".iam-status"
      ).textContent =
        "새 Excel 자료를 불러온 뒤 다시 계산하세요.";
    });
  }

  $("#load-basic")?.addEventListener(
    "click", reset, true
  );

  $("#io-classification")?.addEventListener(
    "change", reset
  );
})();
