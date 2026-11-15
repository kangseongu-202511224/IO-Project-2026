
import numpy as np

# 기존 model.py에서 검증한 행렬을 그대로 사용합니다.
# L: 생산유발계수
# M: 수입유발계수
# V: 부가가치유발계수
# AD: 국산투입계수
# AM: 수입투입계수
# v: 직접 부가가치계수

def analyze_extended_metrics():
    if not valid:
        raise ValueError(
            "먼저 검증된 Excel 자료를 불러오세요."
        )

    n = len(codes)
    eps = 1e-12

    A = AD + AM

    lc = L.sum(axis=0)
    lr = L.sum(axis=1)
    mc = M.sum(axis=0)
    vc = V.sum(axis=0)
    adc = AD.sum(axis=0)
    amc = AM.sum(axis=0)
    ac = A.sum(axis=0)

    ld = np.diag(L)
    vd = np.diag(V)

    other = lc - ld

    p = np.divide(
        L,
        lc[np.newaxis, :],
        out=np.zeros_like(L),
        where=lc[np.newaxis, :] > eps
    )

    hhi = (p ** 2).sum(axis=0)

    entropy = -(
        np.where(
            p > eps,
            p * np.log(np.maximum(p, eps)),
            0
        )
    ).sum(axis=0)

    top5 = np.sort(p, axis=0)[
        -min(5, n):, :
    ].sum(axis=0)

    other_matrix = L.copy()
    np.fill_diagonal(other_matrix, 0)

    max_other = other_matrix.max(axis=0)

    breadth = (p >= 0.01).sum(axis=0)

    specs = []
    values = {}

    def divide(a, b):
        return np.divide(
            a,
            b,
            out=np.zeros_like(
                np.asarray(a, dtype=float)
            ),
            where=np.asarray(b) > eps
        )

    def add(
        key, label, group, unit,
        description, formula, arr,
        kind="standard"
    ):
        arr = np.asarray(arr, dtype=float)

        if arr.shape != (n,):
            raise ValueError(
                "지표 배열 크기 오류: " + key
            )

        if not np.isfinite(arr).all():
            raise ValueError(
                "지표에 비정상 값이 있습니다: " + key
            )

        specs.append({
            "key": key,
            "label": label,
            "group": group,
            "unit": unit,
            "description": description,
            "formula": formula,
            "kind": kind
        })

        values[key] = arr

    # 1. 생산유발 관련 지표 12개

    add(
        "influence", "영향력계수",
        "생산유발", "무차원",
        "후방 연관효과의 평균 대비 크기",
        "생산유발계수 열합계 / 열합계 평균",
        lc / lc.mean()
    )

    add(
        "sensitivity", "감응도계수",
        "생산유발", "무차원",
        "전방 연관효과의 평균 대비 크기",
        "생산유발계수 행합계 / 행합계 평균",
        lr / lr.mean()
    )

    add(
        "production_total",
        "생산유발계수 열합계",
        "생산유발", "계수",
        "한 산업 최종수요 1단위 증가에 따른 총생산유발",
        "생산유발계수 열합계",
        lc
    )

    add(
        "production_row",
        "생산유발계수 행합계",
        "생산유발", "계수 합",
        "모든 산업 최종수요가 각각 1단위 증가하는 경우의 해당 산업 생산유발 합계",
        "생산유발계수 행합계",
        lr
    )

    add(
        "production_direct",
        "최초 직접 생산유발",
        "생산유발", "계수",
        "최종수요 1단위 증가로 발생하는 최초 생산",
        "1",
        np.ones(n)
    )

    add(
        "production_indirect",
        "간접생산유발계수 합계",
        "생산유발", "계수",
        "최초 생산 1단위를 제외한 생산유발효과",
        "생산유발계수 열합계 - 1",
        lc - 1
    )

    add(
        "production_self",
        "자기산업 생산유발계수",
        "생산유발", "계수",
        "해당 산업 내부에서 발생하는 총생산유발",
        "생산유발계수 대각원소",
        ld
    )

    add(
        "production_self_indirect",
        "자기산업 간접생산유발계수",
        "생산유발", "계수",
        "자기산업 생산유발에서 최초 생산 1을 제외",
        "생산유발계수 대각원소 - 1",
        ld - 1
    )

    add(
        "production_other",
        "타산업 생산유발계수 합계",
        "생산유발", "계수",
        "자기산업을 제외한 타산업의 생산유발",
        "생산유발계수 열합계 - 대각원소",
        other
    )

    add(
        "production_own_share",
        "자기산업 생산유발 비중",
        "생산유발", "%",
        "전체 생산유발 중 자기산업의 비중",
        "100 × 대각원소 / 열합계",
        100 * divide(ld, lc),
        "derived"
    )

    add(
        "production_other_share",
        "타산업 생산유발 비중",
        "생산유발", "%",
        "전체 생산유발 중 다른 산업의 비중",
        "100 × 타산업 유발합계 / 열합계",
        100 * divide(other, lc),
        "derived"
    )

    add(
        "production_indirect_share",
        "간접생산유발 비중",
        "생산유발", "%",
        "전체 생산유발 중 최초 생산을 제외한 비중",
        "100 × (열합계 - 1) / 열합계",
        100 * divide(lc - 1, lc),
        "derived"
    )

    # 2. 수입유발 관련 지표 2개

    add(
        "import_induced",
        "수입유발계수 열합계",
        "수입유발", "계수",
        "국내 최종수요 증가에 따른 수입유발 정도",
        "수입유발계수 열합계",
        mc
    )

    add(
        "import_relative",
        "상대적 수입유발지수",
        "수입유발", "무차원",
        "수입유발계수의 전체 평균 대비 크기",
        "수입유발계수 열합계 / 전체 평균",
        mc / mc.mean(),
        "derived"
    )

    # 3. 부가가치 관련 지표 6개

    add(
        "va_induced",
        "부가가치유발계수 열합계",
        "부가가치", "계수",
        "최종수요 1단위 증가에 따른 부가가치유발",
        "부가가치유발계수 열합계",
        vc
    )

    add(
        "va_relative",
        "상대적 부가가치유발지수",
        "부가가치", "무차원",
        "부가가치유발계수의 평균 대비 크기",
        "부가가치유발 열합계 / 전체 평균",
        vc / vc.mean(),
        "derived"
    )

    add(
        "va_direct",
        "직접 부가가치계수",
        "부가가치", "계수",
        "산출 1단위당 해당 산업 직접 부가가치",
        "직접 부가가치계수",
        v
    )

    add(
        "va_indirect",
        "간접 부가가치유발계수",
        "부가가치", "계수",
        "전체 유발부가가치에서 최초 직접 부가가치를 제외",
        "부가가치유발 열합계 - 직접 부가가치계수",
        vc - v,
        "derived"
    )

    add(
        "va_direct_share",
        "직접 부가가치유발 비중",
        "부가가치", "%",
        "전체 유발부가가치 중 최초 직접 부가가치 비중",
        "100 × 직접 부가가치계수 / 유발계수 열합계",
        100 * divide(v, vc),
        "derived"
    )

    add(
        "va_other",
        "타산업 부가가치유발계수",
        "부가가치", "계수",
        "해당 산업을 제외한 다른 산업의 부가가치유발",
        "부가가치유발 열합계 - 대각원소",
        vc - vd,
        "derived"
    )

    # 4. 투입구조 관련 지표 9개

    add(
        "domestic_input",
        "국산중간투입계수 합계",
        "투입구조", "계수",
        "산출 1단위당 국산 중간재 투입",
        "국산투입계수 열합계",
        adc
    )

    add(
        "import_input",
        "수입중간투입계수 합계",
        "투입구조", "계수",
        "산출 1단위당 수입 중간재 투입",
        "수입투입계수 열합계",
        amc
    )

    add(
        "total_input",
        "중간투입계수 합계",
        "투입구조", "계수",
        "산출 1단위당 국산 및 수입 중간재 투입",
        "국산투입계수 + 수입투입계수의 열합계",
        ac
    )

    add(
        "import_share_input",
        "중간투입 수입재 비중",
        "투입구조", "%",
        "전체 중간재 투입 중 수입재의 비중",
        "100 × 수입중간투입 / 전체 중간투입",
        100 * divide(amc, ac),
        "derived"
    )

    add(
        "domestic_share_input",
        "중간투입 국산재 비중",
        "투입구조", "%",
        "전체 중간재 투입 중 국산재의 비중",
        "100 × 국산중간투입 / 전체 중간투입",
        100 * divide(adc, ac),
        "derived"
    )

    add(
        "domestic_self_input",
        "자기산업 국산투입계수",
        "투입구조", "계수",
        "동일 상품부문의 국산 중간재 투입",
        "국산투입계수 대각원소",
        np.diag(AD)
    )

    add(
        "import_self_input",
        "자기산업 수입투입계수",
        "투입구조", "계수",
        "동일 상품부문의 수입 중간재 투입",
        "수입투입계수 대각원소",
        np.diag(AM)
    )

    add(
        "domestic_input_relative",
        "상대적 국산중간투입지수",
        "투입구조", "무차원",
        "국산중간투입계수의 평균 대비 크기",
        "국산중간투입 열합계 / 전체 평균",
        adc / adc.mean(),
        "derived"
    )

    add(
        "import_input_relative",
        "상대적 수입중간투입지수",
        "투입구조", "무차원",
        "수입중간투입계수의 평균 대비 크기",
        "수입중간투입 열합계 / 전체 평균",
        amc / amc.mean(),
        "derived"
    )

    # 5. 생산 파급 분포 관련 지표 7개

    add(
        "production_hhi",
        "생산유발 분포 집중도",
        "파급분포", "0~1",
        "생산유발이 소수 산업에 집중된 정도. 시장집중도 HHI와는 다른 지표",
        "산업별 생산유발 비중 제곱의 합",
        hhi,
        "derived"
    )

    add(
        "production_diversity",
        "생산유발 분산도",
        "파급분포", "0~1",
        "생산유발이 여러 산업에 분산된 정도",
        "1 - 생산유발 분포 집중도",
        1 - hhi,
        "derived"
    )

    add(
        "production_effective_n",
        "유효 파급 산업수",
        "파급분포", "산업 수",
        "생산유발 분포 집중도의 역수",
        "1 / 생산유발 분포 집중도",
        1 / hhi,
        "derived"
    )

    add(
        "production_entropy",
        "생산유발 분포 엔트로피",
        "파급분포", "무차원",
        "생산유발효과 분포의 정보 엔트로피",
        "-Σ p × ln(p)",
        entropy,
        "derived"
    )

    add(
        "production_top5_share",
        "상위 5개 산업 파급 비중",
        "파급분포", "%",
        "유발생산 중 가장 큰 5개 산업 비중",
        "100 × 상위 5개 산업의 생산유발 비중 합계",
        100 * top5,
        "derived"
    )

    add(
        "production_max_other",
        "최대 타산업 생산유발계수",
        "파급분포", "계수",
        "다른 산업 가운데 가장 큰 생산유발계수",
        "대각원소를 제외한 최대 생산유발계수",
        max_other,
        "derived"
    )

    add(
        "production_breadth_1pct",
        "1% 이상 파급 산업수",
        "파급분포", "산업 수",
        "생산유발 비중 1% 이상인 산업 개수",
        "생산유발 비중이 0.01 이상인 산업 수",
        breadth,
        "derived"
    )

    return emit({
        "count": n,
        "indicators": specs,
        "rows": [
            {
                "code": c,
                "name": name,
                "metrics": {
                    spec["key"]: float(
                        values[spec["key"]][i]
                    )
                    for spec in specs
                }
            }
            for i, (c, name) in enumerate(
                zip(codes, names)
            )
        ]
    })

