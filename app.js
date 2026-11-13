
const $ = id => document.getElementById(id);
const fmt = x => Number(x).toLocaleString('ko-KR', {
  maximumFractionDigits: 3
});

let worker, nextId = 0;
let requests = new Map();
let sectors = [], rowChoices = [], cells = [];
let basket = [], result = null;

function text(tag, value) {
  const e = document.createElement(tag);
  e.textContent = value;
  return e;
}

function call(type, payload) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    requests.set(id, { resolve, reject });
    worker.postMessage({ id, type, payload });
  });
}

function startWorker() {
  worker = new Worker('./worker.js?v=20261113');

  worker.onmessage = ({ data: d }) => {
    if (d.type === 'status') {
      $('status').textContent = d.text;
      return;
    }
    const p = requests.get(d.id);
    if (!p) return;
    requests.delete(d.id);
    d.ok ? p.resolve(d.result) : p.reject(Error(d.error));
  };

  worker.onerror = e => {
    for (const p of requests.values()) {
      p.reject(Error(e.message || 'Worker 실행 오류'));
    }
    requests.clear();
  };
}

function options(el, list) {
  el.replaceChildren(...list.map(x => {
    const o = document.createElement('option');
    o.value = x.code;
    o.textContent = x.code + ' ' + x.name;
    return o;
  }));
}

function invalidate() {
  result = null;
  $('results').hidden = true;
}

async function load(buffer) {
  invalidate();
  basket = [];
  renderBasket();

  $('analyze-results').hidden = true;
  $('analyze-status').textContent =
    '자료를 불러온 후 분석 버튼을 누르세요.';

  const inputIds = [
    'sheet', 'row', 'sector', 'add', 'run',
    'row-search', 'col-search',
    'sector-search', 'amount'
  ];

  for (const id of inputIds) $(id).disabled = true;

  if (worker) worker.terminate();

  for (const p of requests.values()) {
    p.reject(Error('데이터 다시 로드'));
  }

  requests.clear();
  startWorker();

  try {
    const info = await call('init', buffer);
    sectors = info.sectors;

    options($('sector'), sectors);
    $('sector-search').value = '';
    $('row-search').value = '';
    $('col-search').value = '';

    $('sheet').replaceChildren(...info.sheets.map(s => {
      const o = text('option', s);
      o.value = s;
      return o;
    }));

    $('validation').textContent =
      JSON.stringify(info.residuals, null, 2) +
      '\n최대 절대 잔차: 허용값 1e-8 미만';

    for (const id of inputIds) $(id).disabled = false;

    await explore();

    $('status').textContent =
      '준비 완료 · ' + sectors.length +
      '개 부문 · ' + info.sheets.length +
      '개 시트 · 계수 검증 통과';

  } catch (e) {
    $('status').textContent =
      '준비 실패: ' + e.message;
  }
}

// 원자료 탐색
let exploreSeq = 0;

async function explore() {
  const seq = ++exploreSeq;

  try {
    const d = await call('explore', {
      sheet: $('sheet').value,
      row: $('row').value
    });

    if (seq !== exploreSeq) return;

    rowChoices = d.rows;
    filterRows(d.selected);
    cells = d.cells;

    $('unit').textContent = d.unit;
    $('explore-caption').textContent =
      $('sheet').value + ' / 행: ' +
      d.selected + ' ' + d.name;

    renderCells();

  } catch (e) {
    $('status').textContent = e.message;
  }
}

function filterRows(selected) {
  const q = $('row-search').value.trim();

  options(
    $('row'),
    rowChoices.filter(r =>
      (r.code + ' ' + r.name).includes(q)
    )
  );

  if ([...$('row').options].some(o => o.value === selected)) {
    $('row').value = selected;
  }
}

