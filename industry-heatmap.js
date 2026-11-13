(() => {
  'use strict';

  const el = id => document.getElementById(id);
  const anchor = el('industry-detail') || document.querySelector('main');

  if (!anchor || el('industry-heatmap')) return;

  const style = document.createElement('style');
  style.textContent = `
    #industry-heatmap {
      margin:28px 0;
      color:#27344b;
      font-family:inherit;
    }

    #industry-heatmap * {
      box-sizing:border-box;
    }

    #industry-heatmap .hm-shell {
      background:#f4f5f7;
      border-radius:18px;
      padding:22px;
    }

    #industry-heatmap .hm-head h2 {
      margin:0 0 6px;
      font-size:26px;
      color:#2a374d;
    }

    #industry-heatmap .hm-sub {
      margin:0 0 16px;
      color:#6f7d90;
      font-size:13px;
    }

    #industry-heatmap .hm-controls {
      display:flex;
      flex-wrap:wrap;
      gap:10px;
      align-items:end;
      margin-bottom:12px;
    }

    #industry-heatmap .hm-controls label {
      display:grid;
      gap:5px;
      font-size:12px;
      color:#59677b;
      min-width:160px;
    }

    #industry-heatmap .hm-controls select,
    #industry-heatmap .hm-controls button {
      padding:11px 12px;
      border-radius:9px;
      font:inherit;
    }

    #industry-heatmap .hm-controls select {
      border:1px solid #d7dee8;
      background:white;
      color:#233146;
    }

    #industry-heatmap .hm-btn {
      border:0;
      background:#284f83;
      color:white;
      cursor:pointer;
    }

    #industry-heatmap .hm-btn:disabled {
      opacity:.55;
      cursor:wait;
    }

    #industry-heatmap .hm-status {
      font-size:13px;
      color:#64748b;
      margin:0 0 14px;
    }

    #industry-heatmap .hm-card {
      background:white;
      border:1px solid #e5e9ef;
      border-radius:16px;
      padding:16px;
      box-shadow:0 3px 12px rgba(20,38,70,.035);
      overflow:auto;
    }

    #industry-heatmap .hm-caption {
      font-weight:700;
      font-size:14px;
      color:#31425b;
      margin-bottom:12px;
    }

    #industry-heatmap table {
      border-collapse:collapse;
      min-width:920px;
      width:100%;
      table-layout:fixed;
    }

    #industry-heatmap th,
    #industry-heatmap td {
      border:1px solid #e4e8ee;
      text-align:center;
      padding:11px 8px;
      font-size:13px;
    }

    #industry-heatmap th {
      background:#eceff3;
      color:#2e3b50;
      font-weight:700;
    }

    #industry-heatmap .hm-left {
      background:#eceff3;
      text-align:left;
      font-weight:600;
      min-width:210px;
      white-space:normal;
      word-break:keep-all;
    }

    #industry-heatmap .hm-avg-head {
      background:#e1e7ee;
      font-weight:700;
    }

    #industry-heatmap .hm-foot {
      font-size:12px;
      color:#6d7c90;
      margin-top:10px;
      line-height:1.6;
    }

    @media (max-width:760px) {
      #industry-heatmap .hm-shell {
        padding:12px;
      }
    }
  `;
  document.head.append(style);

  const section = document.createElement('section');
  section.id = 'industry-heatmap';
  section.innerHTML = `
    <div class="hm-shell">
      <div class="hm-head">
        <h2>산업연관 히트맵</h2>
        <p class="hm-sub">
          국산투입계수(Ad)를 기반으로 상위 산업 간 연관구조를 색으로 시각화합니다.
        </p>
      </div>

      <div class="hm-controls">
        <label>
          선택 기준
          <select id="hm-metric">
            <option value="influence">영향력계수 상위 산업</option>
            <option value="sensitivity">감응도계수 상위 산업</option>
          </select>
        </label>

        <label>
          표시 개수
          <select id="hm-count">
            <option value="8">8개 산업</option>
            <option value="10">10개 산업</option>
            <option value="12" selected>12개 산업</option>
            <option value="15">15개 산업</option>
          </select>
        </label>

        <button id="hm-load" class="hm-btn" type="button">
          히트맵 불러오기
        </button>
      </div>

      <p id="hm-status" class="hm-status" role="status">
        먼저 Excel 자료를 불러온 뒤 히트맵을 실행하세요.
      </p>

      <div id="hm-wrap" hidden class="hm-card">
        <div id="hm-caption" class="hm-caption"></div>
        <div id="hm-table"></div>
        <div class="hm-foot">
          색이 진한 파랑일수록 상대적으로 값이 크고,
          색이 진한 빨강일수록 상대적으로 값이 작습니다.
          마지막 열과 마지막 행은 선택된 산업 집합 내 평균입니다.
        </div>
      </div>
    </div>
  `;

  if (anchor.tagName.toLowerCase() === 'main') {
    anchor.append(section);
  } else {
    anchor.insertAdjacentElement('afterend', section);
  }

  function hex(v) {
    const s = Math.round(v).toString(16).padStart(2, '0');
    return s;
  }

  function mix(a, b, t) {
    return a + (b - a) * t;
  }

  function colorFor(value, min, max) {
    if (!Number.isFinite(value)) return '#ffffff';
    if (max === min) return '#f4f5f7';

    const mid = (min + max) / 2;

    // 낮은 값: 빨강 / 중간: 연회색 / 높은 값: 파랑
    let r, g, b;

    if (value <= mid) {
      const t = (value - min) / Math.max(1e-12, (mid - min));
      r = mix(224, 240, t);
      g = mix(76, 242, t);
      b = mix(76, 245, t);
    } else {
      const t = (value - mid) / Math.max(1e-12, (max - mid));
      r = mix(240, 74, t);
      g = mix(242, 89, t);
      b = mix(245, 229, t);
    }

    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }

  function buildTable(data) {
    const names = data.names;
    const codes = data.codes;
    const matrix = data.matrix;
    const rowMeans = data.rowMeans;
    const colMeans = data.colMeans;
    const overallMean = data.overallMean;

    const values = matrix.flat();
    values.push(...rowMeans, ...colMeans, overallMean);

    const min = Math.min(...values);
    const max = Math.max(...values);

    const table = document.createElement('table');

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');

    const corner = document.createElement('th');
    corner.textContent = '산업';
    headRow.append(corner);

    names.forEach((name, i) => {
      const th = document.createElement('th');
      th.innerHTML = `${name}<br><span style="font-size:11px;color:#6d7c90">${codes[i]}</span>`;
      headRow.append(th);
    });

    const avgTh = document.createElement('th');
    avgTh.className = 'hm-avg-head';
    avgTh.textContent = '평균';
    headRow.append(avgTh);

    thead.append(headRow);
    table.append(thead);

    const tbody = document.createElement('tbody');

    names.forEach((name, r) => {
      const tr = document.createElement('tr');

      const left = document.createElement('th');
      left.className = 'hm-left';
      left.innerHTML = `${name}<br><span style="font-size:11px;color:#6d7c90">${codes[r]}</span>`;
      tr.append(left);

      matrix[r].forEach(v => {
        const td = document.createElement('td');
        td.style.background = colorFor(v, min, max);
        td.textContent = Number(v).toFixed(3);
        tr.append(td);
      });

      const avgTd = document.createElement('td');
      avgTd.className = 'hm-avg-head';
      avgTd.style.background = '#f0f3f7';
      avgTd.textContent = Number(rowMeans[r]).toFixed(3);
      tr.append(avgTd);

      tbody.append(tr);
    });

    const totalRow = document.createElement('tr');

    const totalLeft = document.createElement('th');
    totalLeft.className = 'hm-left';
    totalLeft.textContent = '평균';
    totalRow.append(totalLeft);

    colMeans.forEach(v => {
      const td = document.createElement('td');
      td.className = 'hm-avg-head';
      td.style.background = '#f0f3f7';
      td.textContent = Number(v).toFixed(3);
      totalRow.append(td);
    });

    const all = document.createElement('td');
    all.className = 'hm-avg-head';
    all.style.background = '#e6ebf2';
    all.textContent = Number(overallMean).toFixed(3);
    totalRow.append(all);

    tbody.append(totalRow);
    table.append(tbody);

    return table;
  }

  el('hm-load').addEventListener('click', async () => {
    if (el('sheet').disabled || typeof call !== 'function') {
      el('hm-status').textContent =
        '먼저 위에서 Excel 자료를 불러오세요.';
      return;
    }

    const button = el('hm-load');
    button.disabled = true;
    el('hm-status').textContent = '히트맵 계산 중…';

    try {
      const metric = el('hm-metric').value;
      const count = Number(el('hm-count').value);

      const data = await call('heatmap', { metric, count });

      el('hm-caption').textContent =
        (metric === 'influence'
          ? '영향력계수 상위 '
          : '감응도계수 상위 ') +
        data.count +
        '개 산업의 국산투입계수(Ad) 히트맵';

      const tableHost = el('hm-table');
      tableHost.replaceChildren(buildTable(data));

      el('hm-wrap').hidden = false;
      el('hm-status').textContent =
        '히트맵 생성 완료 · 선택 산업 수: ' + data.count + '개';

    } catch (error) {
      el('hm-status').textContent =
        '히트맵 생성 실패: ' + error.message;

    } finally {
      button.disabled = false;
    }
  });
})();
