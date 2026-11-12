
const $ = id => document.getElementById(id);

const fmt = x => Number(x).toLocaleString('ko-KR', {
  maximumFractionDigits: 3
});

let worker;
let nextId = 0;
let requests = new Map();
let sectors = [];
let rowChoices = [];
let cells = [];
let basket = [];
let result = null;

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
  worker = new Worker('./worker.js?v=3');

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
  el.replaceChildren(
    ...list.map(x => {
      const o = document.createElement('option');
      o.value = x.code;
      o.textContent = x.code + ' ' + x.name;
      return o;
    })
  );
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

  const inputs = [
    'sheet', 'row', 'sector', 'add', 'run',
    'row-search', 'col-search',
    'sector-search', 'amount'
  ];

  for (const id of inputs) {
    $(id).disabled = true;
  }

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

    $('sheet').replaceChildren(
      ...info.sheets.map(s => {
        const o = text('option', s);
        o.value = s;
        return o;
      })
    );

    $('validation').textContent =
      JSON.stringify(info.residuals, null, 2) +
      '\n최대 절대 잔차: 허용값 1e-8 미만';

    for (const id of inputs) {
      $(id).disabled = false;
    }

    await explore();

    $('status').textContent =
      '준비 완료 · ' +
      sectors.length + '개 부문 · ' +
      info.sheets.length + '개 시트 · 계수 검증 통과';

  } catch (e) {
    $('status').textContent =
      '준비 실패: ' + e.message +
      ' — 새로고침 후 재시도하세요.';
  }
}

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
    ...cells
      .filter(c => (c.code + ' ' + c.name).includes(q))
      .map(c => {
        const tr = document.createElement('tr');

        const values = [
          c.code,
          c.name,
          c.value === null
            ? '빈 셀'
            : typeof c.value === 'number'
              ? fmt(c.value)
              : c.value
        ];

        values.forEach(v => tr.append(text('td', v)));
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

  if ($('row').value) {
    explore();
  } else {
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

function renderBasket() {
  $('basket').replaceChildren(
    ...basket.map((s, i) => {
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
    })
  );

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

  const summary = [
    ['수요 증가액', result.demand],
    ['생산유발액', result.production],
    ['수입유발액', result.imports],
    ['부가가치유발액', result.valueAdded]
  ];

  $('cards').replaceChildren(
    ...summary.map(([title, v]) => {
      const d = text('div', title);
      d.className = 'card';

      d.append(
        text('strong', fmt(v)),
        text('span', '백만원')
      );

      return d;
    })
  );

  const max = Math.max(
    ...result.rows.map(r => r.production),
    1
  );

  $('bars').replaceChildren(
    ...result.rows.slice(0, 15).map(r => {
      const d = text(
        'div',
        r.name + ' · ' +
        fmt(r.production) + '백만원'
      );

      d.className = 'bar';

      const t = document.createElement('div');
      t.className = 'track';

      const f = document.createElement('div');
      f.className = 'fill';

      f.style.width =
        Math.max(0, r.production / max * 100) + '%';

      t.append(f);
      d.append(t);

      return d;
    })
  );

  $('result-rows').replaceChildren(
    ...result.rows.map(r => {
      const tr = document.createElement('tr');

      [
        r.code,
        r.name,
        fmt(r.production),
        fmt(r.imports),
        fmt(r.valueAdded)
      ].forEach(v => tr.append(text('td', v)));

      return tr;
    })
  );
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
      '산업코드',
      '산업명',
      '생산유발액_백만원',
      '수입유발액_백만원',
      '부가가치유발액_백만원'
    ],
    ...result.rows.map(r => [
      r.code,
      r.name,
      r.production,
      r.imports,
      r.valueAdded
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

// 4가지 산업분류별 Excel 파일
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

// 산업분류 선택 메뉴
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
      '준비 실패: ' + error.message +
      ' — 연결 상태를 확인하고 새로고침하세요.';
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

// 영향력계수 및 감응도계수 분석
$('analyze-btn').onclick = async () => {
  const button = $('analyze-btn');
  const status = $('analyze-status');

  if ($('sheet').disabled) {
    status.textContent = '먼저 Excel 자료를 불러오세요.';
    return;
  }

  button.disabled = true;
  status.textContent =
    '영향력계수·감응도계수 계산 중…';

  try {
    const data = await call('analyze', {});

    // 산업별 결과표
    $('analyze-rows').replaceChildren(
      ...data.results.map((r, i) => {
        const tr = document.createElement('tr');

        [
          i + 1,
          r.code,
          r.name,
          fmt(r.influence),
          fmt(r.sensitivity)
        ].forEach(v => {
          tr.append(text('td', v));
        });

        return tr;
      })
    );

    // 그래프 영역을 먼저 표시
    $('analyze-results').hidden = false;

    // 표시된 다음 그래프 그리기
    requestAnimationFrame(() => {
      drawIndustryChart(data.results);
    });

    status.textContent =
      data.count + '개 산업의 분석이 완료되었습니다.';

  } catch (error) {
    status.textContent =
      '분석 실패: ' + error.message;

  } finally {
    button.disabled = false;
  }
};

// 영향력·감응도 산점도
// 점을 클릭하면 해당 산업 정보 표시
function drawIndustryChart(results) {
  const canvas = $('industry-chart');

  if (!canvas || !results || !results.length) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  const left = 82;
  const right = 32;
  const top = 36;
  const bottom = 74;

  const width = W - left - right;
  const height = H - top - bottom;

  const values = results.filter(r =>
    Number.isFinite(r.influence) &&
    Number.isFinite(r.sensitivity)
  );

  if (!values.length) return;

  const maxX = Math.max(
    1.2,
    ...values.map(r => r.influence)
  ) * 1.06;

  const maxY = Math.max(
    1.2,
    ...values.map(r => r.sensitivity)
  ) * 1.06;

  const x = v => left + (v / maxX) * width;
  const y = v => H - bottom - (v / maxY) * height;

  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // 기준값 1
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 5]);

  ctx.beginPath();
  ctx.moveTo(x(1), top);
  ctx.lineTo(x(1), H - bottom);

  ctx.moveTo(left, y(1));
  ctx.lineTo(W - right, y(1));
  ctx.stroke();

  ctx.setLineDash([]);

  // X축, Y축
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  ctx.moveTo(left, top);
  ctx.lineTo(left, H - bottom);
  ctx.lineTo(W - right, H - bottom);

  ctx.stroke();

  // 축 눈금
  ctx.fillStyle = '#334155';
  ctx.font = '14px sans-serif';

  for (let i = 0; i <= 5; i++) {
    const xv = maxX * i / 5;
    const yv = maxY * i / 5;

    ctx.textAlign = 'center';
    ctx.fillText(
      xv.toFixed(1),
      x(xv),
      H - bottom + 24
    );

    ctx.textAlign = 'right';
    ctx.fillText(
      yv.toFixed(1),
      left - 12,
      y(yv) + 5
    );
  }

  // 그래프의 점과 실제 산업 정보 연결
  const points = [];

  values.forEach(r => {
    const px = x(r.influence);
    const py = y(r.sensitivity);

    points.push({
      x: px,
      y: py,
      industry: r
    });

    const highX = r.influence >= 1;
    const highY = r.sensitivity >= 1;

    if (highX && highY) {
      ctx.fillStyle = '#e74c3c';
    } else if (highX) {
      ctx.fillStyle = '#3498db';
    } else if (highY) {
      ctx.fillStyle = '#27ae60';
    } else {
      ctx.fillStyle = '#888888';
    }

    ctx.globalAlpha = 0.67;

    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.globalAlpha = 1;

  // 축 제목
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';

  ctx.fillText('영향력계수', W / 2, H - 14);

  ctx.save();
  ctx.translate(23, H / 2);
  ctx.rotate(-Math.PI / 2);

  ctx.fillText('감응도계수', 0, 0);
  ctx.restore();

  // 점 클릭 기능
  canvas.style.cursor = 'crosshair';

  canvas.onclick = e => {
    const rect = canvas.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    const mx =
      (e.clientX - rect.left) * W / rect.width;

    const my =
      (e.clientY - rect.top) * H / rect.height;

    let chosen = null;
    let distance = Infinity;

    for (const p of points) {
      const d = Math.hypot(
        p.x - mx,
        p.y - my
      );

      if (d < distance) {
        distance = d;
        chosen = p.industry;
      }
    }

    if (!chosen || distance > 14) return;

    alert(
      '산업명: ' + chosen.name + '\n' +
      '산업코드: ' + chosen.code + '\n' +
      '영향력계수: ' +
        chosen.influence.toFixed(4) + '\n' +
      '감응도계수: ' +
        chosen.sensitivity.toFixed(4)
    );
  };
}
