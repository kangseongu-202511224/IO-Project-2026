
/* IO INTELLIGENCE
   Premium Matrix + Industry Company Examples
   기존 경제 계산 파일 수정 없음
*/
(() => {
  "use strict";

  const $ = s => document.querySelector(s);
  const app = $("#io-app");
  const host = $("#io-view-dual");

  if (!app || !host || $("#premium-matrix")) return;

  // 출처: 한국은행, 우리나라 주요 제조업 생산 및 공급망 지도(2023)
  const SOURCE =
    "https://www.bok.or.kr/portal/bbs/P0002125/view.do?menuNo=200774&nttId=10079007";

  // 주요 제조업의 참고기업.
  // 380개 세부 산업 전체에 대한 완성된 매핑은 아님.
  const COMPANY_RULES = [
    {
      test: /반도체|집적회로|메모리칩/,
      exclude: /장비|기계|소재|제조용/,
      names: ["삼성전자", "SK하이닉스"]
    },
    {
      test: /디스플레이|전자표시장치|평판표시장치/,
      exclude: /장비|제조용|소재/,
      names: ["삼성디스플레이", "LG디스플레이"]
    },
    {
      test: /자동차부품|자동차 부분품|자동차용 부품/,
      names: ["현대모비스", "현대트랜시스", "현대위아"]
    },
    {
      test: /승용차|완성차|자동차(?: \(.*\))?$/,
      exclude: /부품|기계|수리|운송서비스/,
      names: ["현대자동차", "기아"]
    },
    {
      test: /철강|열연강|냉연강|강판/,
      exclude: /제품가공기계/,
      names: ["포스코", "현대제철", "동국제강"]
    },
    {
      test: /선박|조선/,
      exclude: /수리|운송|부품/,
      names: ["HD현대중공업", "삼성중공업", "한화오션"]
    },
    {
      test: /석유정제|석유제품/,
      exclude: /화학|운송|판매/,
      names: ["SK에너지", "GS칼텍스", "S-OIL"]
    },
    {
      test: /석유화학|기초유기화학|기초화학물질/,
      names: ["LG화학", "롯데케미칼", "한화솔루션"]
    },
    {
      test: /무선통신기기|통신기기/,
      exclude: /서비스|수리/,
      names: ["삼성전자", "LG이노텍", "삼성전기"]
    },
    {
      test: /이차전지|축전지|배터리/,
      exclude: /재활용|기계/,
      names: ["LG에너지솔루션", "삼성SDI", "SK온"]
    }
  ];

  const classify = name =>
    COMPANY_RULES.find(
      rule =>
        rule.test.test(name) &&
        !(rule.exclude && rule.exclude.test(name))
    );

  const fmt = value => Number(value).toFixed(4);

  const safe = text =>
    String(text).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  // 계수값별 색상
  function color(value) {
    if (value >= 1.3) return ["#16644b", "#ffffff"];
    if (value >= 1.1) return ["#45a47c", "#ffffff"];
    if (value >= 1.0) return ["#b9e0cb", "#193f33"];
    if (value >= 0.9) return ["#ffe28e", "#6b4b15"];
    if (value >= 0.7) return ["#f4aa76", "#623c24"];
    return ["#cc5462", "#ffffff"];
  }

  function typeName(r) {
    if (r.influence >= 1 && r.sensitivity >= 1)
      return "핵심 연관형";

    if (r.influence >= 1)
      return "후방 연관형";

    if (r.sensitivity >= 1)
      return "전방 연관형";

    return "저연관형";
  }

  const state = {
    rows: [],
    ranks: {},
    selection: null,
    generation: 0,
    key: "",
    loading: null,
    metric: "influence",
    display: 100,
    query: ""
  };

  // ─────────────────────────────
  // 매트릭스 화면
  // ─────────────────────────────

  const view = document.createElement("section");
  view.id = "premium-matrix";

  view.innerHTML = `
    <div class="pm-head">
      <div>
        <span class="pm-eyebrow">
          ANALYTICS / COEFFICIENT HEATMAP
        </span>

        <h2>산업별 연관효과 매트릭스</h2>

        <p>
          영향력계수와 감응도계수를 독립적으로 분석합니다.
          가로 10칸은 각 순위 구간의 산업을 나타내며,
          오른쪽과 아래쪽에는 평균이 표시됩니다.
        </p>
      </div>

      <button id="pm-load" type="button">
        현재 산업분류 분석하기
      </button>
    </div>

    <div class="pm-message"
         id="pm-message"
         role="status">
      먼저 상단에서 산업분류 자료를 불러오세요.
    </div>

    <div id="pm-results" hidden>

      <div class="pm-summary" id="pm-summary"></div>

      <div class="pm-controls">

        <div class="pm-segment"
             role="group"
             aria-label="히트맵 지표 선택">

          <button type="button"
                  data-metric="influence"
                  aria-pressed="true">
            영향력계수
          </button>

          <button type="button"
                  data-metric="sensitivity"
                  aria-pressed="false">
            감응도계수
          </button>
        </div>

        <input id="pm-search"
               type="search"
               placeholder="산업명 또는 산업코드 검색"
               aria-label="산업 검색">

        <select id="pm-display"
                aria-label="표시할 산업 수">
          <option value="60">60개</option>
          <option value="100" selected>100개</option>
          <option value="200">200개</option>
          <option value="all">전체 산업</option>
        </select>
      </div>

      <div class="pm-card">

        <div class="pm-cardhead">
          <div>
            <h3 id="pm-title">
              영향력계수 · 산업별 히트맵
            </h3>
            <p>
              계수 순위별 10개 산업을 한 행으로 배치
              · 셀 클릭 시 산업 상세 정보
            </p>
          </div>

          <span id="pm-count"></span>
        </div>

        <div class="pm-scroll">
          <table class="pm-grid"
                 id="pm-grid"
                 aria-label="산업별 계수 히트맵">
          </table>
        </div>

        <div class="pm-legend">
          <span>낮음</span>
          <i style="background:#cc5462"></i>
          <i style="background:#f4aa76"></i>
          <i style="background:#ffe28e"></i>
          <i style="background:#b9e0cb"></i>
          <i style="background:#45a47c"></i>
          <i style="background:#16644b"></i>
          <span>높음</span>
          <small>기준값 1.0000</small>
        </div>
      </div>

      <div class="pm-panel" id="pm-selected">
        산업 셀을 클릭하면 두 계수와 순위를
        확인할 수 있습니다.
      </div>

      <div id="pm-companies"></div>

      <p class="pm-note">
        행은 순위 구간, 열은 그 구간 내 순번입니다.
        이 표는 산업×산업 투입계수행렬이 아닙니다.
        행·열 평균은 현재 표시 산업을 기준으로 계산됩니다.
      </p>
    </div>
  `;

  host.append(view);

  const get = id =>
    view.querySelector("#pm-" + id);

  // ─────────────────────────────
  // 데이터·순위
  // ─────────────────────────────

  function ranking(field) {
    const ranks = new Map();

    [...state.rows]
      .sort((a, b) => b[field] - a[field])
      .forEach((r, i, arr) => {
        const position =
          i > 0 &&
          r[field] === arr[i - 1][field]
            ? ranks.get(arr[i - 1].code)
            : i + 1;

        ranks.set(r.code, position);
      });

    return ranks;
  }

  function currentKey() {
    return $("#io-classification")?.value || "basic";
  }

  function reset() {
    state.generation++;
    state.rows = [];
    state.ranks = {};
    state.selection = null;
    state.loading = null;

    get("results").hidden = true;
    get("message").textContent =
      "새 산업분류를 불러온 뒤 분석을 실행해 주세요.";
  }

  async function loadData() {
    if ($("#sheet")?.disabled) {
      throw Error(
        "상단에서 산업부문을 먼저 불러오세요."
      );
    }

    if (
      state.rows.length &&
      state.key === currentKey()
    ) return;

    if (state.loading) return state.loading;

    const generation = state.generation;

    state.loading = (async () => {
      if (typeof call !== "function") {
        throw Error(
          "계수 분석 함수를 찾지 못했습니다."
        );
      }

      const result = await call("analyze", {});

      if (generation !== state.generation) {
        throw Error("산업분류가 변경되었습니다.");
      }

      const raw = Array.isArray(result)
        ? result
        : result?.results;

      if (!Array.isArray(raw) || !raw.length) {
        throw Error("산업분석 결과가 없습니다.");
      }

      const rows = raw.map(r => ({
        code: String(r.code),
        name: String(r.name),
        influence: Number(r.influence),
        sensitivity: Number(r.sensitivity)
      }));

      if (rows.some(r =>
        !r.code ||
        !Number.isFinite(r.influence) ||
        !Number.isFinite(r.sensitivity)
      )) {
        throw Error("잘못된 계수 데이터입니다.");
      }

      state.rows = rows;
      state.ranks = {
        influence: ranking("influence"),
        sensitivity: ranking("sensitivity")
      };
      state.key = currentKey();
    })();

    try {
      await state.loading;
    } finally {
      state.loading = null;
    }
  }

  // ─────────────────────────────
  // 기업 예시 표시
  // ─────────────────────────────


function companies(r) {
  // 먼저 산업코드별 참고기업 데이터 사용.
  // 통합분류에서는 기존 산업명 규칙을 보조적으로 사용.
  const matched =
    window.IO_COMPANY_LOOKUP?.(r.code) ||
    classify(r.name);

  const names = matched?.names || [];

  // 쉼표 + 한 칸 띄어쓰기로 표시
  const companyText = names.length
    ? names.map(name => safe(name)).join(", ")
    : "기업 예시 조사 중";

  return `
    <div class="pm-company">
      <div class="pm-company-top">
        <strong>해당 산업의 예시 기업</strong>
        <span>
          ${names.length
            ? "업종 참고기업"
            : "미등록"}
        </span>
      </div>

      <div class="pm-tags">
        <span class="pm-company-names">
          ${companyText}
        </span>
      </div>

      <p>
        위 기업은 산업의 사업 분야를 이해하기 위한
        참고 사례입니다. 기업별 실제 생산액이나
        해당 산업의 독점적 귀속을 뜻하지 않습니다.
      </p>
    </div>
  `;
}
    const matched = classify(r.name);
    const names = matched?.names || [];

    const explanation = names.length
      ? "한국은행 주요 제조업 자료를 참고한 기업 예시입니다. 세부 품목과의 정확한 일치 여부는 별도 확인이 필요합니다."
      : "검증된 기업 예시를 아직 확보하지 못했습니다. 임의로 표시하지 않습니다.";

    const tags = names.length
      ? names.map(
          name => `<b>${safe(name)}</b>`
        ).join("")
      : `<span class="pm-muted">
           등록된 기업 예시 없음
         </span>`;

    return `
      <div class="pm-company">

        <div class="pm-company-top">
          <strong>해당 산업의 예시 기업</strong>
          <span>
            ${names.length ? "참고 자료 있음" : "미검증"}
          </span>
        </div>

        <div class="pm-tags">${tags}</div>

        <p>${explanation}</p>

        ${
          names.length
            ? `<a href="${SOURCE}"
                  target="_blank"
                  rel="noopener noreferrer">
                 한국은행 산업별 공급망 자료 확인 ↗
               </a>`
            : ""
        }
      </div>
    `;
  }

  // ─────────────────────────────
  // 선택 산업 상세
  // ─────────────────────────────

  function selectIndustry(r) {
    state.selection = r.code;

    const ranks = state.ranks;

    get("selected").innerHTML = `
      <div class="pm-selected-header">
        <div>
          <small>SELECTED INDUSTRY</small>
          <h3>
            ${safe(r.name)}
            <span>${safe(r.code)}</span>
          </h3>
        </div>
        <b>${typeName(r)}</b>
      </div>

      <div class="pm-selected-stats">

        <div>
          <small>영향력계수</small>
          <strong>${fmt(r.influence)}</strong>
          <span>
            ${ranks.influence.get(r.code)}
            / ${state.rows.length}위
          </span>
        </div>

        <div>
          <small>감응도계수</small>
          <strong>${fmt(r.sensitivity)}</strong>
          <span>
            ${ranks.sensitivity.get(r.code)}
            / ${state.rows.length}위
          </span>
        </div>
      </div>
    `;

    get("companies").innerHTML = companies(r);

    view.querySelectorAll(".pm-cell").forEach(cell => {
      cell.classList.toggle(
        "pm-picked",
        cell.dataset.code === r.code
      );
    });
  }

  // ─────────────────────────────
  // 사진과 같은 히트맵 표 작성
  // ─────────────────────────────

  function draw() {
    if (!state.rows.length) return;

    const metric = state.metric;

    const all = [...state.rows].sort(
      (a, b) => b[metric] - a[metric]
    );

    const limit = state.display === "all"
      ? all.length
      : Number(state.display);

    const shown = all.slice(0, limit);

    const average = list =>
      list.length
        ? (
            list.reduce(
              (sum, r) => sum + r[metric],
              0
            ) / list.length
          ).toFixed(2)
        : "—";

    const table = get("grid");
    table.replaceChildren();

    // 표 머리
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    [
      "전체 순위",
      ...Array.from(
        { length: 10 },
        (_, i) => `${i + 1}`
      ),
      "행 평균"
    ].forEach(label => {
      const th = document.createElement("th");
      th.textContent = label;
      headerRow.append(th);
    });

    thead.append(headerRow);
    table.append(thead);

    // 산업 10개씩 한 행
    const tbody = document.createElement("tbody");

    for (let i = 0; i < shown.length; i += 10) {
      const chunk = shown.slice(i, i + 10);

      const tr = document.createElement("tr");
      const rowTitle = document.createElement("th");

      rowTitle.scope = "row";
      rowTitle.textContent =
        `${i + 1}–${Math.min(i + 10, shown.length)}위`;

      tr.append(rowTitle);

      for (let j = 0; j < 10; j++) {
        const td = document.createElement("td");
        const r = chunk[j];

        if (r) {
          const button = document.createElement("button");

          button.type = "button";
          button.className = "pm-cell";
          button.dataset.code = r.code;

          button.title =
            `${r.name} (${r.code})\n` +
            `${metric === "influence"
              ? "영향력계수"
              : "감응도계수"} ${fmt(r[metric])}`;

          button.setAttribute(
            "aria-label",
            button.title
          );

          const [background, foreground] =
            color(r[metric]);

          button.style.background = background;
          button.style.color = foreground;
          button.textContent = fmt(r[metric]);

          button.addEventListener(
            "click",
            () => selectIndustry(r)
          );

          td.append(button);

          if (
            state.query &&
            !(`${r.name} ${r.code}`)
              .toLowerCase()
              .includes(state.query)
          ) {
            button.classList.add("pm-faded");
          }

          if (r.code === state.selection) {
            button.classList.add("pm-picked");
          }
        }

        tr.append(td);
      }

      const rowAverage = document.createElement("td");
      rowAverage.className = "pm-mean";
      rowAverage.textContent = average(chunk);

      tr.append(rowAverage);
      tbody.append(tr);
    }

    table.append(tbody);

    // 하단 열 평균
    const tfoot = document.createElement("tfoot");
    const footerRow = document.createElement("tr");

    const footerLabel = document.createElement("th");
    footerLabel.textContent = "열 평균";
    footerRow.append(footerLabel);

    for (let j = 0; j < 10; j++) {
      const list = shown.filter(
        (_, index) => index % 10 === j
      );

      const td = document.createElement("td");

      td.className = "pm-mean";
      td.textContent = average(list);
      footerRow.append(td);
    }

    const grandAverage = document.createElement("td");
    grandAverage.className = "pm-mean pm-grand";
    grandAverage.textContent = average(shown);

    footerRow.append(grandAverage);
    tfoot.append(footerRow);
    table.append(tfoot);

    get("title").textContent =
      (metric === "influence"
        ? "영향력계수"
        : "감응도계수") +
      " · 산업별 히트맵";

    get("count").textContent =
      `${shown.length} / ${all.length}개 산업`;

    view.querySelectorAll("[data-metric]").forEach(b => {
      b.setAttribute(
        "aria-pressed",
        String(b.dataset.metric === metric)
      );
    });
  }

  function render() {
    const n = state.rows.length;

    const average = field =>
      state.rows.reduce(
        (sum, r) => sum + r[field],
        0
      ) / n;

    get("summary").innerHTML = `
      <div>
        <small>분석 산업</small>
        <strong>${n}개</strong>
      </div>
      <div>
        <small>영향력계수 평균</small>
        <strong>${fmt(average("influence"))}</strong>
      </div>
      <div>
        <small>감응도계수 평균</small>
        <strong>${fmt(average("sensitivity"))}</strong>
      </div>
    `;

    get("results").hidden = false;

    draw();
    selectIndustry(state.rows[0]);
  }

  // ─────────────────────────────
  // 버튼
  // ─────────────────────────────

  get("load").addEventListener("click", async () => {
    const button = get("load");

    button.disabled = true;
    get("message").textContent = "계수 분석 중…";

    try {
      await loadData();
      render();

      get("message").textContent =
        `${state.rows.length}개 산업의 계수 분석 완료`;
    } catch (error) {
      get("message").textContent =
        "분석 실패: " + error.message;
    } finally {
      button.disabled = false;
    }
  });

  view.querySelectorAll("[data-metric]").forEach(button => {
    button.addEventListener("click", () => {
      state.metric = button.dataset.metric;
      draw();
    });
  });

  get("display").addEventListener("change", e => {
    state.display = e.target.value;
    draw();
  });

  get("search").addEventListener("input", e => {
    state.query = e.target.value
      .trim()
      .toLowerCase();

    draw();
  });

  $("#load-basic")?.addEventListener(
    "click",
    reset,
    true
  );

  $("#io-classification")?.addEventListener(
    "change",
    reset
  );

  // ─────────────────────────────
  // 기존 그래프에도 기업 정보 연동
  // ─────────────────────────────

  const mounts = [
    {
      target: "#ii-detail",
      id: "pm-company-quadrant",
      get: () => {
        const text =
          $("#ii-detail .detail-code")?.textContent || "";

        return text
          .replace(/.*산업코드\s*/, "")
          .trim();
      }
    },
    {
      target: "#tm-detail",
      id: "pm-company-treemap",
      get: () => {
        const text =
          $("#tm-detail p")?.textContent || "";

        return (
          text.match(/산업코드\s*(\S+)/) || []
        )[1];
      }
    },
    {
      target: "#id-sector",
      id: "pm-company-industry",
      get: () => $("#id-sector")?.value
    }
  ];

  for (const mount of mounts) {
    const target = $(mount.target);
    if (!target) continue;

    const slot = document.createElement("div");
    slot.id = mount.id;

    target.insertAdjacentElement("afterend", slot);

    let lastCode = "";

    const sync = async () => {
      const code = mount.get();

      if (!code || code === lastCode) return;

      lastCode = code;

      try {
        await loadData();

        const industry = state.rows.find(
          r => r.code === code
        );

        if (industry) {
          slot.innerHTML = companies(industry);
        }
      } catch {
        // 자료가 로드되지 않았을 경우 표시하지 않음
      }
    };

    target.addEventListener(
      "click",
      () => queueMicrotask(sync)
    );

    target.addEventListener(
      "change",
      () => queueMicrotask(sync)
    );

    const observer = new MutationObserver(sync);

    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes:
        mount.id === "pm-company-industry"
    });
  }
})();
