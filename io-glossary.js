
/*
 IO INTELLIGENCE
 산업연관계수 학습 가이드
 개념 · 계산방법 · 계산 예시 · 결과 해석
*/

(() => {
  "use strict";

  const root = document.querySelector("#io-view-glossary");
  if (!root || root.querySelector("#ig-guide")) return;

  // 모든 예시는 실제 통계가 아닌 교육용 가정 수치입니다.
  // 배열 순서: 이름, 개념, 계산방법, 계산 예시, 결과 해석

  const groups = {
    "생산유발": [
      [
        "영향력계수",
        "한 산업의 최종수요 증가가 전체 산업의 생산을 얼마나 유발하는지, 산업 평균과 비교하는 계수입니다.",
        "영향력계수 = 해당 산업 생산유발계수 열합계 ÷ 전 산업 열합계 평균",
        "자동차 산업의 열합계 2.10, 전 산업 평균 1.75 → 2.10 ÷ 1.75 = 1.20",
        "평균보다 후방 연관효과가 20% 높습니다."
      ],
      [
        "감응도계수",
        "전체 산업의 최종수요 증가에 대해 특정 산업이 얼마나 영향을 받는지를 비교하는 계수입니다.",
        "감응도계수 = 해당 산업 생산유발계수 행합계 ÷ 전 산업 행합계 평균",
        "철강 산업의 행합계 2.40, 전 산업 평균 2.00 → 2.40 ÷ 2.00 = 1.20",
        "다른 산업들의 수요 변화에 대한 생산유발 반응이 평균보다 높습니다."
      ],
      [
        "생산유발계수 열합계",
        "특정 산업의 최종수요가 1단위 증가할 때 모든 산업에서 발생하는 생산유발을 합한 값입니다.",
        "생산유발계수 열합계 = 해당 산업 열에 있는 생산유발계수의 합",
        "자동차 1.20 + 철강 0.30 + 반도체 0.20 + 기타 0.10 = 1.80",
        "자동차 최종수요 100억 원 증가 시 전 산업에서 총 180억 원의 생산이 유발됩니다."
      ],
      [
        "생산유발계수 행합계",
        "여러 산업의 최종수요가 각각 1단위 증가할 때 특정 산업에 발생하는 생산유발계수의 합입니다.",
        "생산유발계수 행합계 = 해당 산업 행의 생산유발계수 합",
        "철강 산업 행의 계수가 0.20, 0.40, 1.10, 0.30 → 합계 2.00",
        "각 산업의 최종수요가 1단위씩 증가하는 상황에서 철강 생산유발의 합은 2.00입니다."
      ],
      [
        "최초 직접 생산유발",
        "최종수요 증가를 충족하기 위해 해당 산업에서 처음 발생하는 생산입니다.",
        "최초 직접 생산유발계수 = 1",
        "자동차 최종수요가 100억 원 증가 → 최초 자동차 생산 100억 원 → 계수 1",
        "이후 추가로 발생하는 중간재 생산은 최초 직접 생산과 구분합니다."
      ],
      [
        "간접생산유발계수 합계",
        "최초 직접 생산을 제외하고 연쇄적인 산업 간 거래로 추가 발생하는 생산유발입니다.",
        "간접생산유발계수 합계 = 생산유발계수 열합계 − 1",
        "총생산유발계수 1.80 → 1.80 − 1 = 0.80",
        "최종수요 100억 원 증가 시 최초 생산 외에 80억 원의 추가 생산이 유발됩니다."
      ],
      [
        "자기산업 생산유발계수",
        "해당 산업의 최종수요 증가가 그 산업 자체에서 유발하는 총생산의 계수입니다.",
        "자기산업 생산유발계수 = 생산유발계수 행렬의 대각원소",
        "자동차 산업의 생산유발계수 행렬에서 자동차→자동차 값이 1.20",
        "자동차 최종수요 100억 원 증가 시 자동차 산업 자체에서 120억 원의 생산이 유발됩니다."
      ],
      [
        "자기산업 간접생산유발계수",
        "최초 직접 생산 이후 동일 산업으로 되돌아오는 추가 생산유발입니다.",
        "자기산업 간접생산유발계수 = 자기산업 생산유발계수 − 1",
        "자동차 산업의 대각원소 1.20 → 1.20 − 1 = 0.20",
        "자동차 산업 자체에서 최초 생산 외에 20억 원의 추가 생산이 유발됩니다."
      ],
      [
        "타산업 생산유발계수 합계",
        "특정 산업의 최종수요 증가가 자기 산업을 제외한 다른 산업에서 유발하는 생산의 합계입니다.",
        "타산업 생산유발계수 = 생산유발계수 열합계 − 대각원소",
        "전체 열합계 1.80, 자동차 자체 1.20 → 1.80 − 1.20 = 0.60",
        "자동차 최종수요 100억 원 증가 시 다른 산업에서 60억 원의 생산이 유발됩니다."
      ],
      [
        "자기산업 생산유발 비중",
        "총생산유발 중 해당 산업 자체에서 발생하는 생산유발의 비율입니다.",
        "자기산업 비중 = 자기산업 생산유발계수 ÷ 전체 열합계 × 100",
        "1.20 ÷ 1.80 × 100 = 66.67%",
        "전체 생산유발의 약 66.67%가 자기 산업에서 발생합니다."
      ],
      [
        "타산업 생산유발 비중",
        "총생산유발 중 다른 산업에서 발생하는 생산유발의 비율입니다.",
        "타산업 비중 = 타산업 생산유발계수 합계 ÷ 전체 열합계 × 100",
        "0.60 ÷ 1.80 × 100 = 33.33%",
        "총생산유발의 약 33.33%가 다른 산업에서 발생합니다."
      ],
      [
        "간접생산유발 비중",
        "전체 생산유발에서 최초 직접 생산을 제외한 추가 유발생산이 차지하는 비율입니다.",
        "간접생산유발 비중 = (열합계 − 1) ÷ 열합계 × 100",
        "(1.80 − 1) ÷ 1.80 × 100 = 44.44%",
        "최초 직접 생산 이후 발생한 추가 생산이 전체 생산유발의 약 44.44%입니다."
      ]
    ],

    "수입유발": [
      [
        "수입유발계수 열합계",
        "국내 생산물에 대한 최종수요 증가로 인해 직간접적으로 유발되는 수입의 크기입니다.",
        "수입유발계수 열합계 = 해당 산업의 수입유발계수 열합계",
        "수입유발계수가 0.10 + 0.15 + 0.05라면 합계 = 0.30",
        "국내 생산물 최종수요가 100억 원 증가하면 30억 원의 수입이 유발됩니다."
      ],
      [
        "상대적 수입유발지수",
        "해당 산업의 수입유발 정도를 전체 산업 평균과 비교한 지표입니다.",
        "상대적 수입유발지수 = 해당 산업 수입유발계수 열합계 ÷ 전체 평균",
        "해당 산업 0.36, 전체 평균 0.30 → 0.36 ÷ 0.30 = 1.20",
        "해당 산업의 수입유발 정도가 산업 평균보다 20% 높습니다."
      ]
    ],

    "부가가치": [
      [
        "부가가치유발계수 열합계",
        "특정 산업의 최종수요 증가가 전체 산업에서 직간접적으로 창출하는 부가가치입니다.",
        "부가가치유발계수 열합계 = 부가가치유발계수 행렬의 해당 열합계",
        "각 산업 부가가치유발계수 0.50 + 0.20 + 0.10 = 0.80",
        "최종수요가 100억 원 증가하면 전체 산업에서 80억 원의 부가가치가 유발됩니다."
      ],
      [
        "상대적 부가가치유발지수",
        "해당 산업의 부가가치유발 정도를 전체 산업 평균과 비교합니다.",
        "상대적 부가가치유발지수 = 해당 산업 부가가치유발계수 열합계 ÷ 전체 평균",
        "해당 산업 0.90, 전체 평균 0.75 → 0.90 ÷ 0.75 = 1.20",
        "부가가치유발 정도가 산업 평균보다 20% 높습니다."
      ],
      [
        "직접 부가가치계수",
        "한 산업에서 산출액 1단위를 생산할 때 직접 창출되는 부가가치의 비율입니다.",
        "직접 부가가치계수 = 해당 산업 부가가치액 ÷ 총산출액",
        "부가가치액 40억 원, 총산출액 100억 원 → 40 ÷ 100 = 0.40",
        "산출액 1원당 직접 부가가치 0.40원이 창출됩니다."
      ],
      [
        "간접 부가가치유발계수",
        "최초 직접 부가가치 이외에 산업 간 생산 과정에서 추가로 유발되는 부가가치입니다.",
        "간접 부가가치유발계수 = 부가가치유발계수 열합계 − 직접 부가가치계수",
        "전체 부가가치유발계수 0.80, 직접 부가가치계수 0.40 → 0.40",
        "최종수요 100억 원 증가 시 직접 부가가치 이외에 40억 원이 추가로 유발됩니다."
      ],
      [
        "직접 부가가치유발 비중",
        "전체 부가가치유발 중 최초 직접 부가가치가 차지하는 비율입니다.",
        "직접 부가가치유발 비중 = 직접 부가가치계수 ÷ 부가가치유발계수 열합계 × 100",
        "0.40 ÷ 0.80 × 100 = 50%",
        "전체 부가가치유발 중 직접 부가가치가 절반을 차지합니다."
      ],
      [
        "타산업 부가가치유발계수",
        "특정 산업의 최종수요 증가로 다른 산업에서 창출되는 부가가치를 나타냅니다.",
        "타산업 부가가치유발계수 = 부가가치유발계수 열합계 − 해당 산업 대각원소",
        "전체 0.80, 자기 산업 대각원소 0.50 → 0.30",
        "최종수요 100억 원 증가 시 다른 산업에서 부가가치 30억 원이 유발됩니다."
      ]
    ],

    "투입구조": [
      [
        "국산중간투입계수 합계",
        "산출액 1단위를 생산할 때 사용되는 국산 중간재의 투입 비율입니다.",
        "국산중간투입계수 합계 = 국산투입계수 행렬의 해당 열합계",
        "국산 중간재 투입액 45억 원, 총산출액 100억 원 → 0.45",
        "산출액 1원당 국산 중간재 0.45원이 투입됩니다."
      ],
      [
        "수입중간투입계수 합계",
        "산출액 1단위를 생산할 때 사용되는 수입 중간재의 투입 비율입니다.",
        "수입중간투입계수 합계 = 수입투입계수 행렬의 해당 열합계",
        "수입 중간재 투입액 20억 원, 총산출액 100억 원 → 0.20",
        "산출액 1원당 수입 중간재 0.20원이 투입됩니다."
      ],
      [
        "중간투입계수 합계",
        "국산 중간재와 수입 중간재를 합한 전체 중간투입 비율입니다.",
        "전체 중간투입계수 = 국산중간투입계수 합계 + 수입중간투입계수 합계",
        "국산 0.45 + 수입 0.20 = 0.65",
        "산출액 1원당 전체 중간재 0.65원이 투입됩니다."
      ],
      [
        "중간투입 수입재 비중",
        "전체 중간재 투입에서 수입 중간재가 차지하는 비율입니다.",
        "중간투입 수입재 비중 = 수입중간투입계수 ÷ 전체 중간투입계수 × 100",
        "0.20 ÷ 0.65 × 100 = 30.77%",
        "전체 중간재 투입의 약 30.77%가 수입재입니다."
      ],
      [
        "중간투입 국산재 비중",
        "전체 중간재 투입에서 국산 중간재가 차지하는 비율입니다.",
        "중간투입 국산재 비중 = 국산중간투입계수 ÷ 전체 중간투입계수 × 100",
        "0.45 ÷ 0.65 × 100 = 69.23%",
        "전체 중간재 투입의 약 69.23%가 국산재입니다."
      ],
      [
        "자기산업 국산투입계수",
        "동일 산업에서 생산된 국산 중간재가 자기 산업에 투입되는 비율입니다.",
        "자기산업 국산투입계수 = 국산투입계수 행렬의 대각원소",
        "해당 산업의 자기산업 국산 중간재 10억 원, 산출액 100억 원 → 0.10",
        "산출액 1원당 자기 산업에서 생산한 국산 중간재 0.10원이 투입됩니다."
      ],
      [
        "자기산업 수입투입계수",
        "동일 상품부문의 수입 중간재가 해당 산업에 투입되는 비율입니다.",
        "자기산업 수입투입계수 = 수입투입계수 행렬의 대각원소",
        "동일 상품부문 수입 중간재 5억 원, 산출액 100억 원 → 0.05",
        "산출액 1원당 동일 상품부문의 수입 중간재 0.05원이 투입됩니다."
      ],
      [
        "상대적 국산중간투입지수",
        "해당 산업의 국산중간투입 정도를 전체 산업 평균과 비교합니다.",
        "상대적 국산중간투입지수 = 해당 산업 국산중간투입계수 열합계 ÷ 전체 평균",
        "해당 산업 0.48, 전체 평균 0.40 → 0.48 ÷ 0.40 = 1.20",
        "산업 평균보다 국산 중간재 투입 비율이 20% 높습니다."
      ],
      [
        "상대적 수입중간투입지수",
        "해당 산업의 수입중간투입 정도를 전체 산업 평균과 비교합니다.",
        "상대적 수입중간투입지수 = 해당 산업 수입중간투입계수 열합계 ÷ 전체 평균",
        "해당 산업 0.24, 전체 평균 0.20 → 0.24 ÷ 0.20 = 1.20",
        "산업 평균보다 수입 중간재 투입 비율이 20% 높습니다."
      ]
    ],

    "파급분포": [
      [
        "생산유발 분포 집중도",
        "한 산업의 최종수요 증가로 유발되는 생산이 소수 산업에 집중되는 정도입니다. 시장집중도 HHI와는 구분됩니다.",
        "분포 집중도 = 산업별 생산유발 비중을 각각 제곱한 값의 합",
        "세 산업 비중 50%, 30%, 20% → 0.50² + 0.30² + 0.20² = 0.38",
        "값이 클수록 생산유발이 상대적으로 소수 산업에 집중됩니다."
      ],
      [
        "생산유발 분산도",
        "생산유발효과가 얼마나 다양한 산업으로 분산되는지를 보여주는 파생지표입니다.",
        "생산유발 분산도 = 1 − 생산유발 분포 집중도",
        "집중도 0.38 → 1 − 0.38 = 0.62",
        "값이 클수록 유발생산이 여러 산업에 분산된 구조입니다."
      ],
      [
        "유효 파급 산업수",
        "생산유발의 집중도를 바탕으로 계산한, 동일한 비중을 가진 산업 수에 대응하는 지표입니다.",
        "유효 파급 산업수 = 1 ÷ 생산유발 분포 집중도",
        "분포 집중도 0.25 → 1 ÷ 0.25 = 4",
        "생산유발 분포의 집중도가 네 산업에 동일하게 나뉜 경우와 같습니다."
      ],
      [
        "생산유발 분포 엔트로피",
        "산업별 생산유발 비중이 얼마나 다양하게 분포하는지를 나타내는 지표입니다.",
        "엔트로피 = −Σ(산업별 생산유발 비중 × ln(해당 비중))",
        "두 산업의 비중이 각각 0.50이면 −(0.50 × ln0.50 + 0.50 × ln0.50) ≈ 0.6931",
        "같은 산업 수를 비교할 때 비중이 더 균등할수록 엔트로피가 높아집니다."
      ],
      [
        "상위 5개 산업 파급 비중",
        "전체 유발생산 중 생산유발이 가장 큰 다섯 산업이 차지하는 비율입니다.",
        "상위 5개 산업 파급 비중 = 상위 다섯 산업 생산유발 비중의 합 × 100",
        "상위 다섯 산업의 비중이 30%, 20%, 15%, 10%, 5% → 합계 80%",
        "전체 생산유발의 80%가 상위 다섯 산업에 집중됩니다."
      ],
      [
        "최대 타산업 생산유발계수",
        "자기 산업을 제외한 다른 산업 중 생산유발계수가 가장 큰 산업의 값입니다.",
        "최대 타산업 생산유발계수 = 자기 산업 대각원소를 제외한 열의 최댓값",
        "철강 0.30, 반도체 0.20, 고무 0.10 → 최댓값 0.30",
        "최종수요 100억 원 증가 시 다른 산업 중 철강에서 30억 원의 생산이 유발됩니다."
      ],
      [
        "1% 이상 파급 산업수",
        "한 산업의 전체 생산유발 중 1% 이상을 차지하는 산업이 몇 개인지 나타냅니다.",
        "1% 이상 파급 산업수 = 생산유발 비중이 0.01 이상인 산업의 개수",
        "다섯 산업의 생산유발 비중이 70%, 20%, 8%, 1.5%, 0.5% → 4개",
        "전체 생산유발 비중이 1% 이상인 산업은 네 개입니다."
      ]
    ]
  };

  const guide = document.createElement("section");
  guide.id = "ig-guide";

  guide.innerHTML = `
    <div class="ig-hero">
      <div class="ig-eyebrow">
        IO INTELLIGENCE / LEARNING CENTER
      </div>
      <h2>산업연관계수 개념·계산방법·예시</h2>
      <p>
        36개 산업연관 지표의 정의, 계산식,
        숫자를 이용한 계산 과정, 결과 해석을 확인합니다.
      </p>
    </div>

    <div class="ig-panel">
      <input
        id="ig-search"
        type="search"
        placeholder="계수명 또는 개념을 검색하세요"
        aria-label="계수 검색"
      >

      <div id="ig-groups" class="ig-groups"></div>

      <div id="ig-count" class="ig-count"></div>
      <div id="ig-list"></div>
    </div>

    <p class="ig-disclaimer">
      모든 계산 예시는 학습을 위한 가상 자료입니다.
      실제 2023년 산업연관표의 계산 결과가 아닙니다.
      파생지표는 학습용 분석 지표이며,
      한국은행의 공식 지표 명칭과 반드시 일치하지는 않습니다.
    </p>
  `;

  const style = document.createElement("style");

  style.textContent = `
    #ig-guide {
      color: #203b5d;
      width: 100%;
    }

    #ig-guide * {
      box-sizing: border-box;
    }

    #ig-guide .ig-hero,
    #ig-guide .ig-panel {
      background: #fff;
      border: 1px solid #e0e8f3;
      border-radius: 17px;
      padding: 24px;
      margin-bottom: 16px;
    }

    #ig-guide .ig-eyebrow {
      font-size: 11px;
      color: #6888b0;
      font-weight: 800;
      letter-spacing: 1px;
    }

    #ig-guide h2 {
      margin: 12px 0;
      font-size: 23px;
    }

    #ig-guide p {
      font-size: 13px;
      color: #71849d;
      line-height: 1.8;
    }

    #ig-search {
      width: 100%;
      border: 1px solid #d8e4f0;
      border-radius: 11px;
      background: #f8fafd;
      padding: 14px;
      font-size: 13px;
      margin-bottom: 17px;
      color: #234463;
    }

    #ig-guide .ig-groups {
      display: grid;
      grid-template-columns:
        repeat(5, minmax(0, 1fr));
      gap: 9px;
      margin-bottom: 18px;
    }

    #ig-guide .ig-group {
      border: 1px solid #dbe6f1;
      border-radius: 11px;
      padding: 13px 7px;
      background: white;
      color: #45688e;
      font-size: 12px;
      font-weight: 750;
      cursor: pointer;
    }

    #ig-guide .ig-group[aria-pressed="true"] {
      background: #174b87;
      border-color: #174b87;
      color: white;
    }

    #ig-guide .ig-count {
      font-size: 12px;
      color: #7990a9;
      margin-bottom: 13px;
    }

    #ig-guide .ig-item {
      border: 1px solid #dfe8f3;
      border-radius: 12px;
      margin: 10px 0;
      overflow: hidden;
      background: #fff;
    }

    #ig-guide .ig-item summary {
      padding: 17px;
      cursor: pointer;
      font-weight: 750;
      font-size: 14px;
      background: #f8fafd;
    }

    #ig-guide .ig-item[open] summary {
      background: #edf4fd;
      color: #174b87;
    }

    #ig-guide .ig-body {
      padding: 17px;
    }

    #ig-guide .ig-section {
      margin-bottom: 17px;
    }

    #ig-guide .ig-label {
      display: block;
      color: #6885a5;
      font-size: 11px;
      font-weight: 800;
      margin-bottom: 7px;
    }

    #ig-guide .ig-value {
      font-size: 13px;
      line-height: 1.9;
      color: #29435f;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    #ig-guide .ig-example {
      padding: 14px;
      border-radius: 10px;
      background: #f0f5fb;
    }

    #ig-guide .ig-disclaimer {
      margin: 14px 3px;
      font-size: 11px;
    }

    @media(max-width:850px) {
      #ig-guide .ig-groups {
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
      }
    }

    @media(max-width:600px) {
      #ig-guide .ig-hero,
      #ig-guide .ig-panel {
        padding: 14px;
      }
    }
  `;

  document.head.append(style);
  root.append(guide);

  const search = guide.querySelector("#ig-search");
  const groupHost = guide.querySelector("#ig-groups");
  const list = guide.querySelector("#ig-list");
  const count = guide.querySelector("#ig-count");

  let activeGroup = "전체";

  const appendField = (parent, title, value, isExample) => {
    const section = document.createElement("div");
    section.className = "ig-section";

    if (isExample) section.classList.add("ig-example");

    const label = document.createElement("span");
    label.className = "ig-label";
    label.textContent = title;

    const content = document.createElement("div");
    content.className = "ig-value";
    content.textContent = value;

    section.append(label, content);
    parent.append(section);
  };

  function render() {
    groupHost.replaceChildren();
    list.replaceChildren();

    const allGroups = ["전체", ...Object.keys(groups)];

    allGroups.forEach(name => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ig-group";

      const number = name === "전체"
        ? Object.values(groups).reduce(
            (s, a) => s + a.length, 0
          )
        : groups[name].length;

      button.textContent = `${name} · ${number}개`;

      button.setAttribute(
        "aria-pressed",
        String(activeGroup === name)
      );

      button.onclick = () => {
        activeGroup = name;
        render();
      };

      groupHost.append(button);
    });

    const keyword = search.value
      .trim()
      .toLowerCase();

    const entries = [];

    Object.entries(groups).forEach(([group, items]) => {
      if (
        activeGroup !== "전체" &&
        activeGroup !== group
      ) return;

      items.forEach(item => {
        const searchable = (group + " " + item.join(" "))
          .toLowerCase();

        if (
          keyword &&
          !searchable.includes(keyword)
        ) return;

        entries.push({ group, item });
      });
    });

    count.textContent =
      `${entries.length}개 지표 검색 결과`;

    if (!entries.length) {
      const p = document.createElement("p");
      p.textContent = "검색 결과가 없습니다.";
      list.append(p);
      return;
    }

    entries.forEach(({ group, item }) => {
      const [name, concept, formula, example, meaning] = item;

      const details = document.createElement("details");
      details.className = "ig-item";

      const summary = document.createElement("summary");
      summary.textContent = `${name} · ${group}`;

      const body = document.createElement("div");
      body.className = "ig-body";

      appendField(body, "① 개념", concept, false);
      appendField(body, "② 계산방법", formula, false);
      appendField(body, "③ 계산 예시", example, true);
      appendField(body, "④ 결과 해석", meaning, false);

      details.append(summary, body);
      list.append(details);
    });
  }

  search.addEventListener("input", render);
  render();
})();