function renderCells() {
  const q = $('col-search').value.trim();

  $('cells').replaceChildren(
    ...cells.filter(c =>
      (c.code + ' ' + c.name).includes(q)
    ).map(c => {
      const tr = document.createElement('tr');

      for (const v of [
        c.code,
        c.name,
        c.value === null
          ? '빈 셀'
          : typeof c.value === 'number'
            ? fmt(c.value)
            : c.value
      ]) {
        tr.append(text('td', v));
      }
      return tr;
    })
  );
}

$('sheet').onchange = () => {
  $('row-search').value = '';
  $('row').replaceChildren();
  explore();
};

$('row').onchange = explore;

$('row-search').oninput = () => {
  filterRows();

  if ($('row').value) explore();
  else {
    $('cells').replaceChildren();
    $('explore-caption').textContent =
      '일치하는 행이 없습니다.';
  }
};

$('col-search').oninput = renderCells;

$('sector-search').oninput = () => {
  const q = $('sector-search').value.trim();
  options(
    $('sector'),
    sectors.filter(s =>
      (s.code + ' ' + s.name).includes(q)
    )
  );
};

// 최종수요 증가 시뮬레이션
function renderBasket() {
  $('basket').replaceChildren(...basket.map((s, i) => {
    const li = text(
      'li',
      s.code + ' ' + s.name +
      ' / ' + fmt(s.amount) + '백만원 '
    );

    const b = text('button', '삭제');
    b.type = 'button';

    b.onclick = () => {
      basket.splice(i, 1);
      invalidate();
      renderBasket();
    };

    li.append(b);
    return li;
  }));

  $('sim-status').textContent = basket.length
    ? basket.length + '개 입력 준비. 계산 버튼을 누르세요.'
    : '시나리오를 추가하세요.';
}

$('scenario').onsubmit = e => {
  e.preventDefault();

  const amount = Number($('amount').value);
  const s = sectors.find(
    s => s.code === $('sector').value
  );

  if (!s || !Number.isFinite(amount) || amount <= 0) {
    $('sim-status').textContent =
      '산업과 양의 증가액을 확인하세요.';
    return;
  }

  basket.push({ ...s, amount });
  invalidate();
  renderBasket();
};

$('clear').onclick = () => {
  basket = [];
  invalidate();
  renderBasket();
};

$('run').onclick = async () => {
  if (!basket.length) {
    $('sim-status').textContent =
      '시나리오를 먼저 추가하세요.';
    return;
  }

  const snapshot = basket.map(s => ({ ...s }));
  $('run').disabled = true;
  $('sim-status').textContent = '계산 중…';

  try {
    const r = await call('simulate', snapshot);

    if (JSON.stringify(snapshot) !== JSON.stringify(basket)) {
      $('sim-status').textContent =
        '입력이 변경되었습니다. 다시 계산하세요.';
      return;
    }

    result = r;
    renderResult();

    $('sim-status').textContent =
      '계산 완료. 아래 결과는 현재 시나리오에 대응합니다.';

  } catch (e) {
    invalidate();
    $('sim-status').textContent =
      '계산 실패: ' + e.message;

  } finally {
    $('run').disabled = false;
  }
};

function renderResult() {
  $('results').hidden = false;

  const summaries = [
    ['수요 증가액', result.demand],
    ['생산유발액', result.production],
    ['수입유발액', result.imports],
    ['부가가치유발액', result.valueAdded]
  ];

  $('cards').replaceChildren(...summaries.map(([title, v]) => {
    const d = text('div', title);
    d.className = 'card';
    d.append(
      text('strong', fmt(v)),
      text('span', '백만원')
    );
    return d;
  }));

  const max = Math.max(
    ...result.rows.map(r => r.production), 1
  );

  $('bars').replaceChildren(...result.rows.slice(0, 15).map(r => {
    const d = text(
      'div',
      r.name + ' · ' + fmt(r.production) + '백만원'
    );

    d.className = 'bar';

    const track = document.createElement('div');
    track.className = 'track';

    const fill = document.createElement('div');
    fill.className = 'fill';
    fill.style.width =
      Math.max(0, r.production / max * 100) + '%';

    track.append(fill);
    d.append(track);
    return d;
  }));

  $('result-rows').replaceChildren(...result.rows.map(r => {
    const tr = document.createElement('tr');

    [
      r.code, r.name,
      fmt(r.production),
      fmt(r.imports),
      fmt(r.valueAdded)
    ].forEach(v => tr.append(text('td', v)));

    return tr;
  }));
}

