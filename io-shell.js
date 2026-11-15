
/*
  IO INTELLIGENCE
  UI 전용 기능

  기존 app.js, worker.js, model.py 수정 없음
*/

(() => {
  "use strict";

  const q = selector =>
    document.querySelector(selector);

  const node = (tag, className, value) => {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (value !== undefined) {
      element.textContent = value;
    }

    return element;
  };

  const fmt = value =>
    Number(value).toFixed(4);

  const escape = value =>
    String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  const STORE = "io-intelligence-2026";

  const loadStore = () => {
    try {
      return JSON.parse(
        localStorage.getItem(STORE)
      ) || {};
    } catch {
      return {};
    }
  };

  const saved = loadStore();

  const state = {
    rows: [],
    selection: new Set(),
    favorites: saved.favorites || {},
    history: saved.history || [],
    scraps: saved.scraps || [],
    generation: 0,
    active: "home"
  };

  const persist = () => {
    try {
      localStorage.setItem(
        STORE,
        JSON.stringify({
          favorites: state.favorites,
          history: state.history.slice(0, 15),
          scraps: state.scraps.slice(0, 30)
        })
      );
    } catch {}
  };

  const views = [
    ["home", "⌂", "홈 대시보드"],
    ["explorer", "▦", "원자료 탐색"],
    ["quadrant", "◉", "4분면 맵"],
    ["dual", "▦", "산업연관 지표 종합 분석"],
    ["treemap", "▥", "산업 트리맵"],
    ["compare", "⇄", "산업 비교 분석"],
    ["ranking", "▥", "산업 순위 분석"],
    ["types", "◫", "산업 유형별 구조"],
    ["simulation", "⚙", "수요충격 시뮬레이터"],
    ["detail", "◎", "산업 상세 분석"],
    ["legacy", "☷", "기존 분석표"]
  ];

  const rightTabs = [
    ["market", "▥", "산업시장"],
    ["favorites", "☆", "관심"],
    ["history", "◷", "기록"],
    ["scraps", "▤", "스크랩"]
  ];

  const groupNames = [
    "핵심 연관형",
    "전방 연관형",
    "후방 연관형",
    "상대적 저연관형"
  ];

  const metricNames = {
    influence: "영향력계수",
    sensitivity: "감응도계수"
  };

  const groupOf = r => {
    if (
      r.influence >= 1 &&
      r.sensitivity >= 1
    ) return 0;

    if (
      r.influence < 1 &&
      r.sensitivity >= 1
    ) return 1;

    if (
      r.influence >= 1 &&
      r.sensitivity < 1
    ) return 2;

    return 3;
  };

  const classification = () =>
    q("#io-classification")?.value || "basic";

  const classifyName = () =>
    q("#io-classification")
      ?.selectedOptions[0]
      ?.textContent || "기본부문";

  const favorites = () =>
    state.favorites[classification()] || [];

  const ready = () =>
    state.rows.length > 0 &&
    !q("#sheet")?.disabled;

  // =========================================
  // 1. 웹앱 기본 레이아웃
  // =========================================

  const app = node("div");
  app.id = "io-app";
  app.dataset.view = "home";

  const left = node("aside", "io-left");

  left.innerHTML = `
    <div class="io-logo">
      <span class="io-logo-mark">IO</span>
      <span>
        INTELLIGENCE
        <small class="io-sub">
          INPUT · OUTPUT 2023
        </small>
      </span>
    </div>

    <div class="io-menu-label">
      분석 도구
    </div>
  `;

  views.forEach(([id, icon, title], index) => {
    if (index === 5 || index === 8) {
      left.append(
        node(
          "div",
          "io-menu-label",
          index === 5 ? "심화 분석" : "경제 분석"
        )
      );
    }

    const button = node("button", "io-menu");

    button.type = "button";
    button.dataset.goto = id;

    button.innerHTML = `
      <span aria-hidden="true">${icon}</span>
      ${escape(title)}
    `;

    button.addEventListener("click", () => {
      navigate(id);
    });

    left.append(button);
  });

  const main = node("div", "io-main");

  const top = node("div", "io-top");

  top.innerHTML = `
    <span class="io-breadcrumb" id="io-crumb">
      홈 / 대시보드
    </span>

    <span class="io-date">
      2023년 산업연관표 · 생산자가격
    </span>
  `;

  const config = node("div", "io-config");

  config.innerHTML = `
    <div class="io-file-choice">
      <strong>분석할 산업분류</strong>
      <div id="io-select-here"></div>
    </div>

    <div id="io-load-here"></div>

    <div
      class="io-file-status"
      id="io-file-status"
      role="status">
      상단에서 산업분류를 선택하고
      자료를 불러오세요.
    </div>
  `;

  main.append(top, config);

  const content = node("div", "io-content");

  main.append(content);

  const viewNodes = {};

  const viewTitles = {
    home: "홈 대시보드",
    explorer: "원자료 탐색",
    quadrant: "산업연관 4분면 맵",
    dual: "산업연관 지표 종합 분석",
    treemap: "산업별 트리맵",
    compare: "관심 산업 비교 분석",
    ranking: "산업별 순위 분석",
    types: "산업 유형별 구조 분석",
    simulation: "국내 최종수요 시뮬레이터",
    detail: "산업 상세 분석",
    legacy: "원래 산업 분석표"
  };

  Object.keys(viewTitles).forEach(id => {
    const view = node("div", "io-view");
    view.id = "io-view-" + id;

    const heading = node("div", "io-pagehead");

    heading.innerHTML = `
      <h1>${viewTitles[id]}</h1>
      <p>
        2023년 산업연관표 ·
        ${
          id === "home"
            ? "산업 구조를 직관적으로 살펴보세요."
            : "현재 불러온 산업분류 데이터 기준"
        }
      </p>
    `;

    view.append(heading);

    content.append(view);

    viewNodes[id] = view;
  });

  // =========================================
  // 2. 오른쪽 메뉴
  // =========================================

  const right = node("aside", "io-right");

  right.setAttribute(
    "aria-label",
    "관심 분석 도구"
  );

  rightTabs.forEach(([id, icon, title]) => {
    const button = node("button");

    button.type = "button";
    button.dataset.drawer = id;

    button.setAttribute(
      "aria-label",
      title
    );

    button.setAttribute(
      "aria-pressed",
      "false"
    );

    button.innerHTML = `
      <b aria-hidden="true">${icon}</b>
      ${title}
    `;

    button.addEventListener("click", () => {
      openDrawer(id);
    });

    right.append(button);
  });

  const drawer = node("aside", "io-drawer");

  drawer.hidden = true;

  drawer.innerHTML = `
    <div class="io-drawer-top">
      <h2 id="io-drawer-title"></h2>

      <button
        id="io-drawer-close"
        type="button">
        닫기 ✕
      </button>
    </div>

    <div id="io-drawer-body"></div>
  `;

  app.append(left, main, right, drawer);

  document.body.append(app);

  q("#io-drawer-close").addEventListener(
    "click",
    () => openDrawer(null)
  );

  // =========================================
  // 3. 기존 기능 이동
  // =========================================

  // 기존 버튼은 복제하지 않고 이동한다.
  // 이렇게 해야 app.js의 이벤트가 유지된다.

  const select = q("#io-classification");
  const loadButton = q("#load-basic");

  if (select) {
    q("#io-select-here").append(select);
  }

  if (loadButton) {
    q("#io-load-here").append(loadButton);

    loadButton.textContent =
      classifyName() + " 불러오기";
  }

  const move = (id, destination) => {
    const element = q("#" + id);

    if (element) {
      viewNodes[destination].append(element);
    }
  };

  move("explorer", "explorer");
  move("simulation", "simulation");
  move("industry-analysis", "legacy");
  move("industry-detail", "detail");
  move("industry-heatmap", "quadrant");
  move("industry-treemap", "treemap");

  const heat = q("#industry-heatmap");

  const originalMain = q("body > main");

  const originalStatus = originalMain
    ?.querySelector(".loading-status");

  if (originalStatus) {
    viewNodes.home.append(originalStatus);
  }

  if (originalMain) {
    originalMain
      .querySelectorAll(":scope > section")
      .forEach(element => {
        viewNodes.legacy.append(element);
      });
  }

  // =========================================
  // 4. 홈 화면
  // =========================================

  const homeCards = node("div", "io-stats");
  homeCards.id = "io-home-stats";

  viewNodes.home.prepend(homeCards);

  const homeContent = node("div", "io-two");

  homeContent.innerHTML = `
    <article class="io-block">
      <h3>영향력계수 상위 산업</h3>

      <div
        id="io-home-inf"
        class="io-help">
        산업분류를 불러온 후 지표를 분석하세요.
      </div>
    </article>

    <article class="io-block">
      <h3>감응도계수 상위 산업</h3>

      <div
        id="io-home-sen"
        class="io-help">
        산업분류를 불러온 후 지표를 분석하세요.
      </div>
    </article>
  `;

  viewNodes.home.insertBefore(
    homeContent,
    originalStatus || null
  );

  const homeHelp = node("div", "io-block");

  homeHelp.innerHTML = `
    <h3>산업연관분석 시작하기</h3>

    <p class="io-help">
      ① 상단에서 산업분류를 선택하고 Excel을 불러옵니다.
      ② 왼쪽 메뉴에서 원하는 분석을 선택합니다.
      ③ 영향력계수와 감응도계수를 비교합니다.
      ④ 관심 산업을 저장하고 상세 분석을 확인합니다.
    </p>

    <button
      class="io-primary"
      id="io-home-start"
      type="button">
      산업분류 분석 시작 →
    </button>
  `;

  viewNodes.home.insertBefore(
    homeHelp,
    homeContent
  );

  q("#io-home-start").onclick = () => {
    navigate("quadrant");
  };

  // =========================================
  // 5. 산업 비교 화면
  // =========================================

  const comparePanel = node("div", "io-block");

  comparePanel.innerHTML = `
    <h3>산업 2~5개 비교</h3>

    <p class="io-help">
      원하는 산업을 추가하거나
      관심 산업 목록에서 가져오세요.
    </p>

    <div class="io-toolbar">
      <label>
        산업 선택
        <select id="io-compare-select"></select>
      </label>

      <button
        class="io-primary"
        id="io-compare-add"
        type="button">
        비교 목록에 추가
      </button>

      <button
        class="io-soft"
        id="io-compare-fav"
        type="button">
        관심 산업 가져오기
      </button>
    </div>

    <p
      class="io-help"
      id="io-compare-message">
    </p>

    <div
      id="io-compare-tags"
      class="io-toolbar">
    </div>

    <div
      class="io-tablewrap"
      id="io-compare-table">
    </div>
  `;

  viewNodes.compare.append(comparePanel);

  // =========================================
  // 6. 산업 순위 화면
  // =========================================

  const rankingPanel = node("div", "io-block");

  rankingPanel.innerHTML = `
    <div class="io-toolbar">
      <label>
        분석 계수
        <select id="io-rank-metric">
          <option value="influence">영향력계수</option>
          <option value="sensitivity">감응도계수</option>
        </select>
      </label>

      <label>
        정렬 방식
        <select id="io-rank-direction">
          <option value="desc">높은 순</option>
          <option value="asc">낮은 순</option>
        </select>
      </label>

      <label>
        표시 개수
        <select id="io-rank-limit">
          <option>10</option>
          <option selected>20</option>
          <option>40</option>
          <option value="all">전체 산업</option>
        </select>
      </label>

      <label>
        산업 검색
        <input
          id="io-rank-search"
          type="search"
          placeholder="산업명 또는 코드">
      </label>
    </div>

    <div id="io-rank-bars"></div>

    <div
      class="io-tablewrap"
      id="io-rank-table">
    </div>
  `;

  viewNodes.ranking.append(rankingPanel);

  // =========================================
  // 7. 산업 유형 분석
  // =========================================

  const typePanel = node("div", "io-block");

  typePanel.innerHTML = `
    <p class="io-help">
      영향력계수와 감응도계수의 기준값 1을 이용해
      산업을 네 유형으로 구분합니다.
    </p>

    <div
      id="io-type-stats"
      class="io-stats">
    </div>

    <div id="io-type-bars"></div>

    <div class="io-toolbar">
      <label>
        산업 유형
        <select id="io-type-filter">
          <option value="all">전체 유형</option>
          <option value="0">핵심 연관형</option>
          <option value="1">전방 연관형</option>
          <option value="2">후방 연관형</option>
          <option value="3">상대적 저연관형</option>
        </select>
      </label>
    </div>

    <div
      id="io-type-table"
      class="io-tablewrap">
    </div>
  `;

  viewNodes.types.append(typePanel);

  const unavailable = node(
    "div",
    "io-block",
    "트리맵 파일을 불러오지 못했습니다. " +
    "industry-treemap.js의 배포 경로를 확인해 주세요."
  );

  unavailable.id = "io-treemap-missing";
  unavailable.hidden = true;

  viewNodes.treemap.append(unavailable);

  // =========================================
  // 8. 분석용 공통 함수
  // =========================================

  function metricRank(metric) {
    const sorted = [...state.rows].sort(
      (a, b) => b[metric] - a[metric]
    );

    const ranks = new Map();

    sorted.forEach((r, i) => {
      const previous = sorted[i - 1];

      ranks.set(
        r.code,
        i > 0 &&
        previous[metric] === r[metric]
          ? ranks.get(previous.code)
          : i + 1
      );
    });

    return ranks;
  }

  function table(headers, records, onClick) {
    const element = node("table");
    const thead = node("thead");
    const headerRow = node("tr");

    headers.forEach(header => {
      headerRow.append(node("th", null, header));
    });

    thead.append(headerRow);
    element.append(thead);

    const tbody = node("tbody");

    records.forEach(record => {
      const tr = node("tr");

      record.forEach(value => {
        tr.append(node("td", null, value));
      });

      if (onClick) {
        tr.addEventListener("click", () => {
          onClick(record);
        });
      }

      tbody.append(tr);
    });

    element.append(tbody);

    return element;
  }

  function badgeStats() {
    const n = state.rows.length;

    const core = state.rows.filter(
      r => r.influence >= 1 &&
        r.sensitivity >= 1
    ).length;

    const avg = metric =>
      n
        ? state.rows.reduce(
            (sum, r) => sum + r[metric],
            0
          ) / n
        : 0;

    const metrics = [
      [
        "분석 산업",
        n ? n + "개" : "—",
        "현재 산업분류"
      ],
      [
        "영향력계수 평균",
        n ? fmt(avg("influence")) : "—",
        "후방 연관효과"
      ],
      [
        "감응도계수 평균",
        n ? fmt(avg("sensitivity")) : "—",
        "전방 연관효과"
      ],
      [
        "핵심 연관형",
        n ? core + "개" : "—",
        "두 계수 모두 1 이상"
      ]
    ];

    homeCards.replaceChildren(
      ...metrics.map(([label, value, note]) => {
        const card = node("div", "io-stat");

        card.innerHTML = `
          <small>${label}</small>
          <strong>${value}</strong>
          <em>${note}</em>
        `;

        return card;
      })
    );
  }

  function barList(rows, metric, limit = 7) {
    const wrap = node("div");

    const max = Math.max(
      ...rows.map(r => r[metric]),
      1
    );

    rows.slice(0, limit).forEach(r => {
      const line = node("div", "io-barline");

      const name = node(
        "span",
        "name",
        r.name
      );

      const track = node("div", "io-track");

      const fill = node(
        "div",
        "io-fill" +
        (metric === "sensitivity" ? " teal" : "")
      );

      fill.style.width =
        (r[metric] / max * 100) + "%";

      track.append(fill);

      line.append(
        name,
        track,
        node("strong", null, fmt(r[metric]))
      );

      line.tabIndex = 0;
      line.style.cursor = "pointer";

      line.title =
        "클릭하면 산업 상세 분석으로 이동";

      line.onclick = () => {
        openIndustry(r.code);
      };

      line.onkeydown = event => {
        if (event.key === "Enter") {
          openIndustry(r.code);
        }
      };

      wrap.append(line);
    });

    return wrap;
  }

  // =========================================
  // 9. 홈 데이터 출력
  // =========================================

  function renderHome() {
    badgeStats();

    if (!ready()) return;

    const pairs = [
      ["io-home-inf", "influence"],
      ["io-home-sen", "sensitivity"]
    ];

    pairs.forEach(([id, metric]) => {
      const target = q("#" + id);

      target.replaceChildren(
        barList(
          [...state.rows].sort(
            (a, b) => b[metric] - a[metric]
          ),
          metric
        )
      );
    });
  }

  // =========================================
  // 10. 산업 비교
  // =========================================

  function refreshCompareOptions() {
    const select = q("#io-compare-select");

    select.replaceChildren(
      ...state.rows.map(r => {
        const option = node(
          "option",
          null,
          r.name + " (" + r.code + ")"
        );

        option.value = r.code;

        return option;
      })
    );
  }

  function renderCompare() {
    const tags = q("#io-compare-tags");
    const body = q("#io-compare-table");

    tags.replaceChildren();
    body.replaceChildren();

    const chosen = [...state.selection]
      .map(code =>
        state.rows.find(r => r.code === code)
      )
      .filter(Boolean);

    chosen.forEach(r => {
      const button = node(
        "button",
        "io-soft",
        r.name + " ×"
      );

      button.type = "button";

      button.onclick = () => {
        state.selection.delete(r.code);
        renderCompare();
      };

      tags.append(button);
    });

    if (!chosen.length) {
      body.append(
        node(
          "p",
          "io-help",
          "산업을 선택해 주세요."
        )
      );

      return;
    }

    const influenceRanks =
      metricRank("influence");

    const sensitivityRanks =
      metricRank("sensitivity");

    body.append(
      table(
        [
          "산업",
          "영향력계수",
          "영향력 순위",
          "감응도계수",
          "감응도 순위",
          "산업 유형"
        ],
        chosen.map(r => [
          r.name,
          fmt(r.influence),
          influenceRanks.get(r.code) + "위",
          fmt(r.sensitivity),
          sensitivityRanks.get(r.code) + "위",
          groupNames[groupOf(r)]
        ])
      )
    );
  }

  q("#io-compare-add").onclick = () => {
    if (!ready()) return;

    const code =
      q("#io-compare-select").value;

    if (!code) return;

    if (
      !state.selection.has(code) &&
      state.selection.size >= 5
    ) {
      q("#io-compare-message").textContent =
        "최대 5개 산업까지 비교할 수 있습니다.";

      return;
    }

    state.selection.add(code);

    q("#io-compare-message").textContent = "";

    renderCompare();
  };

  q("#io-compare-fav").onclick = () => {
    if (!ready()) return;

    for (const code of favorites()) {
      if (state.selection.size >= 5) break;

      if (
        state.rows.some(r => r.code === code)
      ) {
        state.selection.add(code);
      }
    }

    renderCompare();
  };

  // =========================================
  // 11. 산업 순위
  // =========================================

  function renderRanking() {
    const host = q("#io-rank-bars");
    const result = q("#io-rank-table");

    host.replaceChildren();
    result.replaceChildren();

    if (!ready()) return;

    const metric =
      q("#io-rank-metric").value;

    const direction =
      q("#io-rank-direction").value;

    const limit =
      q("#io-rank-limit").value;

    const search =
      q("#io-rank-search")
        .value.trim().toLowerCase();

    const ranks = metricRank(metric);

    let ordered = state.rows.filter(r =>
      (r.name + " " + r.code)
        .toLowerCase()
        .includes(search)
    );

    ordered.sort((a, b) =>
      direction === "asc"
        ? a[metric] - b[metric]
        : b[metric] - a[metric]
    );

    if (limit !== "all") {
      ordered = ordered.slice(
        0,
        Number(limit)
      );
    }

    host.append(
      barList(
        ordered,
        metric,
        Math.min(20, ordered.length)
      )
    );

    result.append(
      table(
        [
          "전체 순위",
          "산업코드",
          "산업명",
          metricNames[metric],
          "평균 대비"
        ],
        ordered.map(r => [
          ranks.get(r.code) + "위",
          r.code,
          r.name,
          fmt(r[metric]),
          ((r[metric] - 1) * 100).toFixed(1) + "%"
        ]),
        record => openIndustry(record[1])
      )
    );
  }

  [
    "io-rank-metric",
    "io-rank-direction",
    "io-rank-limit",
    "io-rank-search"
  ].forEach(id => {
    q("#" + id).addEventListener(
      "input",
      renderRanking
    );
  });

  // =========================================
  // 12. 산업 유형 분석
  // =========================================

  function renderTypes() {
    const stats = q("#io-type-stats");
    const bars = q("#io-type-bars");
    const list = q("#io-type-table");

    stats.replaceChildren();
    bars.replaceChildren();
    list.replaceChildren();

    if (!ready()) return;

    const n = state.rows.length;

    const counts = groupNames.map(
      (_, index) =>
        state.rows.filter(
          r => groupOf(r) === index
        ).length
    );

    counts.forEach((count, index) => {
      const card = node("div", "io-stat");

      card.innerHTML = `
        <small>${groupNames[index]}</small>
        <strong>${count}개</strong>
        <em>${(count / n * 100).toFixed(1)}%</em>
      `;

      stats.append(card);

      const line = node("div", "io-barline");

      const track = node("div", "io-track");

      const colors = [
        "io-fill",
        "io-fill teal",
        "io-fill orange",
        "io-fill pink"
      ];

      const fill = node(
        "div",
        colors[index]
      );

      fill.style.width =
        (100 * count / n) + "%";

      track.append(fill);

      line.append(
        node("span", "name", groupNames[index]),
        track,
        node(
          "strong",
          null,
          (count / n * 100).toFixed(1) + "%"
        )
      );

      bars.append(line);
    });

    const filter =
      q("#io-type-filter").value;

    const ordered = [...state.rows]
      .filter(r =>
        filter === "all" ||
        groupOf(r) === Number(filter)
      )
      .sort(
        (a, b) => b.influence - a.influence
      );

    list.append(
      table(
        [
          "산업코드",
          "산업명",
          "영향력계수",
          "감응도계수",
          "산업 유형"
        ],
        ordered.map(r => [
          r.code,
          r.name,
          fmt(r.influence),
          fmt(r.sensitivity),
          groupNames[groupOf(r)]
        ]),
        record => openIndustry(record[0])
      )
    );
  }

  q("#io-type-filter").onchange =
    renderTypes;

  // =========================================
  // 13. 데이터 갱신
  // =========================================

  function renderData() {
    renderHome();
    refreshCompareOptions();
    renderCompare();
    renderRanking();
    renderTypes();

    if (!drawer.hidden) {
      renderDrawer();
    }
  }

  async function analyze() {
    if (q("#sheet")?.disabled) {
      q("#io-file-status").textContent =
        "먼저 Excel을 불러오세요.";

      return;
    }

    const version = ++state.generation;

    q("#io-file-status").textContent =
      "현재 산업분류의 계수 분석 중…";

    try {
      const result =
        await call("analyze", {});

      if (version !== state.generation) {
        return;
      }

      if (
        !Array.isArray(result?.results) ||
        !result.results.length
      ) {
        throw Error(
          "분석 결과가 비어 있습니다."
        );
      }

      const rows = result.results.map(r => ({
        code: String(r.code),
        name: String(r.name),
        influence: Number(r.influence),
        sensitivity: Number(r.sensitivity)
      }));

      if (rows.some(r =>
        !Number.isFinite(r.influence) ||
        !Number.isFinite(r.sensitivity)
      )) {
        throw Error(
          "계수가 유효하지 않습니다."
        );
      }

      state.rows = rows;
      state.selection.clear();

      q("#io-file-status").textContent =
        classifyName() +
        " · " +
        rows.length +
        "개 산업 · 분석 준비 완료";

      renderData();

    } catch (error) {
      if (version === state.generation) {
        q("#io-file-status").textContent =
          "분석 결과 준비 실패: " +
          error.message;
      }
    }
  }

  function invalidate() {
    state.generation++;
    state.rows = [];
    state.selection.clear();

    q("#io-file-status").textContent =
      "새 분류를 선택했습니다. Excel을 불러오세요.";

    q("#io-home-inf").textContent =
      "현재 산업분류 데이터를 불러오세요.";

    q("#io-home-sen").textContent =
      "현재 산업분류 데이터를 불러오세요.";

    renderData();
  }

  // 기존 Excel 불러오기 버튼 실행 감지
  let loadObserver = null;

  if (loadButton) {
    loadButton.addEventListener(
      "click",
      () => {
        invalidate();

        if (loadObserver) {
          loadObserver.disconnect();
        }

        const sheet = q("#sheet");

        if (!sheet) return;

        loadObserver = new MutationObserver(
          () => {
            if (!sheet.disabled) {
              loadObserver.disconnect();
              loadObserver = null;

              analyze();
            }
          }
        );

        loadObserver.observe(sheet, {
          attributes: true,
          attributeFilter: ["disabled"]
        });
      },
      true
    );
  }

  if (select) {
    select.addEventListener(
      "change",
      invalidate
    );
  }

  // =========================================
  // 14. 화면 이동
  // =========================================

  function navigate(id) {
    state.active = id;
    app.dataset.view = id;

    Object.entries(viewNodes).forEach(
      ([key, element]) => {
        element.classList.toggle(
          "io-active",
          key === id
        );
      }
    );

    if (heat) {
      if (id === "quadrant") {
        viewNodes.quadrant.append(heat);
      }

      if (id === "dual") {
        viewNodes.dual.append(heat);
      }
    }

    q("#io-crumb").textContent =
      "산업 분석 / " + viewTitles[id];

    left.querySelectorAll(
      "[data-goto]"
    ).forEach(button => {
      button.setAttribute(
        "aria-current",
        button.dataset.goto === id
          ? "page"
          : "false"
      );
    });

    if (
      id === "treemap" &&
      !q("#industry-treemap")
    ) {
      unavailable.hidden = false;
    }

    if (
      ["compare", "ranking", "types", "home"]
        .includes(id) &&
      !ready() &&
      !q("#sheet")?.disabled
    ) {
      analyze();
    }

    window.scrollTo({
      top: 0,
      behavior: "instant"
    });
  }

  // =========================================
  // 15. 산업 상세 이동
  // =========================================

  function openIndustry(code) {
    navigate("detail");

    const input = q("#id-search");
    const select = q("#id-sector");

    if (
      input &&
      !input.disabled &&
      select
    ) {
      const found = state.rows.find(
        r => r.code === code
      );

      input.value = found?.name || "";

      input.dispatchEvent(
        new Event(
          "input",
          { bubbles: true }
        )
      );

      select.value = code;

      select.dispatchEvent(
        new Event(
          "change",
          { bubbles: true }
        )
      );

    } else {
      q("#io-file-status").textContent =
        "산업별 상세 화면에서 " +
        "현재 분류 분석자료를 먼저 불러오세요.";
    }
  }

  // =========================================
  // 16. 관심 산업
  // =========================================

  function toggleFavorite(code) {
    const current = favorites();

    state.favorites[classification()] =
      current.includes(code)
        ? current.filter(
            item => item !== code
          )
        : [...current, code];

    persist();
    renderDrawer();
  }

  // =========================================
  // 17. 오른쪽 패널
  // =========================================

  function renderDrawer() {
    const type = drawer.dataset.type;
    const body = q("#io-drawer-body");

    body.replaceChildren();

    q("#io-drawer-title").textContent =
      rightTabs.find(
        item => item[0] === type
      )?.[2] || "";

    // 산업시장
    if (type === "market") {
      if (!ready()) {
        body.append(
          node(
            "p",
            "io-help",
            "자료를 불러오면 산업별 TOP 10을 볼 수 있습니다."
          )
        );

        return;
      }

      for (const metric of [
        "influence",
        "sensitivity"
      ]) {
        body.append(
          node(
            "h3",
            null,
            metricNames[metric] + " TOP 10"
          )
        );

        const ordered = [...state.rows]
          .sort(
            (a, b) => b[metric] - a[metric]
          )
          .slice(0, 10);

        ordered.forEach((r, index) => {
          const item = node(
            "div",
            "io-drawer-item"
          );

          item.append(
            node(
              "span",
              null,
              (index + 1) +
              ". " +
              r.name +
              " · " +
              fmt(r[metric])
            )
          );

          const button = node(
            "button",
            null,
            "보기"
          );

          button.onclick = () =>
            openIndustry(r.code);

          item.append(button);
          body.append(item);
        });
      }
    }

    // 관심 산업
    else if (type === "favorites") {
      const all = favorites();

      const select = node("select");
      select.style.width = "100%";

      state.rows.forEach(r => {
        const option = node(
          "option",
          null,
          r.name
        );

        option.value = r.code;
        select.append(option);
      });

      body.append(select);

      const add = node(
        "button",
        "io-primary",
        "☆ 관심 산업 추가"
      );

      add.style.margin = "8px 0";

      add.onclick = () => {
        if (select.value) {
          toggleFavorite(select.value);
        }
      };

      body.append(add);

      if (!all.length) {
        body.append(
          node(
            "p",
            "io-help",
            "관심 산업을 추가하면 이 브라우저에 목록이 저장됩니다."
          )
        );
      }

      all.forEach(code => {
        const r = state.rows.find(
          item => item.code === code
        );

        const item = node(
          "div",
          "io-drawer-item"
        );

        item.append(
          node(
            "span",
            null,
            r
              ? (
                  r.name +
                  " · " +
                  fmt(r.influence) +
                  " / " +
                  fmt(r.sensitivity)
                )
              : code + " (다른 분류)"
          )
        );

        const button = node(
          "button",
          null,
          "해제"
        );

        button.onclick = () => {
          toggleFavorite(code);
        };

        item.append(button);
        body.append(item);
      });

      const compare = node(
        "button",
        "io-primary",
        "관심 산업 비교하기"
      );

      compare.onclick = () => {
        openDrawer(null);
        navigate("compare");
        q("#io-compare-fav").click();
      };

      body.append(compare);
    }

    // 분석기록
    else if (type === "history") {
      if (!state.history.length) {
        body.append(
          node(
            "p",
            "io-help",
            "수요충격 시뮬레이션을 실행하면 최근 결과의 요약이 기록됩니다."
          )
        );
      }

      state.history.forEach(r => {
        const item = node(
          "div",
          "io-drawer-item"
        );

        item.append(
          node(
            "span",
            null,
            r.date + " · " + r.label
          )
        );

        body.append(item);
      });
    }

    // 스크랩
    else if (type === "scraps") {
      const snap = node(
        "button",
        "io-primary",
        "현재 분석 화면 스크랩"
      );

      snap.onclick = () => {
        const name =
          viewTitles[state.active];

        state.scraps.unshift({
          name,
          classification: classifyName(),
          date: new Date().toLocaleString("ko-KR")
        });

        persist();
        renderDrawer();
      };

      body.append(snap);

      if (!state.scraps.length) {
        body.append(
          node(
            "p",
            "io-help",
            "현재 화면의 제목과 산업분류 정보를 저장할 수 있습니다. 차트 이미지 저장은 아직 지원하지 않습니다."
          )
        );
      }

      state.scraps.forEach((scrap, index) => {
        const item = node(
          "div",
          "io-drawer-item"
        );

        item.append(
          node(
            "span",
            null,
            scrap.name +
            " · " +
            scrap.classification +
            " · " +
            scrap.date
          )
        );

        const button = node(
          "button",
          null,
          "삭제"
        );

        button.onclick = () => {
          state.scraps.splice(index, 1);
          persist();
          renderDrawer();
        };

        item.append(button);
        body.append(item);
      });
    }
  }

  function openDrawer(id) {
    drawer.hidden = !id;
    drawer.dataset.type = id || "";

    right.querySelectorAll(
      "[data-drawer]"
    ).forEach(button => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.drawer === id)
      );
    });

    if (id) {
      renderDrawer();
    }
  }

  // =========================================
  // 18. 시뮬레이션 기록
  // =========================================

  const simStatus = q("#sim-status");

  let lastResultMarker = "";

  if (simStatus) {
    new MutationObserver(() => {
      if (
        !simStatus.textContent.includes("계산 완료")
      ) {
        return;
      }

      const marker =
        simStatus.textContent +
        "|" +
        (
          q("#result-rows")?.textContent || ""
        ).slice(0, 140);

      if (marker === lastResultMarker) {
        return;
      }

      lastResultMarker = marker;

      state.history.unshift({
        date: new Date().toLocaleString("ko-KR"),
        label:
          "시뮬레이션 완료 · " +
          classifyName()
      });

      state.history =
        state.history.slice(0, 15);

      persist();

      if (
        drawer.dataset.type === "history"
      ) {
        renderDrawer();
      }

    }).observe(simStatus, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  // =========================================
  // 19. 실행
  // =========================================

  document.body.classList.add(
    "io-rebuilt"
  );

  navigate("home");
  renderData();

})();

