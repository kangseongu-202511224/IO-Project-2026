
/*
 IO INTELLIGENCE
 Original UI / 36 Metrics Bridge

 기존 분석 화면의 그래프와 이벤트 유지
 선택 지표를 평균=1 상대지수로 변환
*/

(() => {
  "use strict";

  const q = s => document.querySelector(s);
  const nativeCall = window.call;

  if (
    typeof nativeCall !== "function" ||
    !q("#io-app")
  ) return;

  const VIEW_IDS = [
    "home",
    "quadrant",
    "dual",
    "treemap",
    "compare",
    "ranking",
    "types",
    "detail",
    "legacy"
  ];

  const DEFAULT = {
    x: "influence",
    y: "sensitivity"
  };

  let selected = { ...DEFAULT };
  let dataset = null;
  let inFlight = null;
  let generation = 0;
  let busy = false;
  let lastError = "";

  const toolbars = [];
  const originalNodes = new WeakMap();

  const label = key =>
    dataset?.indicators.find(
      m => m.key === key
    )?.label ||
    (
      key === "influence"
        ? "영향력계수"
        : key === "sensitivity"
          ? "감응도계수"
          : key
    );

  const normalizedLabel = key => {
    const name = label(key);

    return (
      key === "influence" ||
      key === "sensitivity"
    )
      ? name
      : `${name}(평균=1 환산)`;
  };

  const mean = key => {
    const rows = dataset.rows;

    return rows.reduce(
      (sum, r) =>
        sum + Number(r.metrics[key]),
      0
    ) / rows.length;
  };

  async function getMetrics() {
    if (dataset) return dataset;

    if (q("#sheet")?.disabled) {
      throw Error(
        "먼저 Excel 자료를 불러오세요."
      );
    }

    if (inFlight) return inFlight;

    const version = generation;

    inFlight = (async () => {
      const result = await nativeCall(
        "metrics",
        {}
      );

      if (version !== generation) {
        throw Error(
          "산업분류가 바뀌었습니다."
        );
      }

      if (
        !Array.isArray(result?.rows) ||
        !Array.isArray(result?.indicators) ||
        !result.rows.length ||
        !result.indicators.length
      ) {
        throw Error(
          "36개 지표 계산 결과를 찾지 못했습니다."
        );
      }

      dataset = result;
      return result;
    })();

    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  }

  // 기존 분석 함수는 영향력계수와
  // 감응도계수 필드를 사용합니다.
  // 선택 지표를 평균=1 상대지수로
  // 변환해 기존 분석 화면에 전달합니다.

  window.call = async function(type, payload) {
    if (
      type !== "analyze" ||
      (
        selected.x === DEFAULT.x &&
        selected.y === DEFAULT.y
      )
    ) {
      return nativeCall(type, payload);
    }

    const data = await getMetrics();

    const mx = mean(selected.x);
    const my = mean(selected.y);

    if (
      !(mx > 0) ||
      !(my > 0) ||
      !Number.isFinite(mx) ||
      !Number.isFinite(my)
    ) {
      throw Error(
        "선택 지표의 평균이 양수가 아닙니다."
      );
    }

    const results = data.rows.map(r => ({
      code: String(r.code),
      name: String(r.name),

      influence:
        Number(
          r.metrics[selected.x]
        ) / mx,

      sensitivity:
        Number(
          r.metrics[selected.y]
        ) / my
    }));

    if (
      results.some(r =>
        !Number.isFinite(r.influence) ||
        !Number.isFinite(r.sensitivity) ||
        r.influence < 0 ||
        r.sensitivity < 0
      )
    ) {
      throw Error(
        "선택 지표에 음수 또는 비정상 값이 있어 " +
        "기존 그래프 형식으로 표현할 수 없습니다."
      );
    }

    return {
      count: results.length,
      results
    };
  };

  // 화면 디자인

  const style =
    document.createElement("style");

  style.textContent = `

    .io-36-chooser label[hidden] {
      display: none !important;
    }
    .io-36-chooser {
      margin: 12px 0 18px;
      border: 1px solid #d9e5f3;
      background: #fff;
      border-radius: 14px;
      padding: 13px 16px;
      color: #254c78;
      display: flex;
      align-items: end;
      flex-wrap: wrap;
      gap: 10px;
    }

    .io-36-chooser > label {
      display: flex;
      flex-direction: column;
      flex: 1 1 180px;
      gap: 5px;
      font-size: 12px;
      font-weight: 700;
    }

    .io-36-chooser select {
      width: 100%;
      min-width: 0;
      border: 1px solid #cfdded;
      background: #fff;
      color: #234463;
      border-radius: 8px;
      padding: 10px;
    }

    .io-36-chooser button {
      border: 0;
      border-radius: 9px;
      background: #174b87;
      color: #fff;
      padding: 11px 15px;
      font-weight: 750;
      cursor: pointer;
    }

    .io-36-chooser button:disabled {
      opacity: .6;
      cursor: wait;
    }

    .io-36-status {
      width: 100%;
      font-size: 11px;
      line-height: 1.55;
      color: #72869f;
    }

    #io-metrics-panel.io-36-superseded {
      display: none !important;
    }

    @media(max-width:760px) {
      .io-36-chooser {
        padding: 11px;
      }
    }
  `;

  document.head.append(style);

  // 지표 목록 생성

  function buildOptions(select, key) {
    const groups = [
      ...new Set(
        dataset.indicators.map(
          m => m.group
        )
      )
    ];

    select.replaceChildren();

    for (const groupName of groups) {
      const group =
        document.createElement("optgroup");

      group.label = groupName;

      for (const m of dataset.indicators) {
        if (m.group !== groupName) {
          continue;
        }

        const opt =
          document.createElement("option");

        opt.value = m.key;
        opt.textContent = m.label;

        group.append(opt);
      }

      select.append(group);
    }

    select.value = key;
  }

  // 각 화면의 선택 상태 동기화

  function syncControls() {
    for (const b of toolbars) {
      b.x.value = selected.x;
      b.y.value = selected.y;

      b.x.disabled = !dataset || busy;
      b.y.disabled = !dataset || busy;
      b.button.disabled = busy;

      b.button.textContent = dataset
        ? "선택 지표 적용"
        : "36개 지표 불러오기";

      b.status.textContent =
        lastError ||
        (
          dataset
            ? `${dataset.count}개 산업 · ` +
              `${dataset.indicators.length}개 지표. ` +
              "기존 그래프의 수치는 원계수를 " +
              "전체 산업 평균으로 나눈 " +
              "상대지수(평균=1)입니다."
            : "Excel을 불러온 다음 " +
              "지표를 불러오세요."
        );
    }
  }

  // 원래 분석 화면 다시 실행

  function redrawOriginals() {
    if (
      typeof window.IO_REANALYZE ===
      "function"
    ) {
      Promise.resolve(
        window.IO_REANALYZE()
      ).catch(console.error);
    }

    for (const id of [
      "ii-run",
      "tm-run",
      "pm-load",
      "id-load",
      "analyze-btn"
    ]) {
      const button = q("#" + id);

      if (
        button &&
        !button.disabled
      ) {
        button.click();
      }
    }

    scheduleLabels();
  }

  // 선택한 지표 적용

  async function activate(toolbar) {
    if (busy) return;

    const isQuadrant = toolbar.panel.closest(
  "#io-view-quadrant"
) !== null;

const requested = dataset
  ? {
      x: toolbar.x.value,
      y: isQuadrant
        ? toolbar.y.value
        : toolbar.x.value
    }
  : { ...selected };

    busy = true;
    lastError = "";

    syncControls();

    try {
      await getMetrics();

      for (const b of toolbars) {
        buildOptions(
          b.x,
          selected.x
        );

        buildOptions(
          b.y,
          selected.y
        );
      }

      const next = requested;

     if (isQuadrant && next.x === next.y) {
  throw Error(
    "4분면 맵에서는 서로 다른 두 지표를 선택하세요."
  );
}

      const mx = mean(next.x);
      const my = mean(next.y);

      if (
        !(mx > 0) ||
        !(my > 0)
      ) {
        throw Error(
          "선택 지표의 산업 평균이 " +
          "0 이하입니다."
        );
      }

      selected = next;

      syncControls();
      redrawOriginals();

    } catch (err) {
      lastError =
        "지표 적용 실패: " +
        err.message;

    } finally {
      busy = false;

      syncControls();
      scheduleLabels();
    }
  }

  // 기존 화면에 지표 선택 UI 추가

  for (const id of VIEW_IDS) {
    const view = q(
      "#io-view-" + id
    );

    if (!view) continue;

    const panel =
      document.createElement("div");

    panel.className =
      "io-36-chooser";

    const title =
      document.createElement("label");

    title.textContent =
  id === "quadrant"
    ? "X축 분석 지표"
    : "분석 지표";

    const x =
      document.createElement("select");

    x.disabled = true;
    title.append(x);

    const title2 =
      document.createElement("label");

    title2.textContent = "Y축 분석 지표";

// 4분면 맵에서만 두 번째 지표 표시
title2.hidden = id !== "quadrant";

    const y =
      document.createElement("select");

    y.disabled = true;
    title2.append(y);

    const button =
      document.createElement("button");

    button.type = "button";

    button.textContent =
      "36개 지표 불러오기";

    const status =
      document.createElement("div");

    status.className =
      "io-36-status";

    panel.append(
      title,
      title2,
      button,
      status
    );

    const heading = view.querySelector(
      ".io-pagehead"
    );

    heading?.after(panel);

    if (!heading) {
      view.prepend(panel);
    }

    const toolbar = {
      panel,
      x,
      y,
      button,
      status
    };

    toolbars.push(toolbar);

    button.addEventListener(
      "click",
      () => activate(toolbar)
    );

    x.addEventListener(
      "change",
      () => {
        for (const b of toolbars) {
          if (b !== toolbar) {
            b.x.value = x.value;
          }
        }
      }
    );

    y.addEventListener(
      "change",
      () => {
        for (const b of toolbars) {
          if (b !== toolbar) {
            b.y.value = y.value;
          }
        }
      }
    );
  }

  // 기존 히트맵 표시 복원

  q("#premium-matrix")
    ?.style.removeProperty("display");

  q("#io-metrics-panel")
    ?.classList.add(
      "io-36-superseded"
    );

  // 지표 이름 표시 변경

  function transformText(base) {
    if (
      selected.x === DEFAULT.x &&
      selected.y === DEFAULT.y
    ) {
      return base;
    }

    return base
      .replaceAll(
        "영향력·감응도계수",
        "\uFFF0·\uFFF1"
      )
      .replaceAll(
        "영향력계수",
        "\uFFF0"
      )
      .replaceAll(
        "감응도계수",
        "\uFFF1"
      )
      .replaceAll(
        "영향력·감응도",
        "\uFFF0·\uFFF1"
      )
      .replaceAll(
        "핵심 연관형",
        "두 지표 모두 상위형"
      )
      .replaceAll(
        "전방 연관형",
        "두 번째 지표 상위형"
      )
      .replaceAll(
        "후방 연관형",
        "첫 번째 지표 상위형"
      )
      .replaceAll(
        "후방 연관효과",
        "첫 번째 지표 상대 수준"
      )
      .replaceAll(
        "전방 연관효과",
        "두 번째 지표 상대 수준"
      )
      .replaceAll(
        "두 계수 모두 1 이상",
        "두 지표 모두 평균 이상"
      )
      .replaceAll(
        "상대적 저연관형",
        "두 지표 모두 하위형"
      )
      .replaceAll(
        "\uFFF0",
        normalizedLabel(selected.x)
      )
      .replaceAll(
        "\uFFF1",
        normalizedLabel(selected.y)
      );
  }

  // 화면 업데이트 감지

  let scheduled = false;

  function scheduleLabels() {
    if (scheduled) return;

    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;

      const root = q("#io-app");

      if (!root) return;

      const walker =
        document.createTreeWalker(
          root,
          NodeFilter.SHOW_TEXT
        );

      let node;

      while (
        (node = walker.nextNode())
      ) {
        const parent =
          node.parentElement;

      if (
  !parent ||
  parent.closest(
    "#io-view-glossary, .io-36-chooser, script, style"
  )
) {
  continue;
}

        let original =
          originalNodes.get(node);

        if (
          original === undefined ||
          node.nodeValue !==
            transformText(original)
        ) {
          original = node.nodeValue;

          originalNodes.set(
            node,
            original
          );
        }

        const updated =
          transformText(original);

        if (
          node.nodeValue !== updated
        ) {
          node.nodeValue = updated;
        }
      }
    });
  }

  const observer =
    new MutationObserver(
      scheduleLabels
    );

  observer.observe(
    q("#io-app"),
    {
      childList: true,
      characterData: true,
      subtree: true
    }
  );

  // Excel 변경 시 초기화

  function invalidate() {
    generation++;

    dataset = null;
    inFlight = null;
    lastError = "";

    for (const b of toolbars) {
      b.x.replaceChildren();
      b.y.replaceChildren();
    }

    syncControls();
  }

  q("#load-basic")
    ?.addEventListener(
      "click",
      invalidate,
      true
    );

  q("#io-classification")
    ?.addEventListener(
      "change",
      invalidate
    );

  syncControls();
  scheduleLabels();
})();
