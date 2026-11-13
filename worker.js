
let py = null;
let chain = Promise.resolve();

const PYODIDE_URL =
  'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';

async function handle({ id, type, payload }) {
  try {
    let result;

    if (type === 'init') {
      postMessage({
        type: 'status',
        text: 'Python 실행 환경 준비 중…'
      });

      if (!py) {
        importScripts(PYODIDE_URL + 'pyodide.js');

        py = await loadPyodide({
          indexURL: PYODIDE_URL
        });

        await py.loadPackage(['numpy', 'micropip']);

        await py.runPythonAsync(
          "import micropip\nawait micropip.install('openpyxl==3.1.5')"
        );
      }

      const response = await fetch(
        './model.py?v=20261113-2'
      );

      if (!response.ok) {
        throw new Error(
          'model.py 다운로드 실패 (HTTP ' +
          response.status + ')'
        );
      }

      await py.runPythonAsync(
        await response.text()
      );

      postMessage({
        type: 'status',
        text: 'Excel 읽기와 계수 검증 중…'
      });

      py.globals.set(
        'raw_input',
        new Uint8Array(payload)
      );

      await py.runPythonAsync(
        'raw_bytes = raw_input.to_py()'
      );

      result = await py.runPythonAsync(
        'initialize(raw_bytes)'
      );

      await py.runPythonAsync(
        'del raw_input, raw_bytes'
      );

    } else {
      if (!py) {
        throw new Error(
          'Excel 자료를 먼저 불러오세요.'
        );
      }

      if (type === 'explore') {
        py.globals.set(
          'sheet_input',
          payload.sheet
        );

        py.globals.set(
          'row_input',
          payload.row || ''
        );

        result = py.runPython(
          'explore(sheet_input, row_input)'
        );

      } else if (type === 'analyze') {
        result = py.runPython(
          'analyze_industries()'
        );

      } else if (type === 'heatmap') {
        py.globals.set(
          'heatmap_input',
          JSON.stringify(payload)
        );

        result = py.runPython(
          'heatmap(heatmap_input)'
        );

      } else if (type === 'simulate') {
        py.globals.set(
          'scenario_input',
          JSON.stringify(payload)
        );

        result = py.runPython(
          'simulate(scenario_input)'
        );

      } else {
        throw new Error(
          '지원하지 않는 작업: ' + type
        );
      }
    }

    postMessage({
      id,
      ok: true,
      result: JSON.parse(result)
    });

  } catch (error) {
    postMessage({
      id,
      ok: false,
      error: String(error)
    });
  }
}

onmessage = event => {
  chain = chain
    .then(() => handle(event.data))
    .catch(error => {
      postMessage({
        id: event.data.id,
        ok: false,
        error: String(error)
      });
    });
};
