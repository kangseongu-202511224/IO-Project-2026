
/* 산업연관계수 분석 대시보드
   4분면 버블 차트 + 듀얼 히트맵 + 보조 그래프 */

(() => {
  "use strict";

  const ROOT_ID = "industry-heatmap";

  let root = document.getElementById(ROOT_ID);

  if (!root) {
    root = document.createElement("section");
    root.id = ROOT_ID;

    const anchor =
      document.getElementById("industry-detail") ||
      document.querySelector("main") ||
      document.body;

    anchor.appendChild(root);
  }

  const $ = name => root.querySelector("#ii-" + name);

  const escapeHTML = value =>
    String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  const number = value => Number(value).toFixed(4);

  const percent = value =>
    `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;

  const TYPES = [
    {
      name: "핵심 연관형",
      description: "영향력계수와 감응도계수 모두 1 이상",
      color: "#4f5fd2"
    },
    {
      name: "전방 연관형",
      description: "감응도계수만 1 이상",
      color: "#169e99"
    },
    {
      name: "후방 연관형",
      description: "영향력계수만 1 이상",
      color: "#df9a47"
    },
    {
      name: "상대적 저연관형",
      description: "두 계수 모두 1 미만",
      color: "#d46e86"
    }
  ];

  const METRICS = {
    influence: {
      title: "영향력계수",
      english: "BACKWARD LINKAGE",
      color: "#536de0"
    },

    sensitivity: {
      title: "감응도계수",
      english: "FORWARD LINKAGE",
      color: "#119f9c"
    }
  };

  let industries = [];
  let ranks = {};
  let selectedCode = null;
  let requestVersion = 0;

  const filters = {
    influence: {
      search: "",
      sort: "desc",
      count: 100
    },

    sensitivity: {
      search: "",
      sort: "desc",
      count: 100
    }
  };

  // ==================================================
  // 1. 디자인
  // ==================================================

  const style = document.createElement("style");

  style.textContent = `
    #industry-heatmap {
      --ink: #192b46;
      --muted: #718199;
      --line: #e1e8f2;
      --bg: #f3f6fb;

      font-family: inherit;
      color: var(--ink);
      margin: 32px 0;
      isolation: isolate;
    }

    #industry-heatmap * {
      box-sizing: border-box;
    }

    #industry-heatmap .dashboard {
      background: var(--bg);
      border: 1px solid var(--line);
      border-radius: 22px;
      padding: 22px;
    }

    #industry-heatmap .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
      flex-wrap: wrap;
      margin-bottom: 15px;
    }

    #industry-heatmap .eyebrow {
      color: #657cac;
      font-size: 11px;
      letter-spacing: 1.5px;
      font-weight: 800;
    }

    #industry-heatmap h2 {
      margin: 6px 0;
      font-size: 25px;
      color: #172943;
    }

    #industry-heatmap h3 {
      margin: 0;
      font-size: 19px;
      color: #263b59;
    }

    #industry-heatmap .description {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.7;
      margin: 7px 0 0;
    }

    #industry-heatmap .run-button {
      background: #294e8c;
      border: none;
      border-radius: 10px;
      padding: 12px 18px;
      color: white;
      font-weight: 750;
      cursor: pointer;
      font-family: inherit;
    }

    #industry-heatmap .run-button:hover {
      background: #1b396d;
    }

    #industry-heatmap .run-button:disabled {
      opacity: .55;
      cursor: wait;
    }

    #industry-heatmap .status {
      font-size: 12px;
      color: #64758d;
      margin-bottom: 15px;
      min-height: 20px;
    }

    #industry-heatmap .card {
      background: white;
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 18px;
      box-shadow: 0 6px 20px rgba(29, 55, 91, .04);
    }

    #industry-heatmap .main-layout {
      display: grid;
      grid-template-columns: 155px minmax(0, 1fr);
      gap: 15px;
      align-items: start;
    }

    #industry-heatmap .kpi-column {
      display: grid;
      grid-template-columns: 1fr;
      gap: 11px;
    }

    #industry-heatmap .kpi {
      background: white;
      border: 1px solid var(--line);
      border-radius: 13px;
      padding: 16px 12px;
      min-width: 0;
    }

    #industry-heatmap .kpi-label {
      font-size: 12px;
      color: #728198;
      margin-bottom: 10px;
    }

    #industry-heatmap .kpi-value {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -.5px;
      font-variant-numeric: tabular-nums;
    }

    #industry-heatmap .kpi-note {
      color: #8b99ab;
      font-size: 11px;
      margin-top: 8px;
    }

    #industry-heatmap .section-label {
      font-size: 10px;
      letter-spacing: 1.2px;
      font-weight: 800;
      color: #7187b1;
      margin-bottom: 6px;
    }

    #industry-heatmap .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    #industry-heatmap .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
    }

    #industry-heatmap .controls input,
    #industry-heatmap .controls select {
      border: 1px solid #d8e1ed;
      border-radius: 9px;
      padding: 9px 10px;
      background: white;
      color: #283d5a;
      font: inherit;
      font-size: 12px;
      min-width: 0;
    }

    #industry-heatmap .controls input {
      width: 175px;
    }

    #industry-heatmap .plot-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 245px;
      gap: 14px;
      margin-top: 15px;
    }

    #industry-heatmap .plot-panel {
      background: #fbfcff;
      border: 1px solid #e8edf5;
      border-radius: 12px;
      padding: 10px;
      min-width: 0;
    }

    #industry-heatmap .plot-panel svg {
      display: block;
      width: 100%;
      height: auto;
    }

    #industry-heatmap .detail-panel {
      background: #f8faff;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 15px;
      min-width: 0;
    }

    #industry-heatmap .detail-label {
      font-size: 11px;
      color: #8291a6;
      font-weight: 800;
      letter-spacing: 1px;
    }

    #industry-heatmap .detail-name {
      font-weight: 800;
      font-size: 18px;
      margin: 10px 0 5px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    #industry-heatmap .detail-code {
      font-size: 12px;
      color: #8391a4;
      margin-bottom: 14px;
    }

    #industry-heatmap .metric-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      border-top: 1px solid #e2e9f2;
      padding: 11px 0;
      font-size: 12px;
    }

    #industry-heatmap .metric-row strong {
      font-size: 15px;
      color: #234273;
      font-variant-numeric: tabular-nums;
    }

    #industry-heatmap .interpretation {
      background: #edf3fc;
      padding: 12px;
      border-radius: 9px;
      font-size: 12px;
      color: #465d7c;
      line-height: 1.8;
      margin-top: 10px;
    }

    #industry-heatmap .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 9px 15px;
      margin-top: 13px;
      font-size: 11px;
      color: #687990;
    }

    #industry-heatmap .legend-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 5px;
    }

    #industry-heatmap .bubble {
      cursor: pointer;
      transition: opacity .12s;
    }

    #industry-heatmap .bubble:hover {
      stroke: #132b50;
      stroke-width: 3;
    }

    #industry-heatmap .heatmap-card {
      margin-top: 16px;
    }

    #industry-heatmap .heat-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 250px;
      gap: 15px;
      margin-top: 15px;
    }

    #industry-heatmap .heat-section {
      padding: 14px;
      border: 1px solid #e3eaf3;
      border-radius: 12px;
      background: #fbfcff;
      margin-bottom: 13px;
      min-width: 0;
    }

    #industry-heatmap .heat-grid {
      display: grid;
      grid-template-columns: repeat(10, minmax(0, 1fr));
      gap: 4px;
      margin: 13px 0;
    }

    #industry-heatmap .heat-cell {
      height: 40px;
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255,255,255,.6);
      border-radius: 6px;
      cursor: pointer;
      font-family: inherit;
      font-size: 10px;
      font-weight: 800;
      padding: 0 2px;
      font-variant-numeric: tabular-nums;
      transition: transform .12s;
    }

    #industry-heatmap .heat-cell:hover {
      transform: scale(1.08);
      outline: 2px solid #243d70;
      z-index: 2;
    }

    #industry-heatmap .heat-cell.selected {
      outline: 3px solid #1b315d;
      z-index: 3;
    }

    #industry-heatmap .heat-info {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      color: #79899e;
      font-size: 11px;
    }

    #industry-heatmap .gradient {
      height: 10px;
      border-radius: 9px;
      flex: 1;
      background: linear-gradient(
        90deg,
        #e8f0ff,
        #9cbff6,
        #526cda,
        #253c8d
      );
    }

    #industry-heatmap .gradient-legend {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
      font-size: 11px;
      color: #77879b;
    }

    #industry-heatmap .side-chart {
      padding: 13px;
      border: 1px solid var(--line);
      border-radius: 12px;
      margin-bottom: 12px;
      background: white;
    }

    #industry-heatmap .side-chart h4 {
      margin: 0;
      font-size: 14px;
      color: #2b4261;
    }

    #industry-heatmap .side-chart svg {
      display: block;
      width: 100%;
      height: auto;
      margin-top: 10px;
    }

    #industry-heatmap .mini-detail {
      background: #edf3fb;
      border-radius: 9px;
      padding: 10px;
      color: #4a6384;
      font-size: 12px;
      line-height: 1.7;
      margin-top: 10px;
    }

    #industry-heatmap .note {
      font-size: 11px;
      line-height: 1.8;
      color: #7e8b9c;
      margin: 12px 0 0;
    }

    @media (max-width: 1000px) {
      #industry-heatmap .main-layout,
      #industry-heatmap .plot-layout,
      #industry-heatmap .heat-layout {
        grid-template-columns: 1fr;
      }

      #industry-heatmap .kpi-column {
        grid-template-columns: repeat(2, minmax(0,1fr));
      }
    }

    @media (max-width: 600px) {
      #industry-heatmap .dashboard {
        padding: 12px;
      }

      #industry-heatmap .card {
        padding: 12px;
      }

      #industry-heatmap .heat-cell {
        height: 32px;
        font-size: 9px;
      }

      #industry-heatmap .heat-grid {
        gap: 2px;
      }

      #industry-heatmap .controls input {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);

  // ==================================================
  // 2. 화면 생성
  // ==================================================

  root.innerHTML = `
    <div class="dashboard">

      <div class="header">
        <div>
          <div class="eyebrow">
            INDUSTRY INTELLIGENCE / INPUT–OUTPUT 2023
          </div>

          <h2>산업연관계수 분석 대시보드</h2>

          <p class="description">
            영향력계수와 감응도계수로 산업의 구조적 위치를
            분석합니다. 원과 히트맵 셀을 클릭하면 산업별
            상세 정보를 확인할 수 있습니다.
          </p>
        </div>

        <button
          type="button"
          class="run-button"
          id="ii-run">
          현재 분류 분석 실행
        </button>
      </div>

      <div class="status" id="ii-status">
        먼저 산업분류 Excel 데이터를 불러와 주세요.
      </div>

      <div id="ii-results" hidden>

        <div class="main-layout">

          <div class="kpi-column">
            <div class="kpi">
              <div class="kpi-label">분석 대상 산업</div>
              <div class="kpi-value" id="ii-count">—</div>
              <div class="kpi-note">현재 산업분류 기준</div>
            </div>

            <div class="kpi">
              <div class="kpi-label">영향력계수 평균</div>
              <div class="kpi-value" id="ii-inf-average">—</div>
              <div class="kpi-note">정규화 기준 약 1</div>
            </div>

            <div class="kpi">
              <div class="kpi-label">감응도계수 평균</div>
              <div class="kpi-value" id="ii-sen-average">—</div>
              <div class="kpi-note">정규화 기준 약 1</div>
            </div>

            <div class="kpi">
              <div class="kpi-label">핵심 연관형 산업</div>
              <div class="kpi-value" id="ii-core-count">—</div>
              <div class="kpi-note">두 계수 모두 1 이상</div>
            </div>
          </div>

          <section class="card">

            <div class="section-header">
              <div>
                <div class="section-label">
                  01 / QUADRANT ANALYSIS
                </div>

                <h3>영향력계수 × 감응도계수 4분면 맵</h3>

                <p class="description">
                  X축: 영향력계수 · Y축: 감응도계수
                  · 기준선: 1.000
                </p>
              </div>

              <div class="controls">
                <input
                  id="ii-search"
                  type="search"
                  placeholder="산업명 / 코드 검색">

                <select id="ii-label-mode">
                  <option value="selected">선택 산업명 표시</option>
                  <option value="top">상위 산업명 표시</option>
                  <option value="none">이름 숨기기</option>
                </select>
              </div>
            </div>

            <div class="plot-layout">
              <div class="plot-panel">

                <svg
                  id="ii-scatter"
                  viewBox="0 0 770 520"
                  role="img"
                  aria-label="영향력계수 감응도계수 4분면">
                </svg>

                <div id="ii-legend" class="legend"></div>
              </div>

              <aside id="ii-detail" class="detail-panel">
                산업을 선택하세요.
              </aside>
            </div>

            <p class="note">
              각 원은 하나의 산업입니다. 원의 크기는 시각적
              구분을 위한 보조 표현이며 생산규모나 거래금액을
              의미하지 않습니다.
            </p>
          </section>
        </div>

        <section class="card heatmap-card">

          <div class="section-header">
            <div>
              <div class="section-label">
                02 / DUAL HEATMAP
              </div>

              <h3>산업별 영향력·감응도 듀얼 히트맵</h3>

              <p class="description">
                두 계수를 별도의 히트맵으로 표시합니다.
                각 셀은 산업 하나를 뜻하며
                색이 진할수록 계수가 높습니다.
              </p>
            </div>
          </div>

          <div class="heat-layout">
            <div id="ii-heatmaps"></div>
            <aside id="ii-side-charts"></aside>
          </div>

          <p class="note">
            오른쪽 그래프는 시간별 추세가 아닌
            산업 순위별 계수 분포입니다.
            히트맵의 행과 열은 산업 간 거래행렬을
            뜻하지 않습니다.
          </p>

        </section>

      </div>
    </div>
  `;

  // ==================================================
  // 3. 데이터 읽기
  // ==================================================

  function findResults(response) {
    if (Array.isArray(response)) {
      return response;
    }

    const possibleKeys = [
      "results",
      "industries",
      "rows",
      "data",
      "items"
    ];

    for (const key of possibleKeys) {
      if (Array.isArray(response?.[key])) {
        return response[key];
      }
    }

    return null;
  }

  function getValue(object, keys) {
    for (const key of keys) {
      if (
        object?.[key] !== undefined &&
        object[key] !== null
      ) {
        return object[key];
      }
    }

    return undefined;
  }

  function normalize(response) {
    const source = findResults(response);

    if (!source || !source.length) {
      throw new Error(
        "분석 결과에서 산업 목록을 찾지 못했습니다."
      );
    }

    const output = source.map((item, index) => ({
      code: String(
        getValue(item, [
          "code",
          "sector_code",
          "industry_code",
          "id"
        ]) ?? (index + 1)
      ),

      name: String(
        getValue(item, [
          "name",
          "sector_name",
          "industry_name",
          "label"
        ]) ?? `산업 ${index + 1}`
      ),

      influence: Number(
        getValue(item, [
          "influence",
          "influence_coefficient",
          "influenceCoeff",
          "backward"
        ])
      ),

      sensitivity: Number(
        getValue(item, [
          "sensitivity",
          "sensitivity_coefficient",
          "sensitivityCoeff",
          "forward"
        ])
      )
    }));

    if (output.some(item =>
      !Number.isFinite(item.influence) ||
      !Number.isFinite(item.sensitivity)
    )) {
      throw new Error(
        "계수 데이터를 읽을 수 없습니다."
      );
    }

    if (
      new Set(output.map(item => item.code)).size !==
      output.length
    ) {
      throw new Error(
        "산업코드가 중복되어 있습니다."
      );
    }

    return output;
  }

  // ==================================================
  // 4. 산업 유형 및 순위 계산
  // ==================================================

  function getType(item) {
    if (
      item.influence >= 1 &&
      item.sensitivity >= 1
    ) {
      return 0;
    }

    if (
      item.influence < 1 &&
      item.sensitivity >= 1
    ) {
      return 1;
    }

    if (
      item.influence >= 1 &&
      item.sensitivity < 1
    ) {
      return 2;
    }

    return 3;
  }

  function calculateRanking(metric) {
    const sorted = [...industries].sort(
      (a, b) => b[metric] - a[metric]
    );

    const ranking = new Map();

    sorted.forEach((item, index) => {
      const previous = sorted[index - 1];

      const position =
        index > 0 &&
        item[metric] === previous[metric]
          ? ranking.get(previous.code)
          : index + 1;

      ranking.set(item.code, position);
    });

    return ranking;
  }

  // ==================================================
  // 5. 산업 클릭 상세 정보
  // ==================================================

  function selectIndustry(code) {
    const item = industries.find(
      industry => industry.code === code
    );

    if (!item) return;

    selectedCode = code;

    const type = TYPES[getType(item)];

    $("detail").innerHTML = `
      <div class="detail-label">
        SELECTED INDUSTRY
      </div>

      <div class="detail-name">
        ${escapeHTML(item.name)}
      </div>

      <div class="detail-code">
        산업코드 ${escapeHTML(item.code)}
      </div>

      <div class="metric-row">
        <span>영향력계수</span>
        <strong>${number(item.influence)}</strong>
      </div>

      <div class="metric-row">
        <span>감응도계수</span>
        <strong>${number(item.sensitivity)}</strong>
      </div>

      <div class="metric-row">
        <span>영향력계수 순위</span>
        <strong>${ranks.influence.get(code)}위</strong>
      </div>

      <div class="metric-row">
        <span>감응도계수 순위</span>
        <strong>${ranks.sensitivity.get(code)}위</strong>
      </div>

      <div class="metric-row">
        <span>영향력 평균 대비</span>
        <strong>${percent(item.influence - 1)}</strong>
      </div>

      <div class="metric-row">
        <span>감응도 평균 대비</span>
        <strong>${percent(item.sensitivity - 1)}</strong>
      </div>

      <div class="interpretation">
        <strong style="color:${type.color}">
          ${type.name}
        </strong>

        <div>${type.description}</div>

        <div>
          영향력계수는 후방 연관효과,
          감응도계수는 전방 연관효과의
          상대적 크기를 나타냅니다.
        </div>
      </div>
    `;

    drawScatter();

    for (const metric of [
      "influence",
      "sensitivity"
    ]) {
      const mini = $("mini-" + metric);

      if (mini) {
        mini.textContent =
          `${item.name} · ` +
          `${METRICS[metric].title} ` +
          `${number(item[metric])} · ` +
          `전체 ${ranks[metric].get(code)}위`;
      }

      root.querySelectorAll(
        `[data-metric="${metric}"][data-code]`
      ).forEach(cell => {
        cell.classList.toggle(
          "selected",
          cell.dataset.code === code
        );
      });
    }
  }

  // ==================================================
  // 6. SVG 공통 함수
  // ==================================================

  const SVG_NS =
    "http://www.w3.org/2000/svg";

  function createSVG(tag, attributes = {}, text = null) {
    const element = document.createElementNS(
      SVG_NS,
      tag
    );

    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }

    if (text !== null) {
      element.textContent = text;
    }

    return element;
  }

  // ==================================================
  // 7. 4분면 버블 차트
  // ==================================================

  function drawScatter() {
    const svg = $("scatter");

    svg.replaceChildren();

    if (!industries.length) return;

    const plot = {
      left: 75,
      top: 34,
      width: 645,
      height: 420
    };

    const valuesX = industries.map(
      item => item.influence
    );

    const valuesY = industries.map(
      item => item.sensitivity
    );

    const minX = Math.max(
      0,
      Math.min(0.8, ...valuesX) - 0.07
    );

    const maxX =
      Math.max(1.2, ...valuesX) + 0.07;

    const minY = Math.max(
      0,
      Math.min(0.8, ...valuesY) - 0.07
    );

    const maxY =
      Math.max(1.2, ...valuesY) + 0.07;

    const scaleX = value =>
      plot.left +
      (value - minX) / (maxX - minX) * plot.width;

    const scaleY = value =>
      plot.top +
      plot.height -
      (value - minY) / (maxY - minY) * plot.height;

    const centerX = scaleX(1);
    const centerY = scaleY(1);

    // 4개 영역 배경
    const quadrants = [
      {
        x: centerX,
        y: plot.top,
        w: plot.left + plot.width - centerX,
        h: centerY - plot.top,
        fill: "#f0f1ff"
      },
      {
        x: plot.left,
        y: plot.top,
        w: centerX - plot.left,
        h: centerY - plot.top,
        fill: "#e8f8f5"
      },
      {
        x: centerX,
        y: centerY,
        w: plot.left + plot.width - centerX,
        h: plot.top + plot.height - centerY,
        fill: "#fff4e7"
      },
      {
        x: plot.left,
        y: centerY,
        w: centerX - plot.left,
        h: plot.top + plot.height - centerY,
        fill: "#fff0f3"
      }
    ];

    quadrants.forEach(area => {
      svg.appendChild(
        createSVG("rect", {
          x: area.x,
          y: area.y,
          width: Math.max(0, area.w),
          height: Math.max(0, area.h),
          fill: area.fill
        })
      );
    });

    // 눈금선
    for (let index = 0; index <= 5; index++) {
      const valueX =
        minX + (maxX - minX) * index / 5;

      const valueY =
        minY + (maxY - minY) * index / 5;

      const x = scaleX(valueX);
      const y = scaleY(valueY);

      svg.appendChild(
        createSVG("line", {
          x1: x,
          x2: x,
          y1: plot.top,
          y2: plot.top + plot.height,
          stroke: "#dce5f0"
        })
      );

      svg.appendChild(
        createSVG("line", {
          x1: plot.left,
          x2: plot.left + plot.width,
          y1: y,
          y2: y,
          stroke: "#dce5f0"
        })
      );

      svg.appendChild(
        createSVG("text", {
          x,
          y: plot.top + plot.height + 20,
          "text-anchor": "middle",
          fill: "#73849b",
          "font-size": 11
        }, valueX.toFixed(2))
      );

      svg.appendChild(
        createSVG("text", {
          x: plot.left - 10,
          y: y + 4,
          "text-anchor": "end",
          fill: "#73849b",
          "font-size": 11
        }, valueY.toFixed(2))
      );
    }

    // 기준선 1.000
    svg.appendChild(
      createSVG("line", {
        x1: centerX,
        x2: centerX,
        y1: plot.top,
        y2: plot.top + plot.height,
        stroke: "#536582",
        "stroke-width": 2,
        "stroke-dasharray": "6 5"
      })
    );

    svg.appendChild(
      createSVG("line", {
        x1: plot.left,
        x2: plot.left + plot.width,
        y1: centerY,
        y2: centerY,
        stroke: "#536582",
        "stroke-width": 2,
        "stroke-dasharray": "6 5"
      })
    );

    // 4분면 제목
    const labels = [
      {
        text: "I · 핵심 연관형",
        x: centerX + 14,
        y: plot.top + 22,
        color: TYPES[0].color
      },
      {
        text: "II · 전방 연관형",
        x: plot.left + 12,
        y: plot.top + 22,
        color: TYPES[1].color
      },
      {
        text: "IV · 후방 연관형",
        x: centerX + 14,
        y: plot.top + plot.height - 13,
        color: TYPES[2].color
      },
      {
        text: "III · 저연관형",
        x: plot.left + 12,
        y: plot.top + plot.height - 13,
        color: TYPES[3].color
      }
    ];

    labels.forEach(label => {
      svg.appendChild(
        createSVG("text", {
          x: label.x,
          y: label.y,
          fill: label.color,
          "font-size": 12,
          "font-weight": 750
        }, label.text)
      );
    });

    const search = $("search").value
      .trim()
      .toLowerCase();

    const labelMode = $("label-mode").value;

    // 선택된 점을 마지막에 그려 앞으로 표시
    const ordered = [...industries].sort(
      (a, b) =>
        Number(a.code === selectedCode) -
        Number(b.code === selectedCode)
    );

    ordered.forEach(item => {
      const isSelected =
        item.code === selectedCode;

      const isMatched =
        search &&
        `${item.name} ${item.code}`
          .toLowerCase()
          .includes(search);

      const radius =
        isSelected ? 10 :
        isMatched ? 8 : 5;

      const circle = createSVG("circle", {
        cx: scaleX(item.influence),
        cy: scaleY(item.sensitivity),
        r: radius,
        fill: TYPES[getType(item)].color,
        "fill-opacity":
          isSelected ? 1 :
          search && !isMatched ? 0.16 : 0.78,
        stroke: isSelected ? "#142b4f" : "#fff",
        "stroke-width": isSelected ? 3 : 1,
        class: "bubble",
        tabindex: 0,
        role: "button",
        "aria-label":
          `${item.name}, 영향력계수 ` +
          `${number(item.influence)}, ` +
          `감응도계수 ${number(item.sensitivity)}`
      });

      const tooltip = createSVG(
        "title",
        {},
        `${item.name} (${item.code})\n` +
        `영향력계수: ${number(item.influence)}\n` +
        `감응도계수: ${number(item.sensitivity)}`
      );

      circle.appendChild(tooltip);

      circle.addEventListener("click", () => {
        selectIndustry(item.code);
      });

      circle.addEventListener("keydown", event => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          selectIndustry(item.code);
        }
      });

      svg.appendChild(circle);

      const showName =
        isSelected ||
        isMatched ||
        (
          labelMode === "top" &&
          (
            ranks.influence.get(item.code) <= 3 ||
            ranks.sensitivity.get(item.code) <= 3
          )
        );

      if (showName && labelMode !== "none") {
        const x = Math.min(
          scaleX(item.influence) + 12,
          650
        );

        const y = Math.max(
          scaleY(item.sensitivity) - 10,
          42
        );

        svg.appendChild(
          createSVG("text", {
            x,
            y,
            fill: "#243a59",
            "font-size": isSelected ? 13 : 10,
            "font-weight": isSelected ? 800 : 650,
            stroke: "white",
            "stroke-width": 3,
            "paint-order": "stroke"
          },
          item.name.length > 14
            ? item.name.slice(0, 13) + "…"
            : item.name)
        );
      }
    });

    svg.appendChild(
      createSVG("text", {
        x: plot.left + plot.width / 2,
        y: 507,
        "text-anchor": "middle",
        fill: "#294361",
        "font-size": 13,
        "font-weight": 800
      }, "영향력계수 · 후방 연관효과")
    );

    svg.appendChild(
      createSVG("text", {
        x: 18,
        y: plot.top + plot.height / 2,
        transform:
          `rotate(-90 18 ${plot.top + plot.height / 2})`,
        "text-anchor": "middle",
        fill: "#294361",
        "font-size": 13,
        "font-weight": 800
      }, "감응도계수 · 전방 연관효과")
    );
  }

  // ==================================================
  // 8. 히트맵 색상
  // ==================================================

  function heatColor(value, min, max) {
    const ratio =
      max > min
        ? Math.max(
            0,
            Math.min(1, (value - min) / (max - min))
          )
        : 0.5;

    const light = [238, 244, 255];
    const dark = [48, 75, 175];

    const rgb = light.map((component, index) =>
      Math.round(
        component +
        (dark[index] - component) * ratio
      )
    );

    return {
      background: `rgb(${rgb.join(",")})`,
      foreground: ratio > 0.6 ? "white" : "#203755"
    };
  }

  // ==================================================
  // 9. 히트맵 셀 출력
  // ==================================================

  function renderHeatmap(metric) {
    const state = filters[metric];

    let matching = industries.filter(item =>
      `${item.name} ${item.code}`
        .toLowerCase()
        .includes(state.search)
    );

    matching.sort((a, b) => {
      if (state.sort === "asc") {
        return a[metric] - b[metric];
      }

      if (state.sort === "name") {
        return a.name.localeCompare(b.name, "ko");
      }

      return b[metric] - a[metric];
    });

    const total = matching.length;

    if (Number.isFinite(state.count)) {
      matching = matching.slice(0, state.count);
    }

    const grid = $("grid-" + metric);
    grid.replaceChildren();

    if (!matching.length) {
      grid.textContent = "검색 결과가 없습니다.";
      return;
    }

    const values = industries.map(
      item => item[metric]
    );

    const min = Math.min(...values);
    const max = Math.max(...values);

    matching.forEach(item => {
      const colors = heatColor(
        item[metric],
        min,
        max
      );

      const cell = document.createElement("button");

      cell.type = "button";
      cell.className = "heat-cell";
      cell.dataset.metric = metric;
      cell.dataset.code = item.code;

      if (selectedCode === item.code) {
        cell.classList.add("selected");
      }

      cell.style.background = colors.background;
      cell.style.color = colors.foreground;

      cell.textContent = item[metric].toFixed(2);

      cell.title =
        `${item.name} (${item.code})\n` +
        `${METRICS[metric].title}: ` +
        `${number(item[metric])}\n` +
        `전체 순위: ${ranks[metric].get(item.code)}위`;

      cell.addEventListener("click", () => {
        selectIndustry(item.code);
      });

      grid.appendChild(cell);
    });

    $("range-" + metric).textContent =
      `검색 ${total}개 · ` +
      `표시 ${matching.length}개`;
  }

  // ==================================================
  // 10. 오른쪽 보조 그래프
  // ==================================================

  function makeLineChart(metric) {
    const sorted = [...industries].sort(
      (a, b) => b[metric] - a[metric]
    );

    const width = 230;
    const height = 135;

    const padding = {
      left: 30,
      right: 10,
      top: 12,
      bottom: 25
    };

    const plotWidth =
      width - padding.left - padding.right;

    const plotHeight =
      height - padding.top - padding.bottom;

    const values = sorted.map(
      item => item[metric]
    );

    const min = Math.min(1, ...values);
    const max = Math.max(1, ...values);

    const span = max - min || 0.1;

    const getX = index =>
      padding.left +
      (
        sorted.length === 1
          ? plotWidth / 2
          : index / (sorted.length - 1) * plotWidth
      );

    const getY = value =>
      padding.top +
      (max - value) / span * plotHeight;

    const points = sorted.map((item, index) => [
      getX(index),
      getY(item[metric])
    ]);

    const path = points.map(
      ([x, y], index) =>
        `${index ? "L" : "M"}${x},${y}`
    ).join(" ");

    const area =
      path +
      ` L${getX(sorted.length - 1)},` +
      `${padding.top + plotHeight}` +
      ` L${getX(0)},${padding.top + plotHeight} Z`;

    const color = METRICS[metric].color;

    return `
      <svg
        viewBox="0 0 ${width} ${height}"
        role="img"
        aria-label="${METRICS[metric].title} 순위별 분포">

        <path
          d="${area}"
          fill="${color}"
          fill-opacity=".10">
        </path>

        <line
          x1="${padding.left}"
          x2="${padding.left + plotWidth}"
          y1="${getY(1)}"
          y2="${getY(1)}"
          stroke="#abb7c7"
          stroke-dasharray="4 4">
        </line>

        <path
          d="${path}"
          fill="none"
          stroke="${color}"
          stroke-width="2.7"
          stroke-linejoin="round">
        </path>

        <text
          x="${padding.left}"
          y="${height - 5}"
          font-size="10"
          fill="#76879e">
          1위
        </text>

        <text
          x="${padding.left + plotWidth}"
          y="${height - 5}"
          text-anchor="end"
          font-size="10"
          fill="#76879e">
          ${sorted.length}위
        </text>
      </svg>
    `;
  }

  // ==================================================
  // 11. 개별 히트맵 카드 생성
  // ==================================================

  function createHeatmap(metric) {
    const info = METRICS[metric];

    const section = document.createElement("section");

    section.className = "heat-section";

    section.innerHTML = `
      <div class="section-label">
        ${info.english}
      </div>

      <h3>${info.title} 히트맵</h3>

      <div class="controls" style="margin-top:12px">

        <input
          id="ii-search-${metric}"
          type="search"
          placeholder="산업명 / 코드">

        <select id="ii-sort-${metric}">
          <option value="desc">계수 높은 순</option>
          <option value="asc">계수 낮은 순</option>
          <option value="name">산업명 순</option>
        </select>

        <select id="ii-limit-${metric}">
          <option value="40">40개</option>
          <option value="100" selected>100개</option>
          <option value="200">200개</option>
          <option value="all">전체</option>
        </select>

      </div>

      <div
        class="heat-grid"
        id="ii-grid-${metric}">
      </div>

      <div class="heat-info">
        <span id="ii-range-${metric}"></span>
        <span>왼쪽부터 정렬된 산업 순서</span>
      </div>

      <div class="gradient-legend">
        <span>낮음</span>
        <div class="gradient"></div>
        <span>높음</span>
      </div>
    `;

    $("heatmaps").appendChild(section);

    $("search-" + metric).addEventListener(
      "input",
      event => {
        filters[metric].search =
          event.target.value.toLowerCase().trim();

        renderHeatmap(metric);
      }
    );

    $("sort-" + metric).addEventListener(
      "change",
      event => {
        filters[metric].sort = event.target.value;
        renderHeatmap(metric);
      }
    );

    $("limit-" + metric).addEventListener(
      "change",
      event => {
        filters[metric].count =
          event.target.value === "all"
            ? Infinity
            : Number(event.target.value);

        renderHeatmap(metric);
      }
    );

    renderHeatmap(metric);
  }

  // ==================================================
  // 12. 전체 분석 결과 출력
  // ==================================================

  function renderDashboard() {
    ranks = {
      influence: calculateRanking("influence"),
      sensitivity: calculateRanking("sensitivity")
    };

    const average = metric =>
      industries.reduce(
        (total, item) => total + item[metric],
        0
      ) / industries.length;

    $("count").textContent =
      industries.length.toLocaleString("ko-KR");

    $("inf-average").textContent =
      number(average("influence"));

    $("sen-average").textContent =
      number(average("sensitivity"));

    $("core-count").textContent =
      industries.filter(
        item => getType(item) === 0
      ).length + "개";

    $("legend").innerHTML = TYPES.map(
      (type, index) => {
        const count = industries.filter(
          item => getType(item) === index
        ).length;

        return `
          <span>
            <span
              class="legend-dot"
              style="background:${type.color}">
            </span>
            ${escapeHTML(type.name)} ${count}개
          </span>
        `;
      }
    ).join("");

    $("heatmaps").replaceChildren();
    $("side-charts").replaceChildren();

    for (const metric of [
      "influence",
      "sensitivity"
    ]) {
      createHeatmap(metric);

      const chart = document.createElement("section");
      chart.className = "side-chart";

      chart.innerHTML = `
        <h4>${METRICS[metric].title} 분포</h4>

        <p class="description">
          가로축: 산업 순위<br>
          세로축: 계수
        </p>

        ${makeLineChart(metric)}

        <div
          class="mini-detail"
          id="ii-mini-${metric}">
          산업을 클릭하면 계수와 순위가 표시됩니다.
        </div>
      `;

      $("side-charts").appendChild(chart);
    }

    $("results").hidden = false;

    selectedCode = null;

    $("detail").innerHTML = `
      <div class="detail-label">
        SELECTED INDUSTRY
      </div>

      <div class="detail-name">
        원이나 셀을 클릭해 주세요.
      </div>

      <div class="detail-code">
        산업명 · 산업코드 · 계수 · 순위 · 유형
      </div>
    `;

    drawScatter();
  }

  // ==================================================
  // 13. 검색 및 실행 이벤트
  // ==================================================

  $("search").addEventListener(
    "input",
    drawScatter
  );

  $("label-mode").addEventListener(
    "change",
    drawScatter
  );

  $("run").addEventListener(
    "click",
    async () => {
      if (typeof call !== "function") {
        $("status").textContent =
          "기존 분석 함수(call)를 찾지 못했습니다.";
        return;
      }

      const current = ++requestVersion;
      const button = $("run");

      button.disabled = true;

      $("status").textContent =
        "영향력계수와 감응도계수 분석 중…";

      try {
        const result = await call("analyze", {});

        if (current !== requestVersion) return;

        industries = normalize(result);

        selectedCode = null;

        for (const metric of [
          "influence",
          "sensitivity"
        ]) {
          filters[metric] = {
            search: "",
            sort: "desc",
            count: 100
          };
        }

        $("search").value = "";
        $("label-mode").value = "selected";

        renderDashboard();

        $("status").textContent =
          `분석 완료 · ${industries.length}개 산업 · ` +
          "4분면 맵과 듀얼 히트맵 준비됨";

      } catch (error) {
        if (current === requestVersion) {
          $("status").textContent =
            "분석 실패: " +
            (error?.message || String(error));
        }
      } finally {
        button.disabled = false;
      }
    }
  );

})();