function csvCell(v) {
  let s = String(v);

  if (/^[=+@-]/.test(s) && typeof v !== 'number') {
    s = "'" + s;
  }

  return '"' + s.replaceAll('"', '""') + '"';
}

$('download').onclick = () => {
  if (!result) return;

  const rows = [
    [
      '산업코드', '산업명',
      '생산유발액_백만원',
      '수입유발액_백만원',
      '부가가치유발액_백만원'
    ],
    ...result.rows.map(r => [
      r.code, r.name,
      r.production, r.imports, r.valueAdded
    ])
  ];

  const csv = '\ufeff' +
    rows.map(r => r.map(csvCell).join(',')).join('\r\n');

  const url = URL.createObjectURL(
    new Blob([csv], {
      type: 'text/csv;charset=utf-8'
    })
  );

  const a = document.createElement('a');
  a.href = url;
  a.download = 'io-2023-results.csv';
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// 4가지 산업분류
const ioFiles = {
  basic: './data/io-2023.xlsx',
  large: './data/io-2023-large.xlsx',
  medium: './data/io-2023-medium.xlsx',
  small: './data/io-2023-small.xlsx'
};

const ioLabels = {
  basic: '기본부문',
  large: '대분류',
  medium: '중분류',
  small: '소분류'
};

const ioSelect = document.createElement('select');
ioSelect.id = 'io-classification';

for (const key of ['basic', 'small', 'medium', 'large']) {
  const option = document.createElement('option');
  option.value = key;
  option.textContent = ioLabels[key];
  ioSelect.append(option);
}

const basicButton = $('load-basic');
basicButton.parentNode.insertBefore(ioSelect, basicButton);

async function loadDefaultWorkbook() {
  try {
    $('status').textContent =
      ioLabels[ioSelect.value] + ' Excel 내려받는 중…';

    const response = await fetch(ioFiles[ioSelect.value]);

    if (!response.ok) {
      throw Error(
        'Excel 다운로드 실패 (HTTP ' +
        response.status + ')'
      );
    }

    await load(await response.arrayBuffer());

  } catch (error) {
    $('status').textContent =
      '준비 실패: ' + error.message;
  }
}

$('load-basic').onclick = async () => {
  const button = $('load-basic');
  const label = ioLabels[ioSelect.value];

  button.disabled = true;
  button.textContent = '불러오는 중…';

  try {
    await loadDefaultWorkbook();

    const ready = !$('sheet').disabled;

    button.textContent = ready
      ? label + ' 불러오기 완료'
      : label + ' 다시 불러오기';

  } finally {
    button.disabled = false;
  }
};

ioSelect.onchange = () => {
  $('load-basic').textContent =
    ioLabels[ioSelect.value] + ' 불러오기';
};

// 산업 분석 데이터
let analysisRows = [];
const selectedIndustries = new Set();

// 산점도 대신 새로운 분석 화면 생성
function prepareAnalysisView() {
  const root = $('analyze-results');

  root.innerHTML = `
    <h3>산업별 순위 막대그래프</h3>
    <p>상위 15개 산업을 보여줍니다.
       영향력계수와 감응도계수의 기준값은 1입니다.</p>

    <label>순위 기준
      <select id="rank-metric">
        <option value="influence">영향력계수</option>
        <option value="sensitivity">감응도계수</option>
      </select>
    </label>

    <div id="ranking-bars"></div>

    <h3>산업별 검색·정렬 비교표</h3>
    <p>체크박스로 최대 5개 산업을 선택해 비교할 수 있습니다.</p>

    <label>산업명 또는 산업코드 검색
      <input id="analysis-search"
             placeholder="예: 자동차, 반도체, 1010">
    </label>

    <label>정렬 기준
      <select id="analysis-sort">
        <option value="influence">영향력계수</option>
        <option value="sensitivity">감응도계수</option>
        <option value="name">산업명</option>
        <option value="code">산업코드</option>
      </select>
    </label>

    <label>정렬 방향
      <select id="analysis-direction">
        <option value="desc">내림차순</option>
        <option value="asc">오름차순</option>
      </select>
    </label>

    <p id="analysis-count" role="status"></p>

    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th>선택</th>
            <th>번호</th>
            <th>산업코드</th>
            <th>산업명</th>
            <th>영향력계수</th>
            <th>감응도계수</th>
          </tr>
        </thead>
        <tbody id="analysis-table-body"></tbody>
      </table>
    </div>

    <h3>선택 산업 비교 (최대 5개)</h3>
    <p id="selection-status">표에서 산업을 선택하세요.</p>

    <button id="selection-clear" type="button">
      선택 초기화
    </button>

    <div id="industry-comparison"></div>
  `;

  $('rank-metric').onchange = renderRankingBars;
  $('analysis-search').oninput = renderAnalysisTable;
  $('analysis-sort').onchange = renderAnalysisTable;
  $('analysis-direction').onchange = renderAnalysisTable;

  $('selection-clear').onclick = () => {
    selectedIndustries.clear();
    renderAnalysisTable();
    renderIndustryComparison();
  };
}

function metricName(key) {
  return key === 'influence'
    ? '영향력계수'
    : '감응도계수';
}

// 막대 생성
function makeBar(value, max, color) {
  const track = document.createElement('div');

  track.style.cssText =
    'height:15px;' +
    'background:#e2e8f0;' +
    'border-radius:8px;' +
    'overflow:hidden;' +
    'flex:1;' +
    'min-width:70px;';

  const fill = document.createElement('div');

  const width = Math.max(
    0,
    Math.min(100, value / max * 100)
  );

  fill.style.cssText =
    'height:100%;' +
    'border-radius:8px;' +
    'background:' + color + ';' +
    'width:' + width + '%;';

  track.append(fill);
  return track;
}

// 1. 순위 막대그래프
function renderRankingBars() {
  const metric = $('rank-metric').value;

  const top = [...analysisRows]
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, 15);

  const maximum = Math.max(
    1,
    ...top.map(r => r[metric])
  );

  const root = $('ranking-bars');
  root.replaceChildren();

  for (const r of top) {
    const item = document.createElement('div');
    item.style.cssText = 'margin:10px 0;';

    const heading = text(
      'div',
      r.name + ' (' + r.code + ') · ' +
      Number(r[metric]).toFixed(4)
    );

    heading.style.cssText =
      'font-size:14px;margin-bottom:4px;';

    const color = metric === 'influence'
      ? '#2563eb'
      : '#d97706';

    item.append(
      heading,
      makeBar(r[metric], maximum, color)
    );

    root.append(item);
  }
}

