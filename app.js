const $=id=>document.getElementById(id);
const fmt=x=>Number(x).toLocaleString('ko-KR',{maximumFractionDigits:3});
let worker, nextId=0, requests=new Map(), sectors=[], rowChoices=[], cells=[], basket=[], result=null;
function text(tag,value){const e=document.createElement(tag);e.textContent=value;return e;}
function call(type,payload){return new Promise((resolve,reject)=>{const id=++nextId;requests.set(id,{resolve,reject});worker.postMessage({id,type,payload});});}
function startWorker(){worker=new Worker('./worker.js?v=3');worker.onmessage=({data:d})=>{if(d.type==='status'){$('status').textContent=d.text;return;}const p=requests.get(d.id);if(!p)return;requests.delete(d.id);d.ok?p.resolve(d.result):p.reject(Error(d.error));};worker.onerror=e=>{for(const p of requests.values())p.reject(Error(e.message||'Worker 실행 오류'));requests.clear();};}
function options(el,list){el.replaceChildren(...list.map(x=>{const o=document.createElement('option');o.value=x.code;o.textContent=x.code+' '+x.name;return o;}));}
function invalidate(){result=null;$('results').hidden=true;}
async function load(buffer){
 invalidate();basket=[];renderBasket();
 for(const id of ['sheet','row','sector','add','run','row-search','col-search','sector-search','amount'])$(id).disabled=true;
 if(worker)worker.terminate();for(const p of requests.values())p.reject(Error('데이터 다시 로드'));requests.clear();startWorker();
 try{const info=await call('init',buffer);sectors=info.sectors;options($('sector'),sectors);$('sector-search').value='';$('row-search').value='';$('col-search').value='';$('sheet').replaceChildren(...info.sheets.map(s=>{const o=text('option',s);o.value=s;return o;}));
 $('validation').textContent=JSON.stringify(info.residuals,null,2)+'\n최대 절대 잔차: 허용값 1e-8 미만';
 for(const id of ['sheet','row','sector','add','run','row-search','col-search','sector-search','amount'])$(id).disabled=false;
 await explore();$('status').textContent='준비 완료 · '+sectors.length+'개 부문 · '+info.sheets.length+'개 시트 · 계수 검증 통과';
 }catch(e){$('status').textContent='준비 실패: '+e.message+' — 새로고침 후 재시도하세요.';}
}
let exploreSeq=0;
async function explore(){const seq=++exploreSeq;try{const d=await call('explore',{sheet:$('sheet').value,row:$('row').value});if(seq!==exploreSeq)return;rowChoices=d.rows;filterRows(d.selected);cells=d.cells;$('unit').textContent=d.unit;$('explore-caption').textContent=$('sheet').value+' / 행: '+d.selected+' '+d.name;renderCells();}catch(e){$('status').textContent=e.message;}}
function filterRows(selected){const q=$('row-search').value.trim();options($('row'),rowChoices.filter(r=>(r.code+' '+r.name).includes(q)));if([...$('row').options].some(o=>o.value===selected))$('row').value=selected;}
function renderCells(){const q=$('col-search').value.trim();$('cells').replaceChildren(...cells.filter(c=>(c.code+' '+c.name).includes(q)).map(c=>{const tr=document.createElement('tr');for(const v of [c.code,c.name,c.value===null?'빈 셀':typeof c.value==='number'?fmt(c.value):c.value])tr.append(text('td',v));return tr;}));}
$('sheet').onchange=()=>{$('row-search').value='';$('row').replaceChildren();explore();};$('row').onchange=explore;
$('row-search').oninput=()=>{filterRows();if($('row').value)explore();else{$('cells').replaceChildren();$('explore-caption').textContent='일치하는 행이 없습니다.';}};
$('col-search').oninput=renderCells;
$('sector-search').oninput=()=>{const q=$('sector-search').value.trim();options($('sector'),sectors.filter(s=>(s.code+' '+s.name).includes(q)));};
function renderBasket(){$('basket').replaceChildren(...basket.map((s,i)=>{const li=text('li',s.code+' '+s.name+' / '+fmt(s.amount)+'백만원 ');const b=text('button','삭제');b.type='button';b.onclick=()=>{basket.splice(i,1);invalidate();renderBasket();};li.append(b);return li;}));$('sim-status').textContent=basket.length?basket.length+'개 입력 준비. 계산 버튼을 누르세요.':'시나리오를 추가하세요.';}
$('scenario').onsubmit=e=>{e.preventDefault();const amount=Number($('amount').value),s=sectors.find(s=>s.code===$('sector').value);if(!s||!Number.isFinite(amount)||amount<=0){$('sim-status').textContent='산업과 양의 증가액을 확인하세요.';return;}basket.push({...s,amount});invalidate();renderBasket();};
$('clear').onclick=()=>{basket=[];invalidate();renderBasket();};
$('run').onclick=async()=>{if(!basket.length){$('sim-status').textContent='시나리오를 먼저 추가하세요.';return;}const snapshot=basket.map(s=>({...s}));$('run').disabled=true;$('sim-status').textContent='계산 중…';try{const r=await call('simulate',snapshot);if(JSON.stringify(snapshot)!==JSON.stringify(basket)){$('sim-status').textContent='입력이 변경되었습니다. 다시 계산하세요.';return;}result=r;renderResult();$('sim-status').textContent='계산 완료. 아래 결과는 현재 시나리오에 대응합니다.';}catch(e){invalidate();$('sim-status').textContent='계산 실패: '+e.message;}finally{$('run').disabled=false;}};
function renderResult(){$('results').hidden=false;$('cards').replaceChildren(...[['수요 증가액',result.demand],['생산유발액',result.production],['수입유발액',result.imports],['부가가치유발액',result.valueAdded]].map(([title,v])=>{const d=text('div',title);d.className='card';d.append(text('strong',fmt(v)),text('span','백만원'));return d;}));const max=Math.max(...result.rows.map(r=>r.production),1);$('bars').replaceChildren(...result.rows.slice(0,15).map(r=>{const d=text('div',r.name+' · '+fmt(r.production)+'백만원');d.className='bar';const t=document.createElement('div');t.className='track';const f=document.createElement('div');f.className='fill';f.style.width=Math.max(0,r.production/max*100)+'%';t.append(f);d.append(t);return d;}));$('result-rows').replaceChildren(...result.rows.map(r=>{const tr=document.createElement('tr');[r.code,r.name,fmt(r.production),fmt(r.imports),fmt(r.valueAdded)].forEach(v=>tr.append(text('td',v)));return tr;}));}
function csvCell(v){let s=String(v);if(/^[=+@-]/.test(s)&&typeof v!=='number')s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
$('download').onclick=()=>{if(!result)return;const rows=[['산업코드','산업명','생산유발액_백만원','수입유발액_백만원','부가가치유발액_백만원'],...result.rows.map(r=>[r.code,r.name,r.production,r.imports,r.valueAdded])];const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='io-2023-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};

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

async function loadDefaultWorkbook(){
 try {
  $('status').textContent='기본 Excel 내려받는 중…';
  
const response=await fetch(ioFiles[ioSelect.value]);

  if(!response.ok)throw Error('기본 Excel 다운로드 실패 (HTTP '+response.status+')');
  await load(await response.arrayBuffer());
 }catch(error){
  $('status').textContent='준비 실패: '+error.message+' — 연결 상태를 확인하고 새로고침하세요.';
 }
}
$('load-basic').onclick=async()=>{
 const button=$('load-basic');
 button.disabled=true;
 button.textContent='불러오는 중…';
 try {
  await loadDefaultWorkbook();
  const ready=!$('sheet').disabled;
  button.textContent=ready?'기본부문 불러오기 완료':'기본부문 다시 불러오기';
  button.disabled=false;
 }finally{
  if($('sheet').disabled){button.disabled=false;button.textContent='기본부문 다시 불러오기';}
 }
};

ioSelect.onchange = () => {
  $('load-basic').textContent = ioLabels[ioSelect.value] + ' 불러오기';
};

$('analyze-btn').onclick = async () => {
  const button = $('analyze-btn');
  const status = $('analyze-status');

  button.disabled = true;
  status.textContent = '영향력계수·감응도계수 계산 중…';

  try {
    const data = await call('analyze', {});

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

    $('analyze-results').hidden = false;
   requestAnimationFrame(() => drawIndustryChart(data.results));
    status.textContent =
      data.count + '개 산업의 분석이 완료되었습니다.';

  } catch (error) {
    status.textContent = '분석 실패: ' + error.message;
  } finally {
    button.disabled = false;
  }
};

let industryChartPoints = [];

function enableIndustryChartClick() {
  const canvas = document.getElementById('industry-chart');

  canvas.style.cursor = 'crosshair';

  canvas.onclick = event => {
    const rect = canvas.getBoundingClientRect();

    // 화면 크기와 실제 캔버스 크기의 차이를 보정
    const mouseX =
      (event.clientX - rect.left) * canvas.width / rect.width;
    const mouseY =
      (event.clientY - rect.top) * canvas.height / rect.height;

    // 클릭한 위치와 가장 가까운 산업 찾기
    let closest = null;
    let minDistance = Infinity;

    for (const point of industryChartPoints) {
      const distance = Math.hypot(
        point.x - mouseX,
        point.y - mouseY
      );

      if (distance < minDistance) {
        minDistance = distance;
        closest = point;
      }
    }

    // 점에서 12픽셀 이내를 클릭한 경우만 표시
    if (!closest || minDistance > 12) return;

    const r = closest.industry;

    const message =
      '산업명: ' + r.name + '\n' +
      '산업코드: ' + r.code + '\n' +
      '영향력계수: ' + Number(r.influence).toFixed(4) + '\n' +
      '감응도계수: ' + Number(r.sensitivity).toFixed(4);

    alert(message);
  };
}

function drawIndustryChart(results) {
  const canvas = document.getElementById('industry-chart');
  const ctx = canvas.getContext('2d');

  const W = canvas.width;
  const H = canvas.height;
  const left = 70;
  const right = 30;
  const top = 35;
  const bottom = 65;

  const pw = W - left - right;
  const ph = H - top - bottom;

  const maxX = Math.max(
    1.2,
    ...results.map(r => r.influence)
  ) * 1.08;

  const maxY = Math.max(
    1.2,
    ...results.map(r => r.sensitivity)
  ) * 1.08;

  const x = value => left + value / maxX * pw;
  const y = value => H - bottom - value / maxY * ph;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, W, H);

  // 기준값 1 표시
  ctx.strokeStyle = '#999';
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(x(1), top);
  ctx.lineTo(x(1), H - bottom);
  ctx.moveTo(left, y(1));
  ctx.lineTo(W - right, y(1));
  ctx.stroke();
  ctx.setLineDash([]);

  // X축과 Y축
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, H - bottom);
  ctx.lineTo(W - right, H - bottom);
  ctx.stroke();

  // 축 눈금
  ctx.fillStyle = '#333';
  ctx.font = '14px sans-serif';

  for (let i = 0; i <= 5; i++) {
    const xv = maxX * i / 5;
    const yv = maxY * i / 5;

    ctx.textAlign = 'center';
    ctx.fillText(xv.toFixed(1), x(xv), H - bottom + 22);

    ctx.textAlign = 'right';
    ctx.fillText(yv.toFixed(1), left - 10, y(yv) + 5);
  }

  
  // 산업별 점의 위치 저장
  industryChartPoints = [];

  // 산업별 점 표시
  results.forEach(r => {
    const px = x(r.influence);
    const py = y(r.sensitivity);

    industryChartPoints.push({
      x: px,
      y: py,
      industry: r
    });

    const highX = r.influence >= 1;
    const highY = r.sensitivity >= 1;

    if (highX && highY) ctx.fillStyle = '#e74c3c';
    else if (highX) ctx.fillStyle = '#3498db';
    else if (highY) ctx.fillStyle = '#27ae60';
    else ctx.fillStyle = '#888888';

    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

    const highX = r.influence >= 1;
    const highY = r.sensitivity >= 1;

    if (highX && highY) ctx.fillStyle = '#e74c3c';
    else if (highX) ctx.fillStyle = '#3498db';
    else if (highY) ctx.fillStyle = '#27ae60';
    else ctx.fillStyle = '#888888';

    ctx.beginPath();
    ctx.arc(x(r.influence), y(r.sensitivity), 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 축 제목
  ctx.fillStyle = '#222';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('영향력계수', W / 2, H - 12);

  ctx.save();
  ctx.translate(20, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('감응도계수', 0, 0);
  ctx.restore();
enableIndustryChartClick();
}



