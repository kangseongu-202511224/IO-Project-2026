import json, io
import numpy as np
import openpyxl

book = None

def emit(x):
    return json.dumps(x, ensure_ascii=False, allow_nan=False)

def initialize(raw):
    global book, codes, names, L, M, V, AD, AM, sheets, valid

    wb = openpyxl.load_workbook(
        io.BytesIO(bytes(raw)),
        read_only=True,
        data_only=True
    )
    book = {s: list(wb[s].values) for s in wb.sheetnames}
    wb.close()

    sheets = list(book)
    base = book['국산투입계수(Ad)']

    row_codes = {
        str(r[0]) for r in base[6:]
        if r and r[0] is not None
    }

    codes = [
        str(c) for c in base[4][2:]
        if c is not None
        and str(c) in row_codes
        and not (str(c).isdigit() and int(str(c)) >= 9000)
    ]

    if len(codes) not in (33, 83, 165, 380) or len(set(codes)) != len(codes):
        raise ValueError('산업코드 수 또는 중복을 확인하세요.')

    nm = {str(r[0]): str(r[1]) for r in base[6:]}
    names = [nm[c] for c in codes]

    def matrix(sheet_name):
        rows = book[sheet_name]
        ri = {str(r[0]): i for i, r in enumerate(rows) if r}
        ci = {str(c): i for i, c in enumerate(rows[4])}
        a = np.array(
            [[rows[ri[c]][ci[k]] for k in codes] for c in codes],
            dtype=float
        )
        if not np.isfinite(a).all():
            raise ValueError(sheet_name + ': 비수치 또는 결측 데이터')
        return a

    L = matrix('생산유발계수')
    M = matrix('수입유발계수')
    V = matrix('부가가치유발계수')
    AD = matrix('국산투입계수(Ad)')
    AM = matrix('수입투입계수(Am)')

    rows = book['총투입계수(A)']
    ci = {str(c): i for i, c in enumerate(rows[4])}
    vr = next(r for r in rows if str(r[0]) == '9690')
    v = np.array([vr[ci[c]] for c in codes], dtype=float)

    residuals = {
        '생산': float(np.max(np.abs((np.eye(len(codes)) - AD) @ L - np.eye(len(codes))))),
        '수입': float(np.max(np.abs(AM @ L - M))),
        '부가가치': float(np.max(np.abs(v[:, None] * L - V)))
    }

    valid = max(residuals.values()) < 1e-8
    if not valid:
        raise ValueError('계수 검증 실패: ' + str(residuals))

    return emit({
        'sectors': [{'code': c, 'name': n} for c, n in zip(codes, names)],
        'sheets': sheets,
        'residuals': residuals
    })

def explore(sheet, rowcode):
    rows = book[sheet]

    choices = [
        {'code': str(r[0]), 'name': str(r[1])}
        for r in rows[6:]
        if len(r) > 1 and r[0] is not None and r[1] is not None
    ]

    chosen = next((r for r in rows[6:] if str(r[0]) == rowcode), None)
    if chosen is None:
        chosen = next(
            r for r in rows[6:]
            if r[0] is not None and r[1] is not None
        )

    cells = []
    for i in range(2, len(rows[4])):
        if rows[4][i] is None:
            continue

        val = chosen[i] if i < len(chosen) else None

        if isinstance(val, (float, int)):
            val = float(val)
        elif val is not None:
            val = str(val)

        cells.append({
            'code': str(rows[4][i]),
            'name': str(rows[5][i] or ''),
            'value': val
        })

    return emit({
        'rows': choices,
        'selected': str(chosen[0]),
        'name': str(chosen[1]),
        'unit': str(rows[3][0] or '계수').replace('係数', '계수 / 비율: 행·열 명칭 확인'),
        'cells': cells
    })

def analyze_industries():
    if not valid:
        raise ValueError('검증된 데이터가 없습니다.')

    col_sum = L.sum(axis=0)
    row_sum = L.sum(axis=1)
    avg = float(L.sum() / len(codes))

    influence = col_sum / avg
    sensitivity = row_sum / avg

    results = [
        {
            'code': c,
            'name': n,
            'influence': float(i),
            'sensitivity': float(s)
        }
        for c, n, i, s in zip(codes, names, influence, sensitivity)
    ]

    results.sort(
        key=lambda r: (-r['influence'], -r['sensitivity'], r['code'])
    )

    return emit({
        'count': len(results),
        'results': results
    })

def simulate(payload):
    if not valid:
        raise ValueError('검증된 데이터가 없습니다.')

    shocks = json.loads(payload)
    f = np.zeros(len(codes))

    for s in shocks:
        a = float(s['amount'])
        if not np.isfinite(a) or a < 0:
            raise ValueError('수요 증가액은 유한한 0 이상의 수여야 합니다.')
        f[codes.index(s['code'])] += a

    if not f.sum() > 0:
        raise ValueError('한 산업 이상의 양의 수요 증가액을 입력하세요.')

    x = L @ f
    m = M @ f
    v = V @ f

    result = [
        {
            'code': c,
            'name': n,
            'production': float(a),
            'imports': float(b),
            'valueAdded': float(d)
        }
        for c, n, a, b, d in zip(codes, names, x, m, v)
    ]
    result.sort(key=lambda r: r['production'], reverse=True)

    return emit({
        'demand': float(f.sum()),
        'production': float(x.sum()),
        'imports': float(m.sum()),
        'valueAdded': float(v.sum()),
        'multiplier': float(x.sum() / f.sum()),
        'rows': result
    })

def heatmap(payload):
    if not valid:
        raise ValueError('검증된 데이터가 없습니다.')

    params = json.loads(payload)
    metric = params.get('metric', 'influence')
    count = int(params.get('count', 12))

    if metric not in ('influence', 'sensitivity'):
        raise ValueError('heatmap 기준은 influence 또는 sensitivity만 가능합니다.')

    count = max(5, min(count, len(codes), 20))

    analysis = json.loads(analyze_industries())['results']
    ranked = sorted(analysis, key=lambda r: r[metric], reverse=True)[:count]

    selected_codes = [r['code'] for r in ranked]
    selected_names = [r['name'] for r in ranked]
    index_map = {c: i for i, c in enumerate(codes)}
    idx = [index_map[c] for c in selected_codes]

    sub = AD[np.ix_(idx, idx)]
    row_means = sub.mean(axis=1)
    col_means = sub.mean(axis=0)
    overall = float(sub.mean())

    return emit({
        'metric': metric,
        'count': count,
        'codes': selected_codes,
        'names': selected_names,
        'matrix': [[float(v) for v in row] for row in sub],
        'rowMeans': [float(v) for v in row_means],
        'colMeans': [float(v) for v in col_means],
        'overallMean': overall
    })
