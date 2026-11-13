
(() => {
  'use strict';

  const el = id => document.getElementById(id);
  const host = el('industry-analysis') ||
               document.querySelector('main');

  if (!host || el('industry-detail')) return;

  // 대시보드 디자인
  const style = document.createElement('style');
  style.textContent = `
    #industry-detail {
      color:#263347;
      font-family:inherit;
      margin:28px 0;
    }

    #industry-detail * {
      box-sizing:border-box;
    }

    #industry-detail .id-shell {
      background:#f4f5f7;
      padding:22px;
      border-radius:18px;
    }

    #industry-detail .id-head {
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:14px;
      flex-wrap:wrap;
      margin-bottom:18px;
    }

    #industry-detail .id-head h2 {
      font-size:23px;
      margin:0 0 4px;
      color:#27344b;
    }

    #industry-detail .id-sub {
      color:#697589;
      font-size:13px;
      margin:0;
    }

    #industry-detail .id-toolbar {
      display:flex;
      flex-wrap:wrap;
      align-items:end;
      gap:10px;
      margin-bottom:18px;
    }

    #industry-detail .id-toolbar label {
      display:grid;
      gap:5px;
      font-size:12px;
      color:#58677b;
      flex:1;
      min-width:175px;
    }

    #industry-detail .id-toolbar input,
    #industry-detail .id-toolbar select {
      width:100%;
      min-width:0;
      border:1px solid #d7dee8;
      border-radius:9px;
      background:white;
      padding:11px;
      color:#253348;
      font:inherit;
    }

    #industry-detail .id-button {
      background:#284f83;
      color:white;
      border:0;
      border-radius:9px;
      padding:12px 15px;
      cursor:pointer;
      font:inherit;
    }

    #industry-detail .id-button:disabled {
      opacity:.5;
      cursor:wait;
    }

    #industry-detail .id-status {
      font-size:13px;
      color:#64748b;
      margin:0 0 12px;
    }

    #industry-detail .id-kpis {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:14px;
      margin-bottom:14px;
    }

    #industry-detail .id-panel {
      background:white;
      border:1px solid #e6e9ef;
      border-radius:15px;
      padding:22px;
      box-shadow:0 3px 12px rgba(20,38,70,.035);
    }

    #industry-detail .id-kpis .id-panel {
      min-height:143px;
    }

    #industry-detail .id-label {
      font-weight:650;
      color:#5b6675;
      font-size:14px;
    }

    #industry-detail .id-number {
      font-size:30px;
      font-weight:750;
      letter-spacing:-1px;
      color:#243348;
      line-height:1.3;
      margin:8px 0;
    }

    #industry-detail .id-note {
      font-size:12px;
      color:#7b8796;
    }

    #industry-detail .id-pill {
      display:inline-block;
      border-radius:100px;
      background:#eef6f0;
      color:#298456;
      padding:4px 9px;
      font-size:12px;
      font-weight:650;
    }

    #industry-detail .id-pill.low {
      background:#fff0f0;
      color:#c7626a;
    }

    #industry-detail .id-main {
      display:grid;
      grid-template-columns:1fr 1.4fr;
      gap:14px;
    }

    #industry-detail .id-panel h3 {
      font-size:20px;
      margin:0 0 5px;
      color:#29364a;
    }

    #industry-detail .id-chartnote {
      font-size:12px;
      color:#7b8796;
      margin:4px 0 15px;
    }

    #industry-detail .id-gauge {
      width:100%;
      max-width:350px;
      display:block;
      margin:10px auto 0;
    }

    #industry-detail .id-row {
      display:flex;
      justify-content:space-between;
      gap:10px;
      padding:13px 4px;
      border-bottom:1px solid #edf0f3;
      font-size:13px;
    }

    #industry-detail .id-row span:last-child {
      font-weight:650;
      text-align:right;
    }

    #industry-detail .id-plot {
      width:100%;
      height:auto;
      display:block;
    }

    #industry-detail .id-legend {
      display:flex;
      gap:16px;
      flex-wrap:wrap;
      font-size:12px;
      color:#5b6675;
      margin:6px 0;
    }

    #industry-detail .id-dot {
      display:inline-block;
      width:9px;
      height:9px;
      border-radius:50%;
      margin-right:5px;
    }

    #industry-detail .id-insight {
      margin-top:14px;
      background:#edf3fa;
      border-radius:10px;
      padding:13px;
      font-size:13px;
      color:#3d587b;
      line-height:1.6;
    }

    @media(max-width:760px) {
      #industry-detail .id-shell {
        padding:12px;
      }

      #industry-detail .id-kpis {
        grid-template-columns:1fr;
      }

      #industry-detail .id-main {
        grid-template-columns:1fr;
      }

      #industry-detail .id-panel {
        padding:16px;
      }
    }
  `;

  document.head.append(style);

  // 화면 구조
  const section = document.createElement('section');
  section.id = 'industry-detail';

  section.innerHTML = `
    <div class="id-shell">

      <div class="id-head">
        <div>
          <h2>산업 인텔리전스</h2>
          <p class="id-sub">
            2023년 산업연관표 · 산업별 심층 분석
          </p>
        </div>
        <span class="id-pill">INDUSTRY DASHBOARD</span>
      </div>

      <div class="id-toolbar">
        <button id="id-load"
                class="id-button"
                type="button">
          현재 분류 분석자료 불러오기
        </button>

        <label>
          산업 검색
          <input id="id-search"
                 type="search"
                 placeholder="산업명 또는 코드"
                 disabled>
        </label>

        <label>
          산업 선택
          <select id="id-sector" disabled></select>
        </label>
      </div>

      <p id="id-status"
         class="id-status"
         role="status">
        Excel 자료를 불러온 다음 분석을 실행하세요.
      </p>

      <div id="id-report" hidden>

        <div class="id-kpis">

          <div class="id-panel">
            <div class="id-label">영향력계수</div>
            <div class="id-number" id="id-influence"></div>
            <span id="id-influence-pill"></span>
            <div class="id-note">
              후방 연관효과 · 평균 1
            </div>
          </div>

          <div class="id-panel">
            <div class="id-label">감응도계수</div>
            <div class="id-number" id="id-sensitivity"></div>
            <span id="id-sensitivity-pill"></span>
            <div class="id-note">
              전방 연관효과 · 평균 1
            </div>
          </div>

          <div class="id-panel">
            <div class="id-label">영향력계수 순위</div>
            <div class="id-number" id="id-rank"></div>
            <span class="id-pill" id="id-rank-percent"></span>
            <div class="id-note" id="id-total"></div>
          </div>

        </div>

        <div class="id-main">

          <div class="id-panel">

            <h3>산업 연관효과 스냅샷</h3>

            <p class="id-chartnote">
              영향력계수 순위 기준 · 상대 순위 점수
            </p>

            <svg class="id-gauge"
                 viewBox="0 0 300 198"
                 role="img"
                 aria-label="산업 상대 순위 계기판">

              <path
                d="M 36 150 A 114 114 0 0 1 264 150"
                fill="none"
                stroke="#e3e9ef"
                stroke-width="37"
                pathLength="100"
              />

              <path
                id="id-gauge-fill"
                d="M 36 150 A 114 114 0 0 1 264 150"
                fill="none"
                stroke="#14b879"
                stroke-width="37"
                pathLength="100"
                stroke-dasharray="0 100"
              />

              <text id="id-gauge-number"
                    x="150" y="118"
                    text-anchor="middle"
                    font-size="39"
                    font-weight="750"
                    fill="#27364c"></text>

              <text x="150" y="143"
                    text-anchor="middle"
                    font-size="13"
                    fill="#697589">
                상대 순위 점수
              </text>

              <text x="35" y="187"
                    font-size="12"
                    fill="#768398">
                하위
              </text>

              <text x="241" y="187"
                    font-size="12"
                    fill="#768398">
                상위
              </text>
            </svg>

            <div class="id-row">
              <span>선택 산업</span>
              <span id="id-name"></span>
            </div>

            <div class="id-row">
              <span>감응도계수 순위</span>
              <span id="id-srank"></span>
            </div>

            <div class="id-row">
              <span>연관효과 유형</span>
              <span id="id-type"></span>
            </div>

          </div>

          <div class="id-panel">

            <h3>산업별 계수 순위 분포</h3>

            <p class="id-chartnote">
              연도별 추세가 아닌 산업별 순위 곡선
              · 두 계수는 각각 내림차순 정렬
            </p>

            <div class="id-legend">
              <span>
                <i class="id-dot"
                   style="background:#285b94"></i>
                영향력계수
              </span>

              <span>
                <i class="id-dot"
                   style="background:#dc6771"></i>
                감응도계수
              </span>

              <span>● 선택 산업 위치</span>
            </div>

            <svg id="id-plot"
                 class="id-plot"
                 viewBox="0 0 640 295"
                 role="img"
                 aria-label="산업별 계수 순위 분포">
            </svg>

            <div id="id-insight"
                 class="id-insight"></div>

          </div>

        </div>
      </div>
    </div>
  `;

  if (host.tagName.toLowerCase() === 'main') {
    host.append(section);
  } else {
    host.insertAdjacentElement('afterend', section);
  }

  // 데이터 저장
  let rows = [];
  let influenceRank = new Map();
  let sensitivityRank = new Map();
  let epoch = 0;

  const f4 = n => Number(n).toFixed(4);

  function set(id, value) {
    el(id).textContent = value;
  }

  function rankMap(key) {
    const sorted = [...rows].sort(
      (a, b) => b[key] - a[key]
    );

    const result = new Map();

    sorted.forEach((r, i) => {
      const previous = sorted[i - 1];

      const rank =
        i > 0 && previous[key] === r[key]
          ? result.get(previous.code)
          : i + 1;

      result.set(r.code, rank);
    });

    return result;
  }

  // 평균 대비 표시
  function pill(id, value) {
    const node = el(id);

    node.className =
      'id-pill' + (value < 1 ? ' low' : '');

    const difference = (value - 1) * 100;

    node.textContent =
      (value >= 1 ? '▲ 평균 대비 +' : '▼ 평균 대비 ') +
      difference.toFixed(2) + '%';
  }

  // 산업분류 변경 시 초기화
  function reset() {
    epoch++;
    rows = [];

    el('id-report').hidden = true;
    el('id-search').value = '';
    el('id-search').disabled = true;
    el('id-sector').disabled = true;
    el('id-sector').replaceChildren();

    set(
      'id-status',
      '새 분류의 Excel 자료를 불러온 뒤 다시 분석하세요.'
    );
  }

  const loadButton = el('load-basic');

  if (loadButton) {
    loadButton.addEventListener('click', reset, true);
  }

  const classification = el('io-classification');

  if (classification) {
    classification.addEventListener('change', reset);
  }

  // 산업 검색
  function refreshChoices(preferred = '') {
    const query = el('id-search')
      .value.trim()
      .toLowerCase();

    const filtered = rows.filter(r =>
      (r.name + ' ' + r.code)
        .toLowerCase()
        .includes(query)
    );

    const select = el('id-sector');

    select.replaceChildren(
      ...filtered.map(r => {
        const option = document.createElement('option');

        option.value = r.code;
        option.textContent =
          r.name + ' (' + r.code + ')';

        return option;
      })
    );

    if (filtered.some(r => r.code === preferred)) {
      select.value = preferred;
    }

    if (select.value) {
      render(select.value);
    } else {
      el('id-report').hidden = true;
      set('id-status', '검색 결과가 없습니다.');
    }
  }

  // 산업별 계수 분포 선그래프
  function drawDistribution(selected) {
    const svg = el('id-plot');
    const ns = 'http://www.w3.org/2000/svg';

    svg.replaceChildren();

    function add(tag, attributes, content) {
      const node = document.createElementNS(ns, tag);

      Object.entries(attributes).forEach(([key, value]) => {
        node.setAttribute(key, String(value));
      });

      if (content !== undefined) {
        node.textContent = content;
      }

      svg.append(node);
      return node;
    }

    const n = rows.length;

    const left = 50;
    const right = 622;
    const top = 18;
    const bottom = 243;

    const max = Math.max(
      1.15,
      ...rows.map(r =>
        Math.max(r.influence, r.sensitivity)
      )
    ) * 1.07;

    const x = i =>
      left + i / Math.max(1, n - 1) * (right - left);

    const y = value =>
      bottom - value / max * (bottom - top);

    // 가로 기준선
    for (let i = 0; i <= 4; i++) {
      const value = max * i / 4;

      add('line', {
        x1: left,
        y1: y(value),
        x2: right,
        y2: y(value),
        stroke: '#e6eaf0',
        'stroke-width': 1
      });

      add('text', {
        x: 42,
        y: y(value) + 4,
        'text-anchor': 'end',
        'font-size': 12,
        fill: '#7b8796'
      }, value.toFixed(1));
    }

    // 전산업 평균값 1
    add('line', {
      x1: left,
      y1: y(1),
      x2: right,
      y2: y(1),
      stroke: '#a4aebb',
      'stroke-dasharray': '5 5'
    });

    const series = [
      ['influence', '#285b94', influenceRank],
      ['sensitivity', '#dc6771', sensitivityRank]
    ];

    series.forEach(([key, color, rankings]) => {
      const ordered = [...rows].sort(
        (a, b) => b[key] - a[key]
      );

      const path = ordered.map((r, i) =>
        (i ? 'L' : 'M') +
        x(i).toFixed(2) + ' ' +
        y(r[key]).toFixed(2)
      ).join(' ');

      add('path', {
        d: path,
        fill: 'none',
        stroke: color,
        'stroke-width': 2.5,
        'stroke-linejoin': 'round'
      });

      // 선택한 산업 강조
      const position = rankings.get(selected.code) - 1;

      add('circle', {
        cx: x(position),
        cy: y(selected[key]),
        r: 6,
        fill: color,
        stroke: '#ffffff',
        'stroke-width': 2
      });
    });

    add('text', {
      x: left,
      y: 264,
      'font-size': 12,
      fill: '#7b8796'
    }, '1위');

    add('text', {
      x: right,
      y: 264,
      'text-anchor': 'end',
      'font-size': 12,
      fill: '#7b8796'
    }, n + '위');

    add('text', {
      x: (left + right) / 2,
      y: 284,
      'text-anchor': 'middle',
      'font-size': 12,
      fill: '#65758b'
    }, '산업별 순위 (높은 계수 → 낮은 계수)');
  }

  // 상세 분석 카드 갱신
  function render(code) {
    const r = rows.find(item => item.code === code);
    if (!r) return;

    const n = rows.length;
    const ir = influenceRank.get(code);
    const sr = sensitivityRank.get(code);

    set('id-name', r.name + ' (' + r.code + ')');
    set('id-influence', f4(r.influence));
    set('id-sensitivity', f4(r.sensitivity));
    set('id-rank', ir + '위');
    set('id-total', '전체 ' + n + '개 산업 중');
    set('id-srank', sr + '위 / ' + n + '개 산업');

    pill('id-influence-pill', r.influence);
    pill('id-sensitivity-pill', r.sensitivity);

    // 순위 기반 상대 점수: 높은 순위일수록 100에 가까움
    const score = Math.max(
      0,
      Math.min(100, (n - ir + 1) / n * 100)
    );

    set(
      'id-rank-percent',
      '상위 약 ' + (ir / n * 100).toFixed(1) + '%'
    );

    set('id-gauge-number', score.toFixed(1) + '%');

    el('id-gauge-fill').setAttribute(
      'stroke-dasharray',
      score.toFixed(2) + ' 100'
    );

    const highInfluence = r.influence >= 1;
    const highSensitivity = r.sensitivity >= 1;

    let category;

    if (highInfluence && highSensitivity) {
      category = '전방·후방 모두 평균 이상';
    } else if (highInfluence) {
      category = '후방 연관효과 우세';
    } else if (highSensitivity) {
      category = '전방 연관효과 우세';
    } else {
      category = '전방·후방 모두 평균 미만';
    }

    set('id-type', category);

    set(
      'id-insight',
      r.name + ' 산업은 영향력계수 ' +
      f4(r.influence) + ' (' + ir + '위), ' +
      '감응도계수 ' + f4(r.sensitivity) +
      ' (' + sr + '위)입니다. ' +
      category + ' 유형이며, ' +
      '두 계수의 기준값은 1입니다.'
    );

    drawDistribution(r);

    el('id-report').hidden = false;

    set(
      'id-status',
      '현재 선택: ' + r.name +
      ' · ' + n + '개 산업 기준'
    );
  }

  // 검색 이벤트
  el('id-search').addEventListener('input', () => {
    refreshChoices('');
  });

  // 산업 변경 이벤트
  el('id-sector').addEventListener('change', e => {
    render(e.target.value);
  });

  // 분석 실행
  el('id-load').addEventListener('click', async () => {
    if (
      el('sheet').disabled ||
      typeof call !== 'function'
    ) {
      set(
        'id-status',
        '먼저 위에서 Excel 파일을 불러오세요.'
      );
      return;
    }

    const myEpoch = ++epoch;
    const button = el('id-load');

    button.disabled = true;

    set('id-status', '산업별 지표 분석 중…');

    try {
      const data = await call('analyze', {});

      if (myEpoch !== epoch) return;

      if (
        !Array.isArray(data.results) ||
        !data.results.length
      ) {
        throw Error('분석 결과가 비어 있습니다.');
      }

      rows = data.results.map(r => ({
        code: String(r.code),
        name: String(r.name),
        influence: Number(r.influence),
        sensitivity: Number(r.sensitivity)
      }));

      influenceRank = rankMap('influence');
      sensitivityRank = rankMap('sensitivity');

      el('id-search').disabled = false;
      el('id-sector').disabled = false;

      refreshChoices(rows[0].code);

    } catch (error) {
      if (myEpoch === epoch) {
        set(
          'id-status',
          '분석 실패: ' + error.message
        );
      }

    } finally {
      button.disabled = false;
    }
  });
})();
