
/* IO INTELLIGENCE | 산업별 이중 계수 매트릭스 및 예시 기업 패널
 * 기존 app.js, model.py, worker.js, industry-heatmap.js 수정 없음
 */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const app = $('#io-app');
  if (!app || $('#industry-matrix')) return;
  const view = $('#io-view-dual');
  if (!view) return;

  const css = document.createElement('style');
  css.textContent = `
    /* 기존 히트맵은 4분면에서 유지하고 듀얼 화면에서만 감춤 */
    #io-app[data-view="dual"] #industry-heatmap {display:none!important}
    #industry-matrix {font-family:inherit;color:#192d48}
    #industry-matrix .mx-shell{background:white;border:1px solid #e2e9f2;border-radius:20px;padding:24px;box-shadow:0 10px 30px #1b3d6709}
    #industry-matrix .mx-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
    #industry-matrix .mx-kicker{font-size:11px;letter-spacing:1.5px;color:#5a7da9;font-weight:800}
    #industry-matrix h2{font-size:23px;margin:6px 0 8px;color:#1b3554}
    #industry-matrix p{font-size:13px;color:#71829b;line-height:1.7;margin:5px 0 13px}
    #industry-matrix .mx-btn{border:0;background:#204b82;color:#fff;border-radius:10px;padding:11px 17px;font:inherit;font-weight:750;cursor:pointer;margin:0}
    #industry-matrix .mx-btn:disabled{opacity:.5}
    #industry-matrix .mx-status{font-size:12px;color:#657790;min-height:22px;margin-top:10px}
    #industry-matrix .mx-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:17px 0}
    #industry-matrix .mx-kpi{border:1px solid #e3eaf3;border-radius:12px;padding:15px;background:#f9fbfe}
    #industry-matrix .mx-kpi small{display:block;color:#7d8da1;font-size:11px}
    #industry-matrix .mx-kpi strong{display:block;font-size:22px;color:#214b80;margin-top:4px}
    #industry-matrix .mx-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}
    #industry-matrix .mx-card{min-width:0;border:1px solid #e1e8f2;border-radius:15px;padding:16px;background:#fff}
    #industry-matrix .mx-card h3{font-size:17px;margin:0 0 4px;color:#233e60}
    #industry-matrix .mx-tools{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}
    #industry-matrix .mx-tools input,#industry-matrix .mx-tools select{flex:1;min-width:110px;width:auto;margin:0;padding:9px;border:1px solid #d9e2ef;border-radius:9px;font:inherit;font-size:12px;background:white;color:#233c5e}
    #industry-matrix .mx-scroll{overflow:auto;max-height:560px;border:1px solid #e8edf5;border-radius:9px}
    #industry-matrix table{width:100%;border-collapse:collapse;min-width:315px}
    #industry-matrix th{background:#eef3f9;position:sticky;top:0;z-index:2;color:#5b6f88;font-size:12px;text-align:left}
    #industry-matrix td{font-size:12px;color:#2d415f}
    #industry-matrix th,#industry-matrix td{padding:10px 8px;border-bottom:1px solid #e9eff6}
    #industry-matrix tr[data-code]{cursor:pointer}
    #industry-matrix tr[data-code]:hover{background:#f3f7ff}
    #industry-matrix .mx-heat{display:block;border-radius:7px;padding:7px 4px;text-align:center;font-weight:800;font-variant-numeric:tabular-nums}
    #industry-matrix .mx-foot{color:#718099;font-size:11px;margin-top:9px}
    #industry-matrix .mx-detail{margin-top:16px;padding:17px;border-radius:12px;background:#f1f5fb;border:1px solid #dfe8f4}
    #industry-matrix .mx-detail h3{margin:0 0 8px;font-size:17px}
    #industry-matrix .mx-detail-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
    #industry-matrix .mx-detail-grid>div{padding:9px;border-radius:9px;background:white;font-size:11px;color:#7c8aa0}
    #industry-matrix .mx-detail-grid strong{display:block;color:#23456e;font-size:16px;margin-top:3px}
    .io-company-panel{background:#fff;border:1px solid #e1e8f2;border-radius:15px;padding:16px;margin-top:14px;color:#243b5b;box-shadow:0 6px 20px #1c3b6809}
    .io-company-panel h3{margin:0 0 7px;font-size:16px;color:#203c60}
    .io-company-panel .cp-note{font-size:12px;color:#7a8ca4;line-height:1.6}
    .io-company-panel .cp-tag{display:inline-flex;background:#edf3fb;color:#28568d;padding:6px 10px;border-radius:8px;font-size:12px;margin:5px 6px 0 0}
    .io-company-panel .cp-fields{display:flex;gap:7px;margin-top:11px;flex-wrap:wrap}
    .io-company-panel input{flex:1;min-width:180px;border:1px solid #d5e0ee;border-radius:9px;padding:9px;margin:0;font-size:12px}
    .io-company-panel button{margin:0;background:#214f8c;border-radius:9px;padding:8px 13px;font-size:12px;color:white}
    @media(max-width:1050px){#industry-matrix .mx-two{grid-template-columns:1fr}}
    @media(max-width:660px){#industry-matrix .mx-shell{padding:12px}#industry-matrix .mx-kpis{grid-template-columns:1fr}#industry-matrix .mx-detail-grid{grid-template-columns:repeat(2,1fr)}}
  `;
  document.head.append(css);

  const root = document.createElement('div');
  root.id = 'industry-matrix';
  root.innerHTML = `
    <section class="mx-shell">
      <div class="mx-top"><div><div class="mx-kicker">IO INTELLIGENCE · COEFFICIENT MATRIX</div>
      <h2>산업별 영향력·감응도 비교 매트릭스</h2>
      <p>산업별 두 계수를 독립된 표로 분석합니다. 표의 행을 선택하면 공통 상세 정보가 표시됩니다.</p></div>
      <button class="mx-btn" id="mx-run" type="button">현재 분류 계수 분석</button></div>
      <div class="mx-status" id="mx-status" role="status">상단에서 산업분류 Excel을 불러온 후 분석을 실행하세요.</div>
      <div id="mx-results" hidden>
        <div class="mx-kpis" id="mx-kpis"></div>
        <div class="mx-two"><div id="mx-influence"></div><div id="mx-sensitivity"></div></div>
        <div class="mx-detail" id="mx-detail">산업을 선택하면 두 계수와 순위를 확인할 수 있습니다.</div>
        <div id="mx-companies"></div>
      </div>
    </section>`;
  view.append(root);
  const el = id => root.querySelector('#mx-' + id);
  const fmt = v => Number(v).toFixed(4);
  const metricLabel = {influence:'영향력계수',sensitivity:'감응도계수'};
  const cfg = {influence:{q:'',sort:'desc',limit:'40'},sensitivity:{q:'',sort:'desc',limit:'40'}};
  let rows=[], rankings={}, selected='', epoch=0, loading=null;
  const kind = r => r.influence>=1?(r.sensitivity>=1?'핵심 연관형':'후방 연관형'):(r.sensitivity>=1?'전방 연관형':'상대적 저연관형');
  const classification = () => $('#io-classification')?.value || 'basic';
  const storageKey = () => 'io-example-companies-' + classification();
  let companyData = {};
  function readCompanies(){try {companyData=JSON.parse(localStorage.getItem(storageKey())||'{}')}catch{companyData={}}}
  function saveCompanies(){try{localStorage.setItem(storageKey(),JSON.stringify(companyData))}catch{}}
  function ranks(metric){const m=new Map();[...rows].sort((a,b)=>b[metric]-a[metric]).forEach((r,i,a)=>m.set(r.code,i&&r[metric]===a[i-1][metric]?m.get(a[i-1].code):i+1));return m}
  function cellColor(v){const t=Math.min(1,Math.abs(v-1)/.45);const a=(.15+.68*t).toFixed(2);return v>=1?`rgba(42,104,200,${a})`:`rgba(213,72,91,${a})`}
  const element=(tag,cls='',text='')=>{const x=document.createElement(tag);if(cls)x.className=cls;x.textContent=text;return x};

  function companyPanel(target, r){
    target.replaceChildren();
    const p=element('div','io-company-panel');
    if(!r){p.append(element('h3','', '산업별 예시 기업'),element('p','cp-note','분석 후 산업을 선택하세요.'));target.append(p);return}
    p.append(element('h3','',r.name+' · 예시 기업'));
    p.append(element('div','cp-note','업종을 이해하기 위한 예시 기업입니다. 해당 산업의 투입·산출액이나 계수 계산에 사용되지 않습니다. 직접 등록한 이름은 사실 확인이 필요합니다.'));
    const names=companyData[r.code]||[];
    if(names.length){names.forEach(n=>p.append(element('span','cp-tag',n)))}
    else p.append(element('div','cp-note','아직 검증된 기업 예시가 등록되지 않았습니다.'));
    const f=element('form','cp-fields');
    const inp=document.createElement('input');inp.placeholder='예: 기업명 (최대 3개, 쉼표로 구분 가능)';inp.setAttribute('aria-label','기업 예시 입력');
    const b=element('button','','기업 예시 저장');b.type='submit';
    const clear=element('button','','초기화');clear.type='button';clear.style.background='#8392aa';
    f.append(inp,b,clear);
    f.addEventListener('submit',e=>{e.preventDefault();const input=inp.value.split(',').map(x=>x.trim()).filter(Boolean);companyData[r.code]=[...new Set([...names,...input])].slice(0,3);saveCompanies();companyPanel(target,r)});
    clear.addEventListener('click',()=>{delete companyData[r.code];saveCompanies();companyPanel(target,r)});
    p.append(f);target.append(p);
  }

  function showSelection(code){const r=rows.find(x=>x.code===String(code));if(!r)return;selected=r.code;
    el('detail').replaceChildren();
    el('detail').append(element('h3','',r.name+' · '+r.code),element('p','',kind(r)));
    const g=element('div','mx-detail-grid');
    for(const m of ['influence','sensitivity']){
      const d=element('div','',metricLabel[m]);d.append(element('strong','',fmt(r[m])));g.append(d);
      const k=element('div','','전체 순위');k.append(element('strong','',rankings[m].get(r.code)+' / '+rows.length));g.append(k);
    }
    el('detail').append(g);companyPanel(el('companies'),r);
    root.querySelectorAll('tr[data-code]').forEach(tr=>{tr.style.background=tr.dataset.code===code?'#e9f1fc':''});
  }
  function drawTable(metric){const host=el(metric);host.replaceChildren();
    const card=element('div','mx-card');card.append(element('h3','',metricLabel[metric]+' · 산업별 매트릭스'));
    card.append(element('p','',metric==='influence'?'후방 연관효과 · 생산유발계수 열합계의 상대적 크기':'전방 연관효과 · 생산유발계수 행합계의 상대적 크기'));
    const controls=element('div','mx-tools');
    const search=document.createElement('input');search.type='search';search.placeholder='산업명 또는 코드';search.value=cfg[metric].q;
    const sort=document.createElement('select');[['desc','높은 순'],['asc','낮은 순'],['name','산업명순']].forEach(([v,t])=>{const o=element('option','',t);o.value=v;sort.append(o)});sort.value=cfg[metric].sort;
    const limit=document.createElement('select');[['20','20개'],['40','40개'],['100','100개'],['all','전체']].forEach(([v,t])=>{const o=element('option','',t);o.value=v;limit.append(o)});limit.value=cfg[metric].limit;
    controls.append(search,sort,limit);card.append(controls);
    const wrap=element('div','mx-scroll');const table=document.createElement('table');const head=document.createElement('thead');head.innerHTML='<tr><th>순위</th><th>산업명</th><th>계수</th><th>평균 대비</th></tr>';table.append(head);
    const body=document.createElement('tbody');table.append(body);wrap.append(table);card.append(wrap);
    const foot=element('div','mx-foot');card.append(foot);host.append(card);
    const render=()=>{body.replaceChildren();let list=rows.filter(r=>(r.name+' '+r.code).toLowerCase().includes(cfg[metric].q.toLowerCase()));list.sort((a,b)=>cfg[metric].sort==='name'?a.name.localeCompare(b.name,'ko'):cfg[metric].sort==='asc'?a[metric]-b[metric]:b[metric]-a[metric]);const total=list.length;if(cfg[metric].limit!=='all')list=list.slice(0,+cfg[metric].limit);
      list.forEach(r=>{const tr=document.createElement('tr');tr.dataset.code=r.code;tr.tabIndex=0;tr.append(element('td','',rankings[metric].get(r.code)+'위'),element('td','',r.name));
        const heat=document.createElement('td');const span=element('span','mx-heat',fmt(r[metric]));span.style.background=cellColor(r[metric]);span.style.color=Math.abs(r[metric]-1)>.3?'white':'#263c5a';heat.append(span);tr.append(heat);
        const change=(r[metric]-1)*100;tr.append(element('td','',(change>=0?'+':'')+change.toFixed(1)+'%'));
        tr.addEventListener('click',()=>showSelection(r.code));tr.addEventListener('keydown',e=>{if(e.key==='Enter')showSelection(r.code)});body.append(tr);
      });foot.textContent=`검색 ${total}개 · 표시 ${list.length}개 · 전체 ${rows.length}개 산업 기준 · 평균 = 1.0000`;
    };
    search.oninput=()=>{cfg[metric].q=search.value;render()};sort.onchange=()=>{cfg[metric].sort=sort.value;render()};limit.onchange=()=>{cfg[metric].limit=limit.value;render()};render();
  }

  async function ensureData(){if($('#sheet')?.disabled)throw Error('먼저 상단에서 산업분류를 불러오세요.');if(rows.length)return rows;
    if(loading)return loading;
    const mine=epoch;loading=(async()=>{if(typeof call!=='function')throw Error('기존 분석 함수(call)를 찾을 수 없습니다.');const res=await call('analyze',{});if(mine!==epoch)throw Error('산업분류가 변경되었습니다. 다시 분석하세요.');const list=Array.isArray(res)?res:res?.results;if(!Array.isArray(list)||!list.length)throw Error('분석 결과가 없습니다.');
      const parsed=list.map(r=>({code:String(r.code),name:String(r.name),influence:Number(r.influence),sensitivity:Number(r.sensitivity)}));
      if(parsed.some(r=>!r.code||!Number.isFinite(r.influence)||!Number.isFinite(r.sensitivity)))throw Error('산업별 계수 데이터가 잘못되었습니다.');rows=parsed;rankings={influence:ranks('influence'),sensitivity:ranks('sensitivity')};readCompanies();return rows})();
    try{return await loading}finally{loading=null}
  }
  function reset(){epoch++;rows=[];rankings={};selected='';el('results').hidden=true;el('status').textContent='현재 분류의 Excel을 불러온 뒤 분석을 실행하세요.'}
  $('#load-basic')?.addEventListener('click',reset,true);
  $('#io-classification')?.addEventListener('change',reset);
  el('run').onclick=async()=>{el('run').disabled=true;el('status').textContent='산업별 계수 분석 중…';try{await ensureData();
    const n=rows.length,avg=m=>rows.reduce((s,r)=>s+r[m],0)/n;
    el('kpis').replaceChildren();for(const [label,value] of [['분석 산업',n+'개'],['영향력계수 평균',fmt(avg('influence'))],['감응도계수 평균',fmt(avg('sensitivity'))]]){const d=element('div','mx-kpi');d.append(element('small','',label),element('strong','',value));el('kpis').append(d)}
    drawTable('influence');drawTable('sensitivity');el('results').hidden=false;showSelection(rows[0].code);el('status').textContent=`${n}개 산업 · 영향력/감응도 매트릭스 준비 완료`;
    }catch(e){el('status').textContent='분석 실패: '+e.message}finally{el('run').disabled=false}};

  // 4분면·트리맵·산업 상세 화면에도 동일한 기업 예시 패널 표시
  function installCompanySlot(host, id){if(!host)return null;let p=document.getElementById(id);if(!p){p=document.createElement('div');p.id=id;const anchor=host.closest('.plot-layout,.layout')||host;anchor.insertAdjacentElement('afterend',p)}return p}
  function codeFromTitle(text){const first=String(text||'').split('\n')[0];const m=first.match(/\(([^()]+)\)\s*$/);return m?.[1]||''}
  async function showCompanyIn(target, code){if(!target||!code)return;try{await ensureData();const r=rows.find(x=>x.code===String(code));if(r)companyPanel(target,r)}catch(e){target.textContent=e.message}}
  const plotPanel=installCompanySlot($('#ii-detail'),'io-company-quadrant');
  const treePanel=installCompanySlot($('#tm-detail'),'io-company-treemap');
  const detailPanel=installCompanySlot($('#id-status'),'io-company-detail');
  $('#ii-scatter')?.addEventListener('click',e=>{const t=e.target.closest('circle.bubble');if(t)showCompanyIn(plotPanel,codeFromTitle(t.querySelector('title')?.textContent))});
  $('#tm-svg')?.addEventListener('click',e=>{const t=e.target.closest('g.tile');if(t)showCompanyIn(treePanel,codeFromTitle(t.querySelector('title')?.textContent))});
  $('#id-sector')?.addEventListener('change',e=>showCompanyIn(detailPanel,e.target.value));
  $('#id-load')?.addEventListener('click',()=>{const s=$('#id-sector');if(s){const ob=new MutationObserver(()=>{if(!s.disabled&&s.value){ob.disconnect();showCompanyIn(detailPanel,s.value)}});ob.observe(s,{attributes:true,childList:true});}});
})();
