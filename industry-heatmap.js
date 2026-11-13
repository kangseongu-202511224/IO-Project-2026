
/* 산업별 영향력계수 / 감응도계수 히트맵 */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const existing = $('industry-heatmap');
  const anchor = $('industry-detail') ||
    $('industry-analysis') ||
    document.querySelector('main');

  if (!anchor) return;

  const style = document.createElement('style');
  style.textContent = `
    #industry-heatmap {
      margin:32px 0;
      color:#223148;
      font-family:inherit;
    }
    #industry-heatmap * {
      box-sizing:border-box;
    }
    #industry-heatmap .hm-shell {
      padding:22px;
      background:#f3f6fb;
      border:1px solid #e1e8f2;
      border-radius:20px;
    }
    #industry-heatmap .hm-kicker {
      color:#5075ae;
      font-size:11px;
      font-weight:750;
      letter-spacing:1.4px;
    }
    #industry-heatmap .hm-title {
      font-size:25px;
      margin:6px 0;
      color:#182b47;
    }
    #industry-heatmap .hm-desc {
      font-size:13px;
      color:#65748b;
      line-height:1.7;
      margin:0 0 16px;
    }
    #industry-heatmap .hm-toolbar {
      display:flex;
      flex-wrap:wrap;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      margin-bottom:12px;
    }
    #industry-heatmap button.hm-run {
      border:0;
      padding:12px 18px;
      border-radius:10px;
      background:#254e85;
      color:white;
      font:inherit;
      font-weight:650;
      cursor:pointer;
    }
    #industry-heatmap button.hm-run:disabled {
      opacity:.55;
      cursor:wait;
    }
    #industry-heatmap .hm-status {
      font-size:13px;
      color:#64748b;
      min-height:20px;
    }
    #industry-heatmap .hm-summary {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:12px;
      margin:15px 0;
    }
    #industry-heatmap .hm-stat {
      background:white;
      border:1px solid #e3eaf3;
      border-radius:13px;
      padding:16px;
    }
    #industry-heatmap .hm-stat small {
      display:block;
      font-size:12px;
      color:#6a7890;
    }
    #industry-heatmap .hm-stat strong {
      display:block;
      font-size:25px;
      margin:6px 0;
      color:#233a5e;
    }
    #industry-heatmap .hm-stat span {
      font-size:12px;
      color:#8290a3;
    }
    #industry-heatmap .hm-card {
      background:white;
      padding:18px;
      border:1px solid #e1e8f1;
      border-radius:15px;
      box-shadow:0 4px 14px rgba(20,42,82,.04);
      margin:16px 0;
    }
    #industry-heatmap .hm-cardhead {
      display:flex;
      flex-wrap:wrap;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      margin-bottom:10px;
    }
    #industry-heatmap .hm-cardhead h3 {
      font-size:19px;
      margin:0;
      color:#253954;
    }
    #industry-heatmap .hm-sub {
      margin:4px 0 14px;
      font-size:12px;
      color:#75839a;
    }
    #industry-heatmap .hm-controls {
      display:flex;
      flex-wrap:wrap;
      gap:9px;
      margin:12px 0;
    }
    #industry-heatmap .hm-controls label {
      display:grid;
      gap:5px;
      font-size:12px;
      color:#52657e;
      flex:1;
      min-width:145px;
    }
    #industry-heatmap .hm-controls input,
    #industry-heatmap .hm-controls select {
      width:100%;
      padding:9px 10px;
      border:1px solid #d7e0ed;
      border-radius:9px;
      background:white;
      color:#263a55;
      font:inherit;
    }
    #industry-heatmap .hm-scroll {
      max-height:530px;
      overflow:auto;
      border:1px solid #e8edf4;
      border-radius:10px;
    }
    #industry-heatmap table {
      width:100%;
      min-width:590px;
      border-collapse:separate;
      border-spacing:0;
      table-layout:auto;
    }
    #industry-heatmap th,
    #industry-heatmap td {
      padding:10px 12px;
      border-bottom:1px solid #edf1f6;
      font-size:13px;
      text-align:left;
    }
    #industry-heatmap thead th {
      position:sticky;
      top:0;
      z-index:2;
      background:#eaf0f7;
      color:#425672;
      font-weight:750;
    }
    #industry-heatmap td.hm-rank {
      width:54px;
      color:#7c8ba0;
    }
    #industry-heatmap td.hm-name {
      min-width:145px;
      font-weight:600;
    }
    #industry-heatmap td.hm-code {
      color:#71819a;
      font-size:12px;
    }
    #industry-heatmap td.hm-diff {
      white-space:nowrap;
      font-weight:650;
    }
    #industry-heatmap .hm-heat {
      display:block;
      min-width:105px;
      text-align:center;
      padding:9px 10px;
      border-radius:7px;
      font-variant-numeric:tabular-nums;
      font-weight:750;
    }
    #industry-heatmap tr.hm-active td {
      outline:1px solid #8cb5f9;
      background:#f7faff;
    }
    #industry-heatmap tbody tr {
      cursor:pointer;
    }
    #industry-heatmap tbody tr:hover td {
      background:#f1f6ff;
    }
    #industry-heatmap .hm-detail {
      background:#f1f5fb;
      padding:12px;
      border-radius:10px;
      color:#425672;
      font-size:13px;
      margin-top:12px;
      line-height:1.7;
    }
    #industry-heatmap .hm-legend {
      display:flex;
      align-items:center;
      flex-wrap:wrap;
      gap:8px;
      color:#65748b;
      font-size:12px;
      margin:8px 0 0;
    }
    #industry-heatmap .hm-swatch {
      display:inline-block;
      width:15px;
      height:15px;
      border-radius:4px;
      vertical-align:middle;
    }
    #industry-heatmap .hm-footnote {
      font-size:12px;
      color:#75839a;
      line-height:1.7;
      margin:15px 0 0;
    }
    @media(max-width:650px) {
      #industry-heatmap .hm-shell {
        padding:12px;
      }
      #industry-heatmap .hm-summary {
        grid-template-columns:1fr;
      }
      #industry-heatmap .hm-card {
        padding:12px;
      }
    }
  `;
  document.head.append(style);

  const section = existing ||
    document.createElement('section');

  section.id = 'industry-heatmap';

  section.innerHTML = `
    <div class="hm-shell">
      <div class="hm-kicker">
        INDUSTRY INTELLIGENCE · 2023
      </div>

      <h2 class="hm-title">산업연관효과 히트맵</h2>

      <p class="hm-desc">
        영향력계수와 감응도계수를 각각의 히트맵으로
        표시합니다. 산업별 순위, 계수, 전산업 평균(1)
        대비 차이를 비교해 보세요.
      </p>

      <div class="hm-toolbar">
        <button class="hm-run"
                id="hm-run"
                type="button">
          현재 분류 히트맵 분석
        </button>

        <span class="hm-status"
              id="hm-status"
              role="status">
          먼저 위에서 Excel 자료를 불러오세요.
        </span>
      </div>

      <div id="hm-content" hidden>
        <div class="hm-summary">
          <div class="hm-stat">
            <small>영향력계수 · 전산업 평균</small>
            <strong id="hm-inf-avg">1.0000</strong>
            <span>후방 연관효과의 상대적 수준</span>
          </div>

          <div class="hm-stat">
            <small>감응도계수 · 전산업 평균</small>
            <strong id="hm-sen-avg">1.0000</strong>
            <span>전방 연관효과의 상대적 수준</span>
          </div>
        </div>

        <div id="hm-inf-card" class="hm-card"></div>
        <div id="hm-sen-card" class="hm-card"></div>

        <p class="hm-footnote">
          색상 기준: 파랑은 1 이상, 빨강은 1 미만,
          1에 가까우면 연한 색입니다.
          이 표는 산업별 계수를 보여주며,
          산업 간 거래행렬(Ad) 히트맵과는 다른 분석입니다.
          순위는 현재 불러온 산업분류 전체 기준입니다.
        </p>
      </div>
    </div>
  `;

  if (!existing) {
    if (anchor.tagName.toLowerCase() === 'main') {
      anchor.append(section);
    } else {
      anchor.insertAdjacentElement(
        'afterend',
        section
      );
    }
  }

  let records = [];
  let epoch = 0;

  const state = {
    influence: {
      q: '', sort: 'high', limit: '20', selected: null
    },
    sensitivity: {
      q: '', sort: 'high', limit: '20', selected: null
    }
  };

  function reset() {
    epoch++;
    records = [];

    $('hm-content').hidden = true;
    $('hm-status').textContent =
      '새 분류의 Excel을 불러온 뒤 히트맵 분석을 실행하세요.';

    for (const s of Object.values(state)) {
      s.q = '';
      s.sort = 'high';
      s.limit = '20';
      s.selected = null;
    }
  }

  $('load-basic')?.addEventListener(
    'click', reset, true
  );

  $('io-classification')?.addEventListener(
    'change', reset
  );

  // 평균 1 기준의 발산형 색상
  function color(value) {
    const t = Math.min(
      1,
      Math.abs(value - 1) / 0.5
    );

    const alpha = (0.09 + t * 0.65).toFixed(3);

    return value >= 1
      ? `rgba(37,99,235,${alpha})`
      : `rgba(215,75,91,${alpha})`;
  }

  function rankBy(metric) {
    const ordered = [...records].sort(
      (a, b) => b[metric] - a[metric]
    );

    const ranks = new Map();

    ordered.forEach((r, i) => {
      const prev = ordered[i - 1];

      ranks.set(
        r.code,
        i > 0 && r[metric] === prev[metric]
          ? ranks.get(prev.code)
          : i + 1
      );
    });

    return ranks;
  }

  // 영향력계수와 감응도계수 카드를 각각 생성
  function makeCard(metric, containerId, title, subtitle) {
    const card = $(containerId);

    const prefix = metric === 'influence'
      ? 'hm-inf'
      : 'hm-sen';

    card.innerHTML = `
      <div class="hm-cardhead">
        <h3>${title}</h3>
        <span class="hm-kicker">
          ${metric === 'influence'
            ? 'BACKWARD LINKAGE'
            : 'FORWARD LINKAGE'}
        </span>
      </div>

      <p class="hm-sub">${subtitle}</p>

      <div class="hm-controls">
        <label>
          산업 검색
          <input id="${prefix}-search"
                 type="search"
                 placeholder="산업명 또는 코드">
        </label>

        <label>
          정렬
          <select id="${prefix}-sort">
            <option value="high">계수 높은 순</option>
            <option value="low">계수 낮은 순</option>
            <option value="name">산업명 가나다순</option>
          </select>
        </label>

        <label>
          표시 개수
          <select id="${prefix}-limit">
            <option value="20">20개</option>
            <option value="40">40개</option>
            <option value="80">80개</option>
            <option value="all">전체 산업</option>
          </select>
        </label>
      </div>

      <div class="hm-legend">
        <span class="hm-swatch"
              style="background:#a8bdf4"></span>
        1 이상 · 파랑

        <span class="hm-swatch"
              style="background:#efb2bb"></span>
        1 미만 · 빨강

        <span style="color:#8c98aa">
          기준값 1
        </span>
      </div>

      <p class="hm-sub"
         id="${prefix}-count"></p>

      <div class="hm-scroll">
        <table>
          <thead>
            <tr>
              <th>순위</th>
              <th>산업명</th>
              <th>코드</th>
              <th>계수 히트맵</th>
              <th>평균 대비</th>
            </tr>
          </thead>

          <tbody id="${prefix}-rows"></tbody>
        </table>
      </div>

      <div class="hm-detail"
           id="${prefix}-detail"
           role="status">
        산업 행을 클릭하면 상세 정보를 볼 수 있습니다.
      </div>
    `;

    const s = state[metric];

    $(`${prefix}-search`).addEventListener(
      'input',
      e => {
        s.q = e.target.value.trim().toLowerCase();
        renderRows(metric);
      }
    );

    $(`${prefix}-sort`).addEventListener(
      'change',
      e => {
        s.sort = e.target.value;
        renderRows(metric);
      }
    );

    $(`${prefix}-limit`).addEventListener(
      'change',
      e => {
        s.limit = e.target.value;
        renderRows(metric);
      }
    );

    renderRows(metric);
  }

  // 히트맵 행 표시
  function renderRows(metric) {
    const prefix = metric === 'influence'
      ? 'hm-inf'
      : 'hm-sen';

    const s = state[metric];
    const ranks = rankBy(metric);

    let filtered = records.filter(r =>
      `${r.code} ${r.name}`
        .toLowerCase()
        .includes(s.q)
    );

    filtered.sort((a, b) => {
      if (s.sort === 'name') {
        return a.name.localeCompare(b.name, 'ko');
      }

      if (s.sort === 'low') {
        return a[metric] - b[metric];
      }

      return b[metric] - a[metric];
    });

    const total = filtered.length;

    if (s.limit !== 'all') {
      filtered = filtered.slice(
        0,
        Number(s.limit)
      );
    }

    $(`${prefix}-count`).textContent =
      `검색 결과 ${total}개 · ` +
      `현재 ${filtered.length}개 표시 · ` +
      `순위는 전체 ${records.length}개 산업 기준`;

    const body = $(`${prefix}-rows`);
    body.replaceChildren();

    filtered.forEach(r => {
      const tr = document.createElement('tr');

      if (s.selected === r.code) {
        tr.className = 'hm-active';
      }

      const rank = document.createElement('td');
      rank.className = 'hm-rank';
      rank.textContent = ranks.get(r.code) + '위';

      const name = document.createElement('td');
      name.className = 'hm-name';
      name.textContent = r.name;

      const code = document.createElement('td');
      code.className = 'hm-code';
      code.textContent = r.code;

      const heatTd = document.createElement('td');
      const heat = document.createElement('span');

      heat.className = 'hm-heat';
      heat.style.background = color(r[metric]);
      heat.textContent = r[metric].toFixed(4);

      heatTd.append(heat);

      const delta = (r[metric] - 1) * 100;

      const diff = document.createElement('td');
      diff.className = 'hm-diff';

      diff.style.color = delta >= 0
        ? '#255dc0'
        : '#bd4859';

      diff.textContent =
        `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}%`;

      tr.append(
        rank, name, code, heatTd, diff
      );

      // 행 클릭 시 선택 산업 상세 표시
      tr.addEventListener('click', () => {
        s.selected = r.code;

        $(`${prefix}-detail`).textContent =
          `${r.name} (${r.code}) · ` +
          `${metric === 'influence'
            ? '영향력계수'
            : '감응도계수'} ` +
          `${r[metric].toFixed(4)} · ` +
          `전체 ${ranks.get(r.code)}위 / ` +
          `${records.length}개 · ` +
          `평균 대비 ${delta >= 0 ? '+' : ''}` +
          `${delta.toFixed(2)}%`;

        renderRows(metric);
      });

      body.append(tr);
    });

    if (!filtered.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');

      td.colSpan = 5;
      td.textContent = '검색된 산업이 없습니다.';

      tr.append(td);
      body.append(tr);
    }
  }

  // 히트맵 실행
  $('hm-run').addEventListener('click', async () => {
    if (
      $('sheet')?.disabled ||
      typeof call !== 'function'
    ) {
      $('hm-status').textContent =
        '먼저 위에서 산업분류 Excel을 불러오세요.';
      return;
    }

    const token = ++epoch;
    const button = $('hm-run');

    button.disabled = true;

    $('hm-status').textContent =
      '영향력계수·감응도계수 분석 중…';

    try {
      const data = await call('analyze', {});

      if (token !== epoch) return;

      if (
        !Array.isArray(data.results) ||
        !data.results.length
      ) {
        throw Error('분석 결과가 없습니다.');
      }

      records = data.results.map(r => ({
        code: String(r.code),
        name: String(r.name),
        influence: Number(r.influence),
        sensitivity: Number(r.sensitivity)
      }));

      if (records.some(r =>
        !Number.isFinite(r.influence) ||
        !Number.isFinite(r.sensitivity)
      )) {
        throw Error('유효하지 않은 계수가 있습니다.');
      }

      for (const s of Object.values(state)) {
        s.q = '';
        s.sort = 'high';
        s.limit = '20';
        s.selected = null;
      }

      const avg = metric => (
        records.reduce(
          (sum, r) => sum + r[metric],
          0
        ) / records.length
      ).toFixed(4);

      $('hm-inf-avg').textContent =
        avg('influence');

      $('hm-sen-avg').textContent =
        avg('sensitivity');

      makeCard(
        'influence',
        'hm-inf-card',
        '01 · 영향력계수 히트맵',
        '후방 연관효과 · 한 산업의 최종수요 증가가 유발하는 상대적 생산효과'
      );

      makeCard(
        'sensitivity',
        'hm-sen-card',
        '02 · 감응도계수 히트맵',
        '전방 연관효과 · 모든 산업의 최종수요 증가에 대한 상대적 생산 반응'
      );

      $('hm-content').hidden = false;

      $('hm-status').textContent =
        `분석 완료 · ${records.length}개 산업 · ` +
        '두 히트맵 준비됨';

    } catch (e) {
      if (token === epoch) {
        $('hm-status').textContent =
          '분석 실패: ' + e.message;
      }

    } finally {
      button.disabled = false;
    }
  });
})();