// 2. 산업 검색·정렬 비교표
function renderAnalysisTable() {
  const query = $('analysis-search')
    .value.trim().toLowerCase();

  const sortBy = $('analysis-sort').value;
  const descending =
    $('analysis-direction').value === 'desc';

  const displayed = analysisRows
    .filter(r =>
      (r.code + ' ' + r.name)
        .toLowerCase()
        .includes(query)
    )
    .sort((a, b) => {
      const comparison =
        sortBy === 'name' || sortBy === 'code'
          ? String(a[sortBy]).localeCompare(
              String(b[sortBy]), 'ko'
            )
          : a[sortBy] - b[sortBy];

      return descending ? -comparison : comparison;
    });

  $('analysis-count').textContent =
    '검색 결과: ' + displayed.length +
    '개 / 전체 ' + analysisRows.length + '개 산업';

  const body = $('analysis-table-body');
  body.replaceChildren();

  displayed.forEach((r, i) => {
    const tr = document.createElement('tr');

    const checkTd = document.createElement('td');
    const check = document.createElement('input');

    check.type = 'checkbox';
    check.checked = selectedIndustries.has(r.code);
    check.setAttribute(
      'aria-label',
      r.name + ' 비교 대상으로 선택'
    );

    check.onchange = () => {
      if (check.checked && selectedIndustries.size >= 5) {
        check.checked = false;

        $('selection-status').textContent =
          '최대 5개 산업까지만 선택할 수 있습니다.';

        return;
      }

      if (check.checked) {
        selectedIndustries.add(r.code);
      } else {
        selectedIndustries.delete(r.code);
      }

      renderIndustryComparison();
    };

    checkTd.append(check);
    tr.append(checkTd);

    const values = [
      i + 1,
      r.code,
      r.name,
      r.influence.toFixed(4),
      r.sensitivity.toFixed(4)
    ];

    for (const value of values) {
      tr.append(text('td', value));
    }

    body.append(tr);
  });
}

