(() => {
  const byId = id => document.getElementById(id);

  const EXPORT_COLUMNS = [
    ['protocol','Protocolo'],
    ['created_at','Data e hora'],
    ['setor','Setor'],
    ['cargo','Cargo / função'],
    ['situacao','Situação atual'],
    ['frequencia','Frequência de uso'],
    ['ferramentas','Ferramentas utilizadas'],
    ['ferramentaOutra','Outra ferramenta'],
    ['acesso','Custeio / forma de acesso'],
    ['atividades','Atividades realizadas com IA'],
    ['produtividade','Impacto em produtividade (1-5)'],
    ['qualidade','Impacto em qualidade (1-5)'],
    ['agilidade','Impacto em agilidade (1-5)'],
    ['tempo','Tempo economizado por semana'],
    ['criou','Criou ou melhorou algo com IA'],
    ['caso','Caso de uso relatado'],
    ['revisao','Revisão / validação do resultado'],
    ['barreiras','Barreiras ao uso de IA'],
    ['capacitacao','Temas de capacitação'],
    ['compartilha','Compartilhamento de conhecimento'],
    ['sugestao','Sugestões, necessidades ou preocupações'],
    ['multiplicador','Disponível para compartilhar caso'],
    ['nome','Nome do voluntário'],
    ['contato','Contato corporativo']
  ];

  function rows(){
    try{return Array.isArray(filteredData)?filteredData:[]}catch{return []}
  }

  function valueFor(row,key){
    if(key==='created_at') return formatDateTime(row.created_at || row.data);
    const value=row?.[key];
    return Array.isArray(value)?value.join(', '):(value??'');
  }

  function formatDateTime(value){
    if(!value)return '';
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return String(value);
    return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(d);
  }

  function pct(n,d){return d?Math.round(n/d*100):0}
  function mean(values){
    const nums=values.map(Number).filter(Number.isFinite);
    return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:null;
  }

  function exportContext(){
    const data=rows();
    const total=data.length;
    const users=data.filter(r=>r.situacao==='Utilizo ferramentas de IA no trabalho');
    const daily=users.filter(r=>['Várias vezes ao dia','Todos ou quase todos os dias'].includes(r.frequencia));
    const recurring=users.filter(r=>['Várias vezes ao dia','Todos ou quase todos os dias','Algumas vezes por semana','Aproximadamente uma vez por semana'].includes(r.frequencia));
    const impact=users.flatMap(r=>[r.produtividade,r.qualidade,r.agilidade]).filter(v=>v!==''&&v!==undefined&&v!==null);
    const timeAnswered=users.filter(r=>r.tempo);
    const time2h=timeAnswered.filter(r=>['2 a 4 horas','4 a 8 horas','Mais de 8 horas'].includes(r.tempo));
    const reviewAnswered=users.filter(r=>r.revisao);
    const highReview=reviewAnswered.filter(r=>['Sempre','Frequentemente'].includes(r.revisao));
    const sector=byId('filterSector');
    const period=byId('filterPeriod');
    return {
      data,total,users,
      sector:sector?.selectedOptions?.[0]?.textContent?.trim()||'Todos os setores',
      period:period?.selectedOptions?.[0]?.textContent?.trim()||'Todo o período',
      metrics:[
        ['Respostas exportadas',String(total)],
        ['Setor',sector?.selectedOptions?.[0]?.textContent?.trim()||'Todos os setores'],
        ['Período',period?.selectedOptions?.[0]?.textContent?.trim()||'Todo o período'],
        ['Adoção de IA',total?`${pct(users.length,total)}%`:'—'],
        ['Uso diário entre usuários de IA',users.length?`${pct(daily.length,users.length)}%`:'—'],
        ['Uso recorrente entre usuários de IA',users.length?`${pct(recurring.length,users.length)}%`:'—'],
        ['Impacto médio percebido',impact.length?`${mean(impact).toFixed(1).replace('.',',')}/5`:'—'],
        ['Economia de 2h ou mais por semana',timeAnswered.length?`${pct(time2h.length,timeAnswered.length)}%`:'—'],
        ['Alta validação das respostas',reviewAnswered.length?`${pct(highReview.length,reviewAnswered.length)}%`:'—'],
        ['Gerado em',new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'medium'}).format(new Date())]
      ]
    };
  }

  function updateExportInfo(){
    const c=exportContext();
    const count=byId('exportCurrentCount');
    const scope=byId('exportCurrentScope');
    if(count)count.textContent=`${c.total} resposta${c.total===1?'':'s'} na exportação`;
    if(scope)scope.textContent=`Setor: ${c.sector} • Período: ${c.period}`;
  }

  function createExportPanel(){
    const csv=byId('exportCsv');
    const json=byId('exportJson');
    if(!csv||!json||byId('exportExcel'))return;
    const section=csv.closest('.dashboard-section');
    if(!section)return;
    const baseCard=csv.closest('.card');
    const actions=csv.closest('.form-actions');
    if(!baseCard||!actions)return;

    const card=document.createElement('div');
    card.className='card export-report-card';
    card.innerHTML=`
      <div class="export-report-head">
        <div>
          <span class="pill">Exportação detalhada</span>
          <h3>Exportar relatório</h3>
          <p>Todos os formatos respeitam os filtros atuais. A exportação detalhada inclui protocolo, data e hora, identificação funcional, uso de IA, ferramentas, custeio, atividades, impacto, economia de tempo, validação, barreiras, capacitação, casos de uso e campos voluntários de contato.</p>
        </div>
        <div class="export-scope">
          <strong id="exportCurrentCount">0 respostas na exportação</strong>
          <span id="exportCurrentScope">Setor: Todos os setores • Período: Todo o período</span>
        </div>
      </div>
      <div class="export-format-grid">
        <article class="export-format excel"><div><strong>Excel</strong><span>Arquivo .xlsx com duas abas: Resumo gerencial e Respostas detalhadas.</span></div><div data-export-slot="excel"></div></article>
        <article class="export-format"><div><strong>CSV</strong><span>Base tabular completa, adequada para Excel, Power BI e outras análises.</span></div><div data-export-slot="csv"></div></article>
        <article class="export-format"><div><strong>JSON</strong><span>Estrutura integral dos registros filtrados para integração, auditoria ou backup.</span></div><div data-export-slot="json"></div></article>
      </div>`;

    section.parentNode.insertBefore(card,section);
    csv.textContent='Exportar CSV';
    json.textContent='Exportar JSON';
    card.querySelector('[data-export-slot="csv"]').appendChild(csv);
    card.querySelector('[data-export-slot="json"]').appendChild(json);
    if(actions&&!actions.children.length)actions.remove();

    const excel=document.createElement('button');
    excel.className='cta';
    excel.id='exportExcel';
    excel.type='button';
    excel.textContent='Exportar Excel';
    excel.addEventListener('click',exportExcel);
    card.querySelector('[data-export-slot="excel"]').appendChild(excel);
    updateExportInfo();
  }

  function xmlEscape(value){
    return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  }

  function colName(n){
    let out='';
    while(n>0){n--;out=String.fromCharCode(65+n%26)+out;n=Math.floor(n/26)}
    return out;
  }

  function sheetXml(matrix,{headerRows=1,freeze=true,autoFilter=false}={}){
    const rowXml=matrix.map((row,ri)=>{
      const cells=row.map((value,ci)=>{
        const ref=`${colName(ci+1)}${ri+1}`;
        const style=ri<headerRows?' s="1"':'';
        return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
      }).join('');
      return `<row r="${ri+1}">${cells}</row>`;
    }).join('');
    const lastCol=colName(Math.max(1,...matrix.map(r=>r.length)));
    const lastRow=Math.max(1,matrix.length);
    const filter=autoFilter&&matrix.length?`<autoFilter ref="A1:${lastCol}${lastRow}"/>`:'';
    const views=freeze?'<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>':'<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${views}<sheetFormatPr defaultRowHeight="15"/><sheetData>${rowXml}</sheetData>${filter}</worksheet>`;
  }

  const crcTable=(()=>{
    const table=new Uint32Array(256);
    for(let n=0;n<256;n++){
      let c=n;
      for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):(c>>>1);
      table[n]=c>>>0;
    }
    return table;
  })();

  function crc32(bytes){
    let c=0xffffffff;
    for(const b of bytes)c=crcTable[(c^b)&0xff]^(c>>>8);
    return (c^0xffffffff)>>>0;
  }
  function u16(n){return new Uint8Array([n&255,(n>>>8)&255])}
  function u32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255])}
  function concat(parts){
    const len=parts.reduce((s,p)=>s+p.length,0);const out=new Uint8Array(len);let o=0;
    for(const p of parts){out.set(p,o);o+=p.length}return out;
  }

  function zipStore(files){
    const enc=new TextEncoder();
    const locals=[];const centrals=[];let offset=0;
    for(const file of files){
      const name=enc.encode(file.name);const data=typeof file.data==='string'?enc.encode(file.data):file.data;const crc=crc32(data);
      const local=concat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);
      locals.push(local);
      const central=concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);
      centrals.push(central);offset+=local.length;
    }
    const centralSize=centrals.reduce((s,p)=>s+p.length,0);
    const end=concat([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralSize),u32(offset),u16(0)]);
    return concat([...locals,...centrals,end]);
  }

  function buildXlsx(context){
    const responseMatrix=[EXPORT_COLUMNS.map(([,label])=>label),...context.data.map(row=>EXPORT_COLUMNS.map(([key])=>valueFor(row,key)))];
    const summaryMatrix=[['Diagnóstico Corporativo de Adoção e Maturidade em IA','Mundial Atacadista'],...context.metrics];
    const types=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
    const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Resumo" sheetId="1" r:id="rId1"/><sheet name="Respostas" sheetId="2" r:id="rId2"/></sheets></workbook>`;
    const workbookRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF12345A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`;
    return zipStore([
      {name:'[Content_Types].xml',data:types},
      {name:'_rels/.rels',data:rels},
      {name:'xl/workbook.xml',data:workbook},
      {name:'xl/_rels/workbook.xml.rels',data:workbookRels},
      {name:'xl/styles.xml',data:styles},
      {name:'xl/worksheets/sheet1.xml',data:sheetXml(summaryMatrix,{headerRows:1,freeze:false})},
      {name:'xl/worksheets/sheet2.xml',data:sheetXml(responseMatrix,{headerRows:1,freeze:true,autoFilter:true})}
    ]);
  }

  function exportExcel(){
    const context=exportContext();
    if(!context.total){alert('Não há respostas na visão filtrada para exportar.');return}
    const bytes=buildXlsx(context);
    const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    const stamp=new Date().toISOString().slice(0,10);
    a.download=`relatorio_ia_mundial_${stamp}.xlsx`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  function init(){
    createExportPanel();
    const count=byId('filterCount');
    if(count)new MutationObserver(updateExportInfo).observe(count,{childList:true,subtree:true,characterData:true});
    byId('filterSector')?.addEventListener('change',()=>setTimeout(updateExportInfo));
    byId('filterPeriod')?.addEventListener('change',()=>setTimeout(updateExportInfo));
    byId('clearFilters')?.addEventListener('click',()=>setTimeout(updateExportInfo));
    setTimeout(updateExportInfo,150);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
