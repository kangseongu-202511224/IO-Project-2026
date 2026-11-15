
/*
 IO INTELLIGENCE
 Single Metric UI

 4분면 맵을 제외한 분석 화면의
 중복 계수 선택창, 중복 결과 카드 정리

 기존 그래프 / 검색 / 정렬 / 산업 클릭 기능 유지
*/

(() => {
  "use strict";

  const app = document.querySelector("#io-app");
  if (!app) return;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const style = document.createElement("style");

  style.textContent = `

    /* 1. 트리맵: 기존 영향력/감응도 버튼 제거 */
    #io-view-treemap #industry-treemap .toggle {
      display: none !important;
    }

    /* 2. 종합 히트맵: 기존 지표 두 버튼 제거 */
    #io-view-dual #premium-matrix .pm-segment {
      display: none !important;
    }

    /* 3. 종합 히트맵: 두 번째 계수 요약 카드 제거 */
    #io-view-dual #pm-summary > div:nth-child(3) {
      display: none !important;
    }

    /* 4. 선택 산업: 두 번째 계수 정보 제거 */
    #io-view-dual
    #pm-selected .pm-selected-stats > div:nth-child(2) {
      display: none !important;
    }

    /* 기존 두 지표 기준의 산업 유형명 숨김 */
    #io-view-dual
    #pm-selected .pm-selected-header > b {
      display: none !important;
    }

    /* 5. 산업 순위: 중복 지표 선택창 제거 */
    #io-view-ranking
    label:has(#io-rank-metric) {
      display: none !important;
    }

    /* 6. 산업 비교: 두 번째 지표와 유형 열 제거 */
    #io-view-compare
    #io-compare-table tr > :nth-child(4),
    #io-view-compare
    #io-compare-table tr > :nth-child(5),
    #io-view-compare
    #io-compare-table tr > :nth-child(6) {
      display: none !important;
    }

    /* 7. 산업 상세: 두 번째 계수 카드 제거 */
    #io-view-detail
    #id-report .id-kpis > .id-panel:nth-child(2) {
      display: none !important;
    }

    /* 두 번째 지표의 순위와 2축 유형 표시 제거 */
    #io-view-detail .id-row:has(#id-srank),
    #io-view-detail .id-row:has(#id-type) {
      display: none !important;
    }

    /* 8. 홈 대시보드: 중복된 감응도 계수 카드 제거 */
    #io-view-home
    #io-home-stats > :nth-child(3) {
      display: none !important;
    }

    /* 홈 대시보드: 중복된 두 번째 순위 목록 제거 */
    #io-view-home
    .io-two:has(#io-home-inf) > article:nth-child(2) {
      display: none !important;
    }

    /* 9. 유형 분석: 사용하지 않는 두 유형 숨김 */
    #io-view-types
    #io-type-stats > :nth-child(2),
    #io-view-types
    #io-type-stats > :nth-child(3),
    #io-view-types
    #io-type-bars > :nth-child(2),
    #io-view-types
    #io-type-bars > :nth-child(3) {
      display: none !important;
    }

    /* 10. 듀얼 분석의 두 번째 히트맵 숨김 */
    #io-app[data-view="dual"]
    #ii-heatmaps > :nth-child(2),
    #io-app[data-view="dual"]
    #ii-side-charts > :nth-child(2) {
      display: none !important;
    }

    /* 11. 트리맵 상세: 중복된 값 숨김 */
    #io-view-treemap
    #tm-detail .io-single-duplicate {
      display: none !important;
    }

    /* 트리맵의 기존 두 지표 해석 제거 */
    #io-view-treemap #tm-detail .insight {
      display: none !important;
    }

    /* 원래의 한 지표 정보가 가로폭을 활용하도록 설정 */
    #io-view-detail .id-kpis,
    #io-view-dual .pm-selected-stats {
      grid-template-columns:
        repeat(auto-fit, minmax(180px, 1fr));
    }
  `;

  document.head.append(style);

  function replaceIfDifferent(element, value) {
    if (
      element &&
      element.textContent !== value
    ) {
      element.textContent = value;
    }
  }

  function isSingleMode() {
    return app.dataset.view !== "quadrant";
  }

  function selectedName() {
    const view = $("#io-view-" + app.dataset.view);

    const select = view?.querySelector(
      ".io-36-chooser select"
    );

    const text =
      select?.selectedOptions?.[0]?.textContent;

    return text || "선택한 분석 지표";
  }

  function fixTreemap() {
    if (app.dataset.view !== "treemap") return;

    // 내부 분석은 항상 첫 번째 데이터 필드 사용
    const influenceButton = $("#tm-influence");

    if (
      influenceButton &&
      !influenceButton.classList.contains("active")
    ) {
      influenceButton.click();
    }

    // 상세 패널의 두 번째 계수와 순위 제거
    const detailRows = $$("#tm-detail .detailrow");

    detailRows.forEach((row, index) => {
      const duplicate =
        index === 1 || index === 3;

      row.classList.toggle(
        "io-single-duplicate",
        duplicate
      );
    });

    const heading = $("#industry-treemap h2");

    replaceIfDifferent(
      heading,
      `산업별 ${selectedName()} 트리맵`
    );
  }

  function fixPremium() {
    if (app.dataset.view !== "dual") return;

    const first = $(
      '#premium-matrix button[data-metric="influence"]'
    );

    // 기존 히트맵의 첫 번째 표시 필드 사용
    if (
      first &&
      first.getAttribute("aria-pressed") === "false"
    ) {
      first.click();
    }
  }

  function fixRanking() {
    if (app.dataset.view !== "ranking") return;

    const select = $("#io-rank-metric");

    if (
      select &&
      select.value !== "influence"
    ) {
      select.value = "influence";

      select.dispatchEvent(
        new Event("input", {
          bubbles: true
        })
      );
    }
  }

  function fixCompare() {
    if (app.dataset.view !== "compare") return;

    const table = $("#io-compare-table table");
    if (!table) return;

    const heading = table.querySelector(
      "thead tr th:nth-child(2)"
    );

    replaceIfDifferent(
      heading,
      selectedName()
    );

    const rankHeading = table.querySelector(
      "thead tr th:nth-child(3)"
    );

    replaceIfDifferent(
      rankHeading,
      "선택 지표 순위"
    );
  }

  function fixHome() {
    if (app.dataset.view !== "home") return;

    const cards = $$("#io-home-stats > *");

    if (cards[1]) {
      replaceIfDifferent(
        cards[1].querySelector("small"),
        `${selectedName()} 평균`
      );
    }

    if (cards[3]) {
      replaceIfDifferent(
        cards[3].querySelector("small"),
        "평균 이상 산업"
      );

      replaceIfDifferent(
        cards[3].querySelector("em"),
        "선택 지표가 평균 이상인 산업"
      );
    }

    const firstTitle = $(
      "#io-view-home .io-two:has(#io-home-inf) " +
      "article:first-child h3"
    );

    replaceIfDifferent(
      firstTitle,
      `${selectedName()} 상위 산업`
    );
  }

  function fixTypes() {
    if (app.dataset.view !== "types") return;

    const cards = $$("#io-type-stats > *");

    if (cards[0]) {
      replaceIfDifferent(
        cards[0].querySelector("small"),
        "평균 이상 산업"
      );
    }

    if (cards[3]) {
      replaceIfDifferent(
        cards[3].querySelector("small"),
        "평균 미만 산업"
      );
    }

    const bars = $$("#io-type-bars > *");

    if (bars[0]) {
      replaceIfDifferent(
        bars[0].querySelector(".name"),
        "평균 이상 산업"
      );
    }

    if (bars[3]) {
      replaceIfDifferent(
        bars[3].querySelector(".name"),
        "평균 미만 산업"
      );
    }

    const select = $("#io-type-filter");

    if (select) {
      for (const option of select.options) {
        if (option.value === "0") {
          replaceIfDifferent(
            option,
            "평균 이상 산업"
          );
        }

        if (option.value === "3") {
          replaceIfDifferent(
            option,
            "평균 미만 산업"
          );
        }

        if (
          option.value === "1" ||
          option.value === "2"
        ) {
          option.disabled = true;
          option.hidden = true;
        }
      }

      if (
        select.value === "1" ||
        select.value === "2"
      ) {
        select.value = "all";
        select.dispatchEvent(
          new Event("change", { bubbles: true })
        );
      }
    }

    const table = $("#io-type-table table");

    if (table) {
      const lastHead = table.querySelector(
        "thead tr th:last-child"
      );

      replaceIfDifferent(
        lastHead,
        "평균 대비 구분"
      );

      table.querySelectorAll(
        "tbody tr"
      ).forEach(tr => {
        const cells = tr.querySelectorAll("td");

        if (cells.length < 5) return;

        const value = Number(cells[2].textContent);

        if (!Number.isFinite(value)) return;

        replaceIfDifferent(
          cells[4],
          value >= 1
            ? "평균 이상"
            : "평균 미만"
        );
      });
    }
  }

  function fixSingleMetricUI() {
    if (!isSingleMode()) return;

    fixTreemap();
    fixPremium();
    fixRanking();
    fixCompare();
    fixHome();
    fixTypes();
  }

  // 기존 프로그램이 그래프를 다시 그려도
  // 중복 요소가 다시 나타나지 않도록 자동 반영
  let scheduled = false;

  function scheduleFix() {
    if (scheduled) return;

    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      fixSingleMetricUI();
    });
  }

  const observer = new MutationObserver(scheduleFix);

  observer.observe(app, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["data-view"]
  });

  scheduleFix();

})();

