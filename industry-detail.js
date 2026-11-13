
/* 산업별 상세 분석 카드: 기존 app.js 수정 불필요 */
(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const host = byId('industry-analysis');

  if (!host) return;

  // 상세 분석 화면 자동 생성
  const section = document.createElement('section');
  section.id = 'industry-detail';

  section.innerHTML = `
    <h2>4. 산업별 상세 분석 리포트</h2>
    <p>
      관심 산업을 선택하면 두 계수와 전체 산업 순위,
      평균 대비 수준을 한눈에 볼 수 있습니다.
    </p>

    <div style="
      display:flex;
      gap:10px;
      flex-wrap:wrap;
      align-items:end;
      margin:14px 0;
    ">
      <button id="detail-load" type="button">
        현재 분류 분석자료 불러오기
      </button>

      <label style="flex:1;min-width:190px">
        산업 검색
        <input
          id="detail-search"
          type="search"
          placeholder="산업명 또는 코드"
          disabled
        >
      </label>

      <label style="flex:1;min-width:220px">
        산업 선택
        <select id="detail-sector" disabled></select>
      </label>
    </div>

    <p id="detail-status" role="status">
      위 버튼을 눌러 현재 산업분류를 분석하세요.
    </p>

    <div id="detail-report" hidden></div>
  `;

  host.insertAdjacentElement('afterend', section);

  let rows = [];
  let rankingInfluence = new Map();
  let rankingSensitivity = new Map();
  let expectedEpoch = 0;

  const number = value => Number(value).toFixed(4);

  // HTML 요소 생성
  function make(tag, content, styles = '') {
    const node = document.createElement(tag);
    node.textContent = String(content);

    if (styles) {
      node.style.cssText = styles;
    }

    return node;
  }

  // 산업분류 변경 시 오래된 분석결과 제거
  function reset() {
    expectedEpoch += 1;

    rows = [];
    rankingInfluence = new Map();
    rankingSensitivity = new Map();

    byId('detail-report').hidden = true;
    byId('detail-search').value = '';
    byId('detail-search').disabled = true;

    byId('detail-sector').replaceChildren();
    byId('detail-sector').disabled = true;

    byId('detail-status').textContent =
      '새 산업분류를 불러온 뒤 다시 분석하세요.';
  }

  byId('load-basic').addEventListener(
    'click',
    reset,
    true
  );

  const classification = byId('io-classification');

  if (classification) {
    classification.addEventListener('change', reset);
  }

  // 현재 분류에 속한 산업들의 순위 계산
  function ranks(metric) {
    const sorted = [...rows].sort(
      (a, b) => b[metric] - a[metric]
    );

    const result = new Map();

    sorted.forEach((r, i) => {
      const prev = sorted[i - 1];

      const place =
        i > 0 && r[metric] === prev[metric]
          ? result.get(prev.code)
          : i + 1;

      result.set(r.code, place);
    });

    return result;
  }

  // 검색 결과에 따라 산업 선택 목록 갱신
  function updateOptions(selected) {
    const query = byId('detail-search')
      .value.trim()
      .toLowerCase();

    const matched = rows.filter(r =>
      (r.code + ' ' + r.name)
        .toLowerCase()
        .includes(query)
    );

    const select = byId('detail-sector');

    select.replaceChildren(
      ...matched.map(r => {
        const option = document.createElement('option');
        option.value = r.code;
        option.textContent =
          r.name + ' (' + r.code + ')';

        return option;
      })
    );

    if (matched.some(r => r.code === selected)) {
      select.value = selected;
    }

    if (select.value) {
      render(select.value);
    } else {
      byId('detail-report').hidden = true;
      byId('detail-status').textContent =
        '검색 결과가 없습니다.';
    }
  }

  // 지표 카드 한 개 생성
  function field(label, value, description) {
    const card = make(
      'div',
      '',
      'border:1px solid #dbe3ed;' +
      'border-radius:12px;' +
      'padding:16px;' +
      'min-width:170px;' +
      'flex:1;' +
      'background:#f8fafc;'
    );

    card.append(
      make(
        'div',
        label,
        'font-size:13px;color:#475569;'
      ),

      make(
        'strong',
        value,
        'display:block;' +
        'font-size:24px;' +
        'margin:7px 0;' +
        'color:#0f172a;'
      ),

      make(
        'div',
        description,
        'font-size:12px;color:#64748b;'
      )
    );

    return card;
  }

  // 선택한 산업의 상세 리포트
  function render(code) {
    const r = rows.find(item => item.code === code);
    if (!r) return;

    const n = rows.length;

    const influenceHigher = r.influence >= 1;
    const sensitivityHigher = r.sensitivity >= 1;

    let group;

    if (influenceHigher && sensitivityHigher) {
      group = '전방·후방 연관효과 모두 평균 이상';
    } else if (influenceHigher) {
      group = '후방 연관효과가 상대적으로 높음';
    } else if (sensitivityHigher) {
      group = '전방 연관효과가 상대적으로 높음';
    } else {
      group = '전방·후방 연관효과 모두 평균 미만';
    }

    const report = byId('detail-report');
    report.replaceChildren();

    report.append(
      make('h3', r.name + ' (' + r.code + ')')
    );

    const cards = make(
      'div',
      '',
      'display:flex;' +
      'flex-wrap:wrap;' +
      'gap:10px;' +
      'margin:12px 0 18px;'
    );

    const influenceDiff =
      (r.influence - 1) * 100;

    const sensitivityDiff =
      (r.sensitivity - 1) * 100;

    cards.append(
      field(
        '영향력계수',
        number(r.influence),
        rankingInfluence.get(code) +
          '위 / ' + n + '개 산업'
      ),

      field(
        '감응도계수',
        number(r.sensitivity),
        rankingSensitivity.get(code) +
          '위 / ' + n + '개 산업'
      ),

      field(
        '영향력계수 평균 대비',
        (influenceDiff >= 0 ? '+' : '') +
          influenceDiff.toFixed(2) + '%',
        '전산업 평균 = 1'
      ),

      field(
        '감응도계수 평균 대비',
        (sensitivityDiff >= 0 ? '+' : '') +
          sensitivityDiff.toFixed(2) + '%',
        '전산업 평균 = 1'
      )
    );

    report.append(cards);

    report.append(
      make('h3', '산업 특성 해석'),

      make('p', group),

      make(
        'p',
        '영향력계수는 해당 산업의 최종수요 증가가 ' +
        '산업 전체 생산에 미치는 상대적 유발효과를, ' +
        '감응도계수는 모든 산업의 최종수요가 ' +
        '증가할 때 해당 산업의 상대적 반응을 나타냅니다.'
      ),

      make(
        'p',
        '※ 두 지표는 무차원 계수입니다. ' +
        '순위와 평균 대비 비교는 현재 선택한 ' +
        '산업분류 내에서 계산했습니다.',
        'font-size:12px;color:#64748b;'
      )
    );

    report.hidden = false;

    byId('detail-status').textContent =
      n + '개 산업 중 선택: ' + r.name;
  }

  // 분석자료 불러오기 버튼
  byId('detail-load').addEventListener(
    'click',
    async () => {
      const button = byId('detail-load');

      if (
        byId('sheet').disabled ||
        typeof call !== 'function'
      ) {
        byId('detail-status').textContent =
          '먼저 위쪽에서 Excel 자료를 불러오세요.';
        return;
      }

      const myEpoch = ++expectedEpoch;

      button.disabled = true;
      byId('detail-status').textContent =
        '산업별 상세 지표 계산 중…';

      try {
        const data = await call('analyze', {});

        // 분석 도중 다른 분류로 바뀐 경우 무시
        if (myEpoch !== expectedEpoch) return;

        if (
          !Array.isArray(data.results) ||
          !data.results.length
        ) {
          throw new Error('분석 결과가 없습니다.');
        }

        rows = data.results;

        rankingInfluence = ranks('influence');
        rankingSensitivity = ranks('sensitivity');

        byId('detail-search').disabled = false;
        byId('detail-sector').disabled = false;

        updateOptions(rows[0].code);

      } catch (error) {
        if (myEpoch === expectedEpoch) {
          byId('detail-status').textContent =
            '분석 실패: ' + error.message;
        }

      } finally {
        button.disabled = false;
      }
    }
  );

  // 검색과 산업 선택
  byId('detail-search').addEventListener(
    'input',
    () => updateOptions('')
  );

  byId('detail-sector').addEventListener(
    'change',
    e => render(e.target.value)
  );
})();