// 3. 최대 5개 산업 직접 비교
function renderIndustryComparison() {
  const chosen = [...selectedIndustries]
    .map(code =>
      analysisRows.find(r => r.code === code)
    )
    .filter(Boolean);

  $('selection-status').textContent = chosen.length
    ? chosen.length +
      '개 산업 선택됨 · 파랑: 영향력계수 / 주황: 감응도계수'
    : '표에서 산업을 선택하세요.';

  const root = $('industry-comparison');
  root.replaceChildren();

  if (!chosen.length) return;

  const maximum = Math.max(
    1,
    ...chosen.flatMap(r => [
      r.influence,
      r.sensitivity
    ])
  );

  for (const r of chosen) {
    const card = document.createElement('div');

    card.style.cssText =
      'padding:12px 0;' +
      'border-bottom:1px solid #dbe2ea;';

    const heading = text(
      'strong',
      r.name + ' (' + r.code + ')'
    );

    card.append(heading);

    const metrics = [
      ['influence', '#2563eb'],
      ['sensitivity', '#d97706']
    ];

    for (const [key, color] of metrics) {
      const line = document.createElement('div');

      line.style.cssText =
        'display:flex;' +
        'align-items:center;' +
        'gap:10px;' +
        'margin-top:7px;';

      const label = text(
        'span',
        metricName(key) + ': ' + r[key].toFixed(4)
      );

      label.style.cssText =
        'min-width:160px;font-size:13px;';

      line.append(
        label,
        makeBar(r[key], maximum, color)
      );

      card.append(line);
    }

    root.append(card);
  }
}

// 분석 화면 준비
prepareAnalysisView();

// 분석 버튼
$('analyze-btn').onclick = async () => {
  if ($('sheet').disabled) {
    $('analyze-status').textContent =
      '먼저 산업분류를 선택하고 Excel을 불러오세요.';
    return;
  }

  const button = $('analyze-btn');
  button.disabled = true;

  $('analyze-status').textContent =
    '영향력계수·감응도계수 계산 중…';

  try {
    const data = await call('analyze', {});

    analysisRows = data.results;
    selectedIndustries.clear();

    $('analysis-search').value = '';
    $('analysis-sort').value = 'influence';
    $('analysis-direction').value = 'desc';
    $('rank-metric').value = 'influence';

    $('analyze-results').hidden = false;

    renderRankingBars();
    renderAnalysisTable();
    renderIndustryComparison();

    $('analyze-status').textContent =
      data.count + '개 산업 분석 완료.';

  } catch (e) {
    $('analyze-status').textContent =
      '분석 실패: ' + e.message;

  } finally {
    button.disabled = false;
  }
};
