
/* 산업별 영향력계수 / 감응도계수 트리맵 */
(() => {
  "use strict";

  const ID = "industry-treemap";
  if (document.getElementById(ID)) return;

  const anchor =
    document.getElementById("industry-heatmap") ||
    document.getElementById("industry-detail") ||
    document.querySelector("main") ||
    document.body;

  const root = document.createElement("section");
  root.id = ID;
  anchor.insertAdjacentElement("afterend", root);

  const $ = id => root.querySelector("#tm-" + id);

  const esc = value =>
    String(value).replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&quot;"
    })[c]);

  const fmt = value => Number(value).toFixed(4);

  const TYPES = [
    "Ⅰ · 핵심 연관형",
    "Ⅱ · 전방 연관형",
    "Ⅲ · 후방 연관형",
    "Ⅳ · 상대적 저연관형"
  ];

  const groupOf = r =>
    r.influence >= 1
      ? r.sensitivity >= 1 ? 0 : 2
      : r.sensitivity >= 1 ? 1 : 3;

  const METRICS = {
    influence: "영향력계수",
    sensitivity: "감응도계수"
  };

  let rows = [];
  let metric = "influence";
  let selected = null;
  let ranks = {};
  let requestId = 0;

  // 1. 기존 분석 결과 변환
  function normalize(result) {
    const data = Array.isArray(result)
      ? result
      : [
          "results", "industries",
          "rows", "data", "items"
        ]
          .map(key => result?.[key])
          .find(Array.isArray);

    if (!data?.length) {
      throw Error("산업별 분석 결과를 찾지 못했습니다.");
    }

    const pick = (item, keys) =>
      keys
        .map(key => item[key])
        .find(value =>
          value !== undefined && value !== null
        );

    const output = data.map((item, index) => ({
      code: String(
        pick(item, [
          "code", "sector_code",
          "industry_code", "id"
        ]) ?? index + 1
      ),

      name: String(
        pick(item, [
          "name", "sector_name",
          "industry_name", "label"
        ]) ?? `산업 ${index + 1}`
      ),

      influence: Number(
        pick(item, [
          "influence",
          "influence_coefficient",
          "influenceCoeff",
          "backward"
        ])
      ),

      sensitivity: Number(
        pick(item, [
          "sensitivity",
          "sensitivity_coefficient",
          "sensitivityCoeff",
          "forward"
        ])
      )
    }));

    if (output.some(item =>
      !Number.isFinite(item.influence) ||
      !Number.isFinite(item.sensitivity) ||
      item.influence < 0 ||
      item.sensitivity < 0
    )) {
      throw Error("분석 계수가 올바르지 않습니다.");
    }

    if (
      new Set(output.map(item => item.code)).size !==
      output.length
    ) {
      throw Error("산업코드가 중복되었습니다.");
    }

    return output;
  }

  // 2. 디자인
  const style = document.createElement("style");

  style.textContent = `
    #industry-treemap {
      --ink:#eef3ff;
      --muted:#9aa7bc;
      --line:#374154;
      margin:30px 0;
      font-family:inherit;
      color:var(--ink);
    }

    #industry-treemap * {
      box-sizing:border-box;
    }

    #industry-treemap .shell {
      background:#222631;
      border:1px solid #383f4d;
      border-radius:18px;
      overflow:hidden;
      box-shadow:0 16px 44px #0c14252a;
    }

    #industry-treemap .head {
      padding:21px 24px 15px;
      background:#292e3a;
      border-bottom:1px solid #3b4352;
    }

    #industry-treemap .eyebrow {
      font-size:11px;
      letter-spacing:1.7px;
      font-weight:800;
      color:#99b3e7;
    }

    #industry-treemap h2 {
      margin:7px 0;
      font-size:23px;
      color:#f5f8ff;
    }

    #industry-treemap .desc {
      margin:0;
      font-size:12px;
      color:#b4bfd0;
      line-height:1.7;
    }

    #industry-treemap .tools {
      display:flex;
      flex-wrap:wrap;
      gap:9px;
      align-items:center;
      margin-top:15px;
    }

    #industry-treemap button,
    #industry-treemap input,
    #industry-treemap select {
      font:inherit;
    }

    #industry-treemap .toggle {
      display:flex;
      gap:3px;
      padding:3px;
      border-radius:10px;
      background:#191e28;
      border:1px solid #465166;
    }

    #industry-treemap .toggle button {
      padding:9px 13px;
      border:0;
      border-radius:7px;
      color:#b4c0d2;
      background:transparent;
      cursor:pointer;
      font-size:12px;
      font-weight:750;
    }

    #industry-treemap .toggle button.active {
      background:#4d73bd;
      color:#fff;
    }

    #industry-treemap input,
    #industry-treemap select {
      padding:10px 11px;
      background:#1d2430;
      color:#f2f6ff;
      border:1px solid #48566b;
      border-radius:9px;
      font-size:12px;
    }

    #industry-treemap input {
      width:220px;
      max-width:100%;
    }

    #industry-treemap .run {
      margin-left:auto;
      background:#e6ecfa;
      color:#172840;
      font-weight:800;
      border:0;
      border-radius:9px;
      padding:10px 15px;
      cursor:pointer;
      font-size:12px;
    }

    #industry-treemap .run:disabled {
      opacity:.55;
      cursor:wait;
    }

    #industry-treemap .status {
      padding:9px 24px;
      color:#a8b9d1;
      font-size:12px;
      min-height:35px;
    }

    #industry-treemap .summary {
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:1px;
      background:#414b5c;
    }

    #industry-treemap .stat {
      background:#2b3240;
      padding:13px 20px;
    }

    #industry-treemap .stat small {
      display:block;
      font-size:11px;
      color:#aab8cb;
      margin-bottom:5px;
    }

    #industry-treemap .stat strong {
      font-size:22px;
      color:#fff;
      font-variant-numeric:tabular-nums;
    }

    #industry-treemap .layout {
      display:grid;
      grid-template-columns:minmax(0,1fr) 257px;
      gap:12px;
      padding:14px;
    }

    #industry-treemap .chart {
      position:relative;
      background:#191d27;
      border:1px solid #465067;
      border-radius:10px;
      overflow:hidden;
    }

    #industry-treemap .chart svg {
      width:100%;
      height:auto;
      display:block;
    }

    #industry-treemap .tile {
      cursor:pointer;
    }

    #industry-treemap .tile:hover rect {
      stroke:#fff;
      stroke-width:2.4;
    }

    #industry-treemap .panel {
      background:#2e3544;
      border:1px solid #475267;
      border-radius:10px;
      padding:17px;
      align-self:start;
      min-height:280px;
    }

    #industry-treemap .panel .tag {
      font-size:10px;
      letter-spacing:1px;
      color:#b4c5e1;
      font-weight:800;
    }

    #industry-treemap .panel h3 {
      font-size:20px;
      color:white;
      margin:12px 0 4px;
      line-height:1.45;
    }

    #industry-treemap .panel p {
      color:#bac7db;
      font-size:12px;
      line-height:1.8;
      margin:7px 0;
    }

    #industry-treemap .detailrow {
      display:flex;
      justify-content:space-between;
      align-items:baseline;
      gap:7px;
      padding:11px 0;
      border-bottom:1px solid #475268;
      font-size:12px;
      color:#a8b9d1;
    }

    #industry-treemap .detailrow b {
      color:#fff;
      font-size:15px;
      font-variant-numeric:tabular-nums;
    }

    #industry-treemap .insight {
      background:#222b3c;
      padding:12px;
      border-radius:8px;
      margin-top:14px;
      font-size:12px;
      line-height:1.8;
      color:#d4e3fa;
    }

    #industry-treemap .scale {
      padding:4px 24px 18px;
    }

    #industry-treemap .scale-line {
      display:flex;
      align-items:center;
      gap:10px;
      justify-content:flex-end;
      flex-wrap:wrap;
      font-size:11px;
      color:#c7d1df;
    }

    #industry-treemap .gradient {
      height:13px;
      width:min(430px,60vw);
      border-radius:3px;
      background:linear-gradient(
        90deg,
        #aa1e36 0%,
        #df5361 22%,
        #645b67 49.9%,
        #516d5e 50.1%,
        #29bb61 78%,
        #12a847 100%
      );
      border:1px solid #5d6878;
    }

    #industry-treemap .note {
      font-size:11px;
      line-height:1.75;
      color:#98a7bb;
      margin:10px 0 0;
    }

    @media(max-width:930px) {
      #industry-treemap .layout {
        grid-template-columns:1fr;
      }

      #industry-treemap .summary {
        grid-template-columns:repeat(2,1fr);
      }

      #industry-treemap .run {
        margin-left:0;
      }
    }

    @media(max-width:500px) {
      #industry-treemap .head {
        padding:15px;
      }

      #industry-treemap .layout {
        padding:8px;
      }

      #industry-treemap .stat {
        padding:10px;
      }

      #industry-treemap .stat strong {
        font-size:18px;
      }

      #industry-treemap .scale {
        padding:9px 12px;
      }
    }
  `;

  document.head.appendChild(style);

  // 3. 화면 구성
  root.innerHTML = `
    <div class="shell">
      <header class="head">
        <div class="eyebrow">
          INDUSTRY INTELLIGENCE · 2023 / TREEMAP
        </div>

        <h2>산업별 영향력·감응도 트리맵</h2>

        <p class="desc">
          산업별 계수 크기를 면적으로,
          기준값 1과의 차이를 색상으로 표시합니다.
          사각형을 클릭하면 상세 정보를 확인할 수 있습니다.
        </p>

        <div class="tools">
          <div class="toggle">
            <button type="button"
              id="tm-influence"
              class="active"
              aria-pressed="true">
              영향력계수
            </button>

            <button type="button"
              id="tm-sensitivity"
              aria-pressed="false">
              감응도계수
            </button>
          </div>

          <input id="tm-search"
            type="search"
            placeholder="산업명 또는 코드 검색">

          <select id="tm-count">
            <option value="40">상위 40개</option>
            <option value="100" selected>상위 100개</option>
            <option value="200">상위 200개</option>
            <option value="all">전체 산업</option>
          </select>

          <button type="button"
            id="tm-run"
            class="run">
            현재 분류 분석 실행
          </button>
        </div>
      </header>

      <div class="status" id="tm-status">
        Excel을 불러온 다음 분석을 실행하세요.
      </div>

      <div id="tm-results" hidden>
        <div class="summary">
          <div class="stat">
            <small>분석 대상 산업</small>
            <strong id="tm-total">—</strong>
          </div>

          <div class="stat">
            <small>현재 지표 평균</small>
            <strong id="tm-average">—</strong>
          </div>

          <div class="stat">
            <small>기준값 1 이상</small>
            <strong id="tm-above">—</strong>
          </div>

          <div class="stat">
            <small>현재 지표 최고값</small>
            <strong id="tm-max">—</strong>
          </div>
        </div>

        <div class="layout">
          <div class="chart">
            <svg id="tm-svg"
              viewBox="0 0 1120 680"
              role="img"
              aria-label="산업별 트리맵">
            </svg>
          </div>

          <aside id="tm-detail"
            class="panel"
            aria-live="polite">
          </aside>
        </div>

        <div class="scale">
          <div class="scale-line">
            <span>-50%</span>
            <span class="gradient"></span>
            <span>+50%</span>
          </div>

          <p class="note">
            색상 지수 = (선택 계수 - 1) × 100%.
            빨강은 평균 미만, 초록은 평균 이상,
            중간은 기준값 1입니다.
            범례 범위를 벗어나면 끝 색상으로 표시합니다.
          </p>

          <p class="note">
            사각형 면적은 선택한 계수에 비례합니다.
            산업군은 영향력·감응도에 따른 네 가지
            유형으로 구분합니다. 실제 거래액이나
            생산액을 나타내지는 않습니다.
          </p>
        </div>
      </div>
    </div>
  `;

  const NS = "http://www.w3.org/2000/svg";

  function svgNode(name, attributes = {}, label) {
    const element = document.createElementNS(NS, name);

    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
    }

    if (label !== undefined) {
      element.textContent = label;
    }

    return element;
  }

  // 4. 사각형 분할 알고리즘
  // 계수 크기에 비례해 면적 계산
  function squarify(items, rect, weightFn) {
    const sorted = items
      .filter(item => weightFn(item) > 0)
      .sort((a, b) => weightFn(b) - weightFn(a));

    const total = sorted.reduce(
      (sum, item) => sum + weightFn(item), 0
    );

    if (!total || rect.w <= 0 || rect.h <= 0) {
      return [];
    }

    const areas = sorted.map(item => ({
      item,
      area: weightFn(item) / total * rect.w * rect.h
    }));

    const output = [];

    let space = { ...rect };
    let index = 0;
    let row = [];

    function worst(candidate, side) {
      const sum = candidate.reduce(
        (s, item) => s + item.area, 0
      );

      const max = Math.max(
        ...candidate.map(item => item.area)
      );

      const min = Math.min(
        ...candidate.map(item => item.area)
      );

      return Math.max(
        side * side * max / (sum * sum),
        sum * sum / (side * side * min)
      );
    }

    function placeRow() {
      if (!row.length) return;

      const area = row.reduce(
        (s, item) => s + item.area, 0
      );

      if (space.w >= space.h) {
        const width = area / space.h;
        let y = space.y;

        row.forEach(cell => {
          const height = cell.area / width;

          output.push({
            item: cell.item,
            x: space.x,
            y,
            w: width,
            h: height
          });

          y += height;
        });

        space.x += width;
        space.w = Math.max(0, space.w - width);

      } else {
        const height = area / space.w;
        let x = space.x;

        row.forEach(cell => {
          const width = cell.area / height;

          output.push({
            item: cell.item,
            x,
            y: space.y,
            w: width,
            h: height
          });

          x += width;
        });

        space.y += height;
        space.h = Math.max(0, space.h - height);
      }

      row = [];
    }

    while (index < areas.length) {
      const next = areas[index];
      const side = Math.min(space.w, space.h);

      if (
        !row.length ||
        worst([...row, next], side) <= worst(row, side)
      ) {
        row.push(next);
        index++;
      } else {
        placeRow();
      }
    }

    placeRow();
    return output;
  }

  // 5. 계수에 따른 색상
  function tone(value) {
    const diff = value - 1;

    if (Math.abs(diff) < 0.000001) {
      return "#596473";
    }

    const strength = Math.min(
      1,
      Math.abs(diff) / 0.5
    );

    if (diff > 0) {
      return `hsl(
        145
        ${35 + 40 * strength}%
        ${30 + 13 * strength}%
      )`;
    }

    return `hsl(
      351
      ${35 + 39 * strength}%
      ${32 + 13 * strength}%
    )`;
  }

  // 6. 순위 계산
  function rankAll(field) {
    const sorted = [...rows].sort(
      (a, b) => b[field] - a[field]
    );

    const result = new Map();

    sorted.forEach((item, index) => {
      const previous = sorted[index - 1];

      const rank =
        index > 0 &&
        previous[field] === item[field]
          ? result.get(previous.code)
          : index + 1;

      result.set(item.code, rank);
    });

    return result;
  }

  // 7. 클릭한 산업 상세 정보
  function renderDetail() {
    const item = rows.find(
      row => row.code === selected
    );

    if (!item) {
      $("detail").innerHTML = `
        <div class="tag">INDUSTRY DETAILS</div>
        <h3>산업을 선택하세요</h3>
        <p>
          왼쪽 사각형을 클릭하면 산업별 계수,
          전체 순위, 산업 유형을 확인할 수 있습니다.
        </p>
      `;
      return;
    }

    const value = item[metric];
    const delta = (value - 1) * 100;

    $("detail").innerHTML = `
      <div class="tag">
        SELECTED INDUSTRY
      </div>

      <h3>${esc(item.name)}</h3>
      <p>산업코드 ${esc(item.code)}</p>

      <div class="detailrow">
        <span>영향력계수</span>
        <b>${fmt(item.influence)}</b>
      </div>

      <div class="detailrow">
        <span>감응도계수</span>
        <b>${fmt(item.sensitivity)}</b>
      </div>

      <div class="detailrow">
        <span>영향력 순위</span>
        <b>
          ${ranks.influence.get(item.code)}
          / ${rows.length}
        </b>
      </div>

      <div class="detailrow">
        <span>감응도 순위</span>
        <b>
          ${ranks.sensitivity.get(item.code)}
          / ${rows.length}
        </b>
      </div>

      <div class="detailrow">
        <span>현재 지표 평균 대비</span>
        <b>
          ${delta >= 0 ? "+" : ""}
          ${delta.toFixed(2)}%
        </b>
      </div>

      <div class="insight">
        <strong>${TYPES[groupOf(item)]}</strong>

        <p>
          영향력계수는 후방 연관효과,
          감응도계수는 전방 연관효과를 나타냅니다.
          두 지표 모두 전산업 평균을 1로
          정규화한 값입니다.
        </p>
      </div>
    `;
  }

  // 8. 트리맵 출력
  function draw() {
    if (!rows.length) return;

    $("influence").classList.toggle(
      "active", metric === "influence"
    );

    $("sensitivity").classList.toggle(
      "active", metric === "sensitivity"
    );

    $("influence").setAttribute(
      "aria-pressed",
      String(metric === "influence")
    );

    $("sensitivity").setAttribute(
      "aria-pressed",
      String(metric === "sensitivity")
    );

    const average =
      rows.reduce(
        (sum, row) => sum + row[metric], 0
      ) / rows.length;

    $("total").textContent =
      rows.length.toLocaleString("ko-KR");

    $("average").textContent = fmt(average);

    $("above").textContent =
      rows.filter(row => row[metric] >= 1).length + "개";

    $("max").textContent = fmt(
      Math.max(...rows.map(row => row[metric]))
    );

    const query = $("search").value
      .trim()
      .toLowerCase();

    const count = $("count").value;

    let chosen = [...rows].sort(
      (a, b) => b[metric] - a[metric]
    );

    if (count !== "all") {
      chosen = chosen.slice(0, Number(count));
    }

    const groups = [0, 1, 2, 3]
      .map(index => ({
        index,
        items: chosen.filter(
          row => groupOf(row) === index
        )
      }))
      .filter(group => group.items.length);

    const chart = $("svg");
    chart.replaceChildren();

    const groupBoxes = squarify(
      groups,
      {
        x: 4,
        y: 4,
        w: 1112,
        h: 672
      },
      group => group.items.reduce(
        (sum, row) =>
          sum + Math.max(row[metric], 0.00001),
        0
      )
    );

    for (const groupBox of groupBoxes) {
      const { x, y, w, h } = groupBox;

      chart.appendChild(
        svgNode("rect", {
          x,
          y,
          width: w,
          height: h,
          fill: "#252b37",
          stroke: "#151923",
          "stroke-width": 4
        })
      );

      const header = Math.min(
        25,
        Math.max(16, h * 0.13)
      );

      chart.appendChild(
        svgNode("rect", {
          x: x + 3,
          y: y + 3,
          width: Math.max(0, w - 6),
          height: header,
          fill: "#373f50"
        })
      );

      if (w > 80) {
        chart.appendChild(
          svgNode("text", {
            x: x + 9,
            y: y + header * 0.7 + 2,
            fill: "#d9e3f4",
            "font-size": Math.min(
              13, Math.max(9, w / 18)
            ),
            "font-weight": 800
          }, TYPES[groupBox.item.index])
        );
      }

      const inner = {
        x: x + 3,
        y: y + header + 5,
        w: w - 6,
        h: h - header - 8
      };

      if (inner.w <= 0 || inner.h <= 0) {
        continue;
      }

      const rectangles = squarify(
        groupBox.item.items,
        inner,
        row => Math.max(row[metric], 0.00001)
      );

      for (const cell of rectangles) {
        const item = cell.item;

        const active = selected === item.code;

        const matched =
          !query ||
          `${item.name} ${item.code}`
            .toLowerCase()
            .includes(query);

        const tile = svgNode("g", {
          class: "tile",
          tabindex: 0,
          role: "button",
          "aria-label":
            `${item.name}, ${METRICS[metric]} ` +
            fmt(item[metric])
        });

        tile.appendChild(
          svgNode("rect", {
            x: cell.x + 1,
            y: cell.y + 1,
            width: Math.max(0, cell.w - 2),
            height: Math.max(0, cell.h - 2),
            fill: tone(item[metric]),
            "fill-opacity": matched ? 1 : 0.22,
            stroke: active
              ? "#fbe477"
              : "#26303f",
            "stroke-width": active ? 3 : 1
          })
        );

        tile.appendChild(
          svgNode(
            "title",
            {},
            `${item.name} (${item.code})\n` +
            `${METRICS[metric]}: ${fmt(item[metric])}\n` +
            `순위: ${ranks[metric].get(item.code)}위\n` +
            `평균 대비: ${(
              (item[metric] - 1) * 100
            ).toFixed(2)}%`
          )
        );

        if (cell.w >= 60 && cell.h >= 28) {
          const length = Math.max(
            3,
            Math.floor((cell.w - 12) / 10)
          );

          const label =
            item.name.length > length
              ? item.name.slice(0, length - 1) + "…"
              : item.name;

          tile.appendChild(
            svgNode("text", {
              x: cell.x + cell.w / 2,
              y: cell.y + cell.h / 2 +
                (cell.h >= 47 ? -3 : 4),
              fill: "#fff",
              "font-size": Math.min(
                15, Math.max(9, cell.w / 8)
              ),
              "font-weight": 750,
              "text-anchor": "middle",
              "pointer-events": "none"
            }, label)
          );

          if (cell.h >= 47) {
            tile.appendChild(
              svgNode("text", {
                x: cell.x + cell.w / 2,
                y: cell.y + cell.h / 2 + 16,
                fill: "#edf5ff",
                "font-size": 11,
                "text-anchor": "middle",
                "pointer-events": "none"
              }, fmt(item[metric]))
            );
          }
        }

        const choose = () => {
          selected = item.code;
          draw();
        };

        tile.addEventListener("click", choose);

        tile.addEventListener("keydown", event => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            choose();
          }
        });

        chart.appendChild(tile);
      }
    }

    renderDetail();

    $("status").textContent =
      `${METRICS[metric]} · ` +
      `총 ${rows.length}개 산업 중 ` +
      `${chosen.length}개 표시 · ` +
      "색상 기준 1.000";
  }

  // 9. 버튼 및 분석 연결
  $("influence").addEventListener("click", () => {
    metric = "influence";
    draw();
  });

  $("sensitivity").addEventListener("click", () => {
    metric = "sensitivity";
    draw();
  });

  $("count").addEventListener("change", draw);
  $("search").addEventListener("input", draw);

  $("run").addEventListener("click", async () => {
    const version = ++requestId;
    const button = $("run");

    button.disabled = true;

    $("status").textContent =
      "산업별 영향력·감응도계수 분석 중…";

    try {
      if (typeof call !== "function") {
        throw Error(
          "기존 분석 함수 call()을 찾을 수 없습니다."
        );
      }

      const result = await call("analyze", {});

      if (version !== requestId) return;

      rows = normalize(result);
      selected = null;

      ranks = {
        influence: rankAll("influence"),
        sensitivity: rankAll("sensitivity")
      };

      $("search").value = "";
      $("results").hidden = false;

      draw();

    } catch (error) {
      if (version === requestId) {
        $("status").textContent =
          "분석 실패: " +
          (error?.message || String(error));
      }
    } finally {
      button.disabled = false;
    }
  });

})();

