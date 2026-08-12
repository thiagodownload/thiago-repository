const SUPABASE_URL='https://odthqhyzrmjwynwpsdoc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_VLXCKSh3i4aMvhN00WvvxA_ZprUQxC5';
const SESSION_KEY='mundialIaAdminSession';
const ADMIN_URL=location.origin+location.pathname;
let dashboardData=[];
let filteredData=[];

const $=id=>document.getElementById(id);
const loginScreen=$('loginScreen');
const recoveryScreen=$('recoveryScreen');
const adminApp=$('adminApp');
const loginForm=$('loginForm');
const loginMessage=$('loginMessage');
const loginButton=$('loginButton');
const forgotPasswordButton=$('forgotPasswordButton');
const recoveryForm=$('recoveryForm');
const recoveryMessage=$('recoveryMessage');
const updatePasswordButton=$('updatePasswordButton');

function readSession(){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
function saveSession(s){sessionStorage.setItem(SESSION_KEY,JSON.stringify(s))}
function clearSession(){sessionStorage.removeItem(SESSION_KEY)}
function authHeaders(token){return {'apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':`Bearer ${token}`}}
function cleanAuthUrl(){history.replaceState({},document.title,location.pathname+location.search)}

async function signIn(email,password){
  const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{
    method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({email,password})
  });
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(body.error_description||body.msg||body.message||'Não foi possível autenticar.');
  return {access_token:body.access_token,refresh_token:body.refresh_token,expires_at:body.expires_at,user:body.user};
}

async function refreshSession(s){
  if(!s?.refresh_token)throw new Error('Sessão expirada.');
  const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{
    method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({refresh_token:s.refresh_token})
  });
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error('Sessão expirada.');
  const next={access_token:body.access_token,refresh_token:body.refresh_token||s.refresh_token,expires_at:body.expires_at,user:body.user||s.user};
  saveSession(next);return next;
}

async function requestPasswordRecovery(email){
  const url=`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(ADMIN_URL)}`;
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({email})});
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(body.msg||body.message||'Não foi possível enviar o e-mail de recuperação.');
}

async function updatePassword(token,password){
  const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{
    method:'PUT',headers:{...authHeaders(token),'Content-Type':'application/json'},body:JSON.stringify({password})
  });
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(body.msg||body.message||'Não foi possível atualizar a senha.');
  return body;
}

async function ensureAdmin(token){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/mundial_ia_admins?select=user_id&limit=1`,{headers:authHeaders(token)});
  if(r.status===401)throw Object.assign(new Error('Sessão expirada.'),{code:401});
  if(!r.ok)throw new Error('Não foi possível validar a permissão administrativa.');
  const rows=await r.json();
  if(!rows.length)throw Object.assign(new Error('Esta conta não possui permissão para acessar o painel.'),{code:403});
}

async function fetchResponses(token){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/mundial_ia_responses?select=protocol,setor,situacao,payload,created_at&order=created_at.desc&limit=5000`,{headers:{...authHeaders(token),'Accept':'application/json'}});
  if(r.status===401)throw Object.assign(new Error('Sessão expirada.'),{code:401});
  if(r.status===403)throw Object.assign(new Error('Acesso negado.'),{code:403});
  if(!r.ok)throw new Error(`Falha ao carregar respostas (${r.status}).`);
  const rows=await r.json();
  return rows.map(row=>({...row.payload,data:row.payload?.data||row.created_at,created_at:row.created_at,protocol:row.protocol,setor:row.payload?.setor||row.setor,situacao:row.payload?.situacao||row.situacao}));
}

async function loadDashboard({allowRefresh=true}={}){
  let s=readSession();
  if(!s){showLogin();return}
  setAdminStatus('Atualizando…');
  try{
    await ensureAdmin(s.access_token);
    dashboardData=await fetchResponses(s.access_token);
    showAdmin();
    populateFilters();
    applyFilters();
    setAdminStatus('Conectado • dados atualizados');
  }catch(err){
    if(err.code===401&&allowRefresh){
      try{s=await refreshSession(s);return loadDashboard({allowRefresh:false})}catch{}
    }
    if(err.code===403){clearSession();showLogin('Esta conta não possui permissão administrativa.');return}
    if(err.code===401){clearSession();showLogin('Sua sessão expirou. Entre novamente.');return}
    setAdminStatus('Falha ao atualizar');
    alert(err.message||'Não foi possível carregar o painel.');
  }
}

function showLogin(message=''){
  adminApp?.classList.add('hidden');recoveryScreen?.classList.add('hidden');loginScreen?.classList.remove('hidden');
  if(loginMessage)loginMessage.textContent=message;
}
function showRecovery(message=''){
  adminApp?.classList.add('hidden');loginScreen?.classList.add('hidden');recoveryScreen?.classList.remove('hidden');
  if(recoveryMessage)recoveryMessage.textContent=message;
}
function showAdmin(){loginScreen?.classList.add('hidden');recoveryScreen?.classList.add('hidden');adminApp?.classList.remove('hidden')}
function setAdminStatus(text){if($('adminStatus'))$('adminStatus').textContent=text}

async function handleAuthRedirect(){
  const hash=new URLSearchParams(location.hash.replace(/^#/,''));
  const errorDescription=hash.get('error_description');
  if(errorDescription){cleanAuthUrl();clearSession();showLogin(decodeURIComponent(errorDescription.replace(/\+/g,' ')));return true}
  const accessToken=hash.get('access_token');
  if(!accessToken)return false;
  const refreshToken=hash.get('refresh_token')||'';
  const expiresAt=Number(hash.get('expires_at'))||Math.floor(Date.now()/1000)+Number(hash.get('expires_in')||3600);
  const type=hash.get('type')||'';
  const session={access_token:accessToken,refresh_token:refreshToken,expires_at:expiresAt,user:null};
  saveSession(session);cleanAuthUrl();
  if(type==='recovery'){showRecovery('Link de recuperação validado. Defina sua nova senha.');return true}
  try{await ensureAdmin(accessToken);await loadDashboard()}catch(err){clearSession();showLogin(err.message||'Não foi possível concluir o acesso pelo link.')}
  return true;
}

loginForm?.addEventListener('submit',async e=>{
  e.preventDefault();loginMessage.textContent='';loginButton.disabled=true;loginButton.textContent='Entrando…';
  try{
    const s=await signIn($('adminEmail').value.trim(),$('adminPassword').value);
    await ensureAdmin(s.access_token);saveSession(s);$('adminPassword').value='';showAdmin();await loadDashboard();
  }catch(err){clearSession();loginMessage.textContent=err.message||'Falha no login.'}
  finally{loginButton.disabled=false;loginButton.textContent='Entrar no painel'}
});

forgotPasswordButton?.addEventListener('click',async()=>{
  const email=$('adminEmail').value.trim();
  if(!email){loginMessage.textContent='Informe seu e-mail acima para receber o link de recuperação.';$('adminEmail').focus();return}
  forgotPasswordButton.disabled=true;loginMessage.textContent='Enviando e-mail de recuperação…';
  try{await requestPasswordRecovery(email);loginMessage.textContent='E-mail de recuperação enviado. Abra o link recebido e você voltará para esta tela para definir uma nova senha.'}
  catch(err){loginMessage.textContent=err.message||'Não foi possível enviar o e-mail de recuperação.'}
  finally{forgotPasswordButton.disabled=false}
});

recoveryForm?.addEventListener('submit',async e=>{
  e.preventDefault();recoveryMessage.textContent='';
  const p1=$('newPassword').value;const p2=$('confirmPassword').value;
  if(p1.length<8){recoveryMessage.textContent='A nova senha deve ter pelo menos 8 caracteres.';return}
  if(p1!==p2){recoveryMessage.textContent='As senhas informadas não coincidem.';return}
  const s=readSession();if(!s?.access_token){showLogin('O link de recuperação expirou. Solicite um novo link.');return}
  updatePasswordButton.disabled=true;updatePasswordButton.textContent='Atualizando…';
  try{await updatePassword(s.access_token,p1);await ensureAdmin(s.access_token);$('newPassword').value='';$('confirmPassword').value='';showAdmin();await loadDashboard()}
  catch(err){recoveryMessage.textContent=err.message||'Não foi possível atualizar a senha.'}
  finally{updatePasswordButton.disabled=false;updatePasswordButton.textContent='Atualizar senha'}
});

if($('cancelRecovery'))$('cancelRecovery').onclick=()=>{clearSession();showLogin()};
if($('logoutButton'))$('logoutButton').onclick=()=>{clearSession();dashboardData=[];filteredData=[];showLogin('Sessão encerrada com segurança.')};
if($('refreshDash'))$('refreshDash').onclick=()=>loadDashboard();

function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function formatDate(v){if(!v)return '-';try{return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v))}catch{return '-'}}
function pct(n,d){return d?Math.round(n/d*100):0}
function pctText(n,d){return d?`${pct(n,d)}%`:'—'}
function mean(values){const nums=values.map(Number).filter(Number.isFinite);return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:null}
function meanText(values){const m=mean(values);return m===null?'—':m.toFixed(1).replace('.',',')}
function setText(id,value){const el=$(id);if(el)el.textContent=value}
function countValues(values){const m={};values.filter(v=>v!==undefined&&v!==null&&String(v).trim()!=='').forEach(v=>m[v]=(m[v]||0)+1);return Object.entries(m).sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]),'pt-BR'))}
function countBy(list,field){return countValues(list.flatMap(r=>Array.isArray(r[field])?r[field]:[r[field]]))}
function isUser(r){return r.situacao==='Utilizo ferramentas de IA no trabalho'}
function normalizeSituation(v){return ({'Utilizo ferramentas de IA no trabalho':'Utiliza IA no trabalho','Conheço, mas não utilizo no trabalho':'Conhece, mas não utiliza','Tenho pouco conhecimento':'Pouco conhecimento','Ainda não tive contato':'Sem contato com IA'})[v]||v}
function rowDate(r){const d=new Date(r.created_at||r.data||0);return Number.isNaN(d.getTime())?null:d}

function renderBars(id,entries,total,{max=10,percentOnly=false,privacyMessage=''}={}){
  const el=$(id);if(!el)return;
  if(privacyMessage){el.innerHTML=`<div class="privacy-empty">${escapeHtml(privacyMessage)}</div>`;return}
  if(!entries.length){el.innerHTML='<div class="privacy-empty">Sem dados suficientes nesta visão.</div>';return}
  el.innerHTML=entries.slice(0,max).map(([k,v])=>{
    const width=percentOnly?Number(v):pct(v,total||1);
    const label=percentOnly?`${v}%`:`${v} · ${pct(v,total||1)}%`;
    return `<div class="bar-row"><span title="${escapeHtml(k)}">${escapeHtml(k)}</span><div class="bar"><i style="width:${Math.min(100,Math.max(0,width))}%"></i></div><b>${label}</b></div>`;
  }).join('');
}

function renderScore(id,value){
  const root=$(id);if(!root)return;
  const n=mean(value);root.querySelector('b').textContent=n===null?'—':n.toFixed(1).replace('.',',');
  const fill=root.querySelector('i');if(fill)fill.style.width=n===null?'0%':`${Math.min(100,n/5*100)}%`;
}

function expandedTools(list){
  return list.flatMap(r=>(r.ferramentas||[]).map(t=>t==='Outra'&&r.ferramentaOutra?.trim()?`Outra: ${r.ferramentaOutra.trim()}`:t));
}

function populateFilters(){
  const select=$('filterSector');if(!select)return;
  const previous=select.value;
  const qualified=countBy(dashboardData,'setor').filter(([,n])=>n>=5).map(([s])=>s).sort((a,b)=>a.localeCompare(b,'pt-BR'));
  select.innerHTML='<option value="">Todos os setores</option>'+qualified.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  if(qualified.includes(previous))select.value=previous;
  const note=$('sectorFilterNote');if(note)note.textContent=qualified.length?'Somente setores com 5 ou mais respostas aparecem no filtro.':'O filtro por setor será liberado quando algum setor atingir pelo menos 5 respostas.';
}

function applyFilters(){
  const sector=$('filterSector')?.value||'';
  const period=Number($('filterPeriod')?.value||0);
  const cutoff=period?new Date(Date.now()-period*86400000):null;
  filteredData=dashboardData.filter(r=>(!sector||r.setor===sector)&&(!cutoff||((rowDate(r)||new Date(0))>=cutoff)));
  setText('filterCount',`${filteredData.length} de ${dashboardData.length} respostas`);
  renderDashboard(filteredData);
}

$('filterSector')?.addEventListener('change',applyFilters);
$('filterPeriod')?.addEventListener('change',applyFilters);
$('clearFilters')?.addEventListener('click',()=>{if($('filterSector'))$('filterSector').value='';if($('filterPeriod'))$('filterPeriod').value='0';applyFilters()});

function renderDashboard(d){
  const total=d.length;
  const users=d.filter(isUser);
  const daily=users.filter(r=>['Várias vezes ao dia','Todos ou quase todos os dias'].includes(r.frequencia));
  const recurring=users.filter(r=>['Várias vezes ao dia','Todos ou quase todos os dias','Algumas vezes por semana','Aproximadamente uma vez por semana'].includes(r.frequencia));
  const reviewAnswered=users.filter(r=>r.revisao);
  const highReview=reviewAnswered.filter(r=>['Sempre','Frequentemente'].includes(r.revisao));
  const govAnswered=d.filter(r=>r.orientacao);
  const govAware=govAnswered.filter(r=>['Sim','Parcialmente'].includes(r.orientacao));
  const timeAnswered=users.filter(r=>r.tempo);
  const time2h=timeAnswered.filter(r=>['2 a 4 horas','4 a 8 horas','Mais de 8 horas'].includes(r.tempo));
  const impactValues=users.flatMap(r=>[r.produtividade,r.qualidade,r.agilidade]).filter(v=>v!==''&&v!==undefined&&v!==null);
  const accessAnswered=users.filter(r=>r.acesso);
  const corpAccess=accessAnswered.filter(r=>['Conta disponibilizada pela empresa','Conta corporativa e pessoal','Integrada ao sistema'].includes(r.acesso));
  const createdAnswered=users.filter(r=>r.criou);
  const createdYes=createdAnswered.filter(r=>r.criou==='Sim');
  const sharingAnswered=d.filter(r=>r.compartilha);
  const sharingActive=sharingAnswered.filter(r=>['Frequentemente','Às vezes'].includes(r.compartilha));
  const multiplierAnswered=d.filter(r=>r.multiplicador);
  const multipliers=multiplierAnswered.filter(r=>r.multiplicador==='Sim');
  const trainingAnswered=d.filter(r=>Array.isArray(r.capacitacao)&&r.capacitacao.length);
  const trainingDemand=trainingAnswered.filter(r=>r.capacitacao.some(x=>x!=='Sem interesse'));

  setText('adminTotalHero',total);
  setText('kpiTotal',total);
  setText('kpiAdoption',pctText(users.length,total));
  setText('kpiDaily',pctText(daily.length,users.length));
  setText('kpiRecurring',pctText(recurring.length,users.length));
  setText('kpiImpact',impactValues.length?`${meanText(impactValues)}/5`:'—');
  setText('kpiTime',pctText(time2h.length,timeAnswered.length));
  setText('kpiGovernance',pctText(govAware.length,govAnswered.length));
  setText('kpiReview',pctText(highReview.length,reviewAnswered.length));
  setText('miniCorporate',pctText(corpAccess.length,accessAnswered.length));
  setText('miniCreated',pctText(createdYes.length,createdAnswered.length));
  setText('miniSharing',pctText(sharingActive.length,sharingAnswered.length));
  setText('miniTraining',pctText(trainingDemand.length,trainingAnswered.length));
  setText('miniMultipliers',multipliers.length);

  renderBars('adoptionBars',countValues(d.map(r=>normalizeSituation(r.situacao))),total,{max:6});
  renderBars('frequencyBars',countBy(users,'frequencia'),users.length,{max:8});
  renderBars('toolBars',countValues(expandedTools(users)),users.length,{max:10});
  renderBars('accessBars',countBy(users,'acesso'),users.length,{max:8});
  renderBars('activityBars',countBy(users,'atividades'),users.length,{max:12});
  renderBars('timeBars',countBy(users,'tempo'),timeAnswered.length,{max:8});
  renderBars('createdBars',countBy(users,'criou'),createdAnswered.length,{max:5});
  renderBars('reviewBars',countBy(users,'revisao'),reviewAnswered.length,{max:7});
  renderBars('governanceBars',countBy(d,'orientacao'),govAnswered.length,{max:6});
  renderBars('barrierBars',countBy(d,'barreiras'),d.length,{max:12});
  renderBars('trainingBars',countBy(d,'capacitacao'),d.length,{max:12});
  renderBars('sharingBars',countBy(d,'compartilha'),sharingAnswered.length,{max:7});

  renderScore('scoreProductivity',users.map(r=>r.produtividade));
  renderScore('scoreQuality',users.map(r=>r.qualidade));
  renderScore('scoreAgility',users.map(r=>r.agilidade));

  const sectorCounts=countBy(d,'setor');
  renderBars('sectorResponseBars',sectorCounts,total,{max:15});
  const qualified=sectorCounts.filter(([,n])=>n>=5);
  if(qualified.length){
    const sectorAdoption=qualified.map(([s,n])=>[s,pct(d.filter(r=>r.setor===s&&isUser(r)).length,n)]).sort((a,b)=>b[1]-a[1]);
    renderBars('sectorAdoptionBars',sectorAdoption,100,{max:15,percentOnly:true});
  }else{
    renderBars('sectorAdoptionBars',[],100,{privacyMessage:'Comparativo de adoção por setor será exibido somente quando houver pelo menos 5 respostas no setor.'});
  }

  renderExecutiveSummary(d,{users,daily,recurring,highReview,reviewAnswered,govAware,govAnswered,impactValues,time2h,timeAnswered});
  renderInsights(d,users);
  renderVoice(d,multipliers);
  renderRecentRows(d);
}

function renderExecutiveSummary(d,m){
  const total=d.length;
  const topTool=countValues(expandedTools(m.users))[0];
  const topBarrier=countBy(d,'barreiras')[0];
  const topTraining=countBy(d,'capacitacao').filter(([x])=>x!=='Sem interesse')[0];
  const parts=[];
  if(!total){setText('execSummary','Ainda não há respostas na visão selecionada.');return}
  parts.push(`A visão atual reúne ${total} resposta${total===1?'':'s'} e apresenta adoção declarada de IA de ${pctText(m.users.length,total)}.`);
  if(m.users.length)parts.push(`${pctText(m.daily.length,m.users.length)} dos usuários utilizam IA diariamente e ${pctText(m.recurring.length,m.users.length)} utilizam pelo menos semanalmente.`);
  if(m.impactValues.length)parts.push(`O impacto médio percebido entre produtividade, qualidade e agilidade é ${meanText(m.impactValues)} de 5.`);
  if(m.timeAnswered.length)parts.push(`${pctText(m.time2h.length,m.timeAnswered.length)} dos usuários que estimaram economia de tempo relatam ganho de 2 horas ou mais por semana.`);
  if(m.govAnswered.length)parts.push(`${pctText(m.govAware.length,m.govAnswered.length)} conhecem total ou parcialmente as orientações internas e ${pctText(m.highReview.length,m.reviewAnswered.length)} dos usuários que responderam sobre validação revisam resultados sempre ou frequentemente.`);
  if(topTool)parts.push(`A ferramenta mais citada é ${topTool[0]}.`);
  if(topBarrier)parts.push(`A barreira mais frequente é “${topBarrier[0]}”.`);
  if(topTraining)parts.push(`O tema de capacitação mais solicitado é “${topTraining[0]}”.`);
  setText('execSummary',parts.join(' '));
}

function renderInsights(d,users){
  const attention=[];const opportunities=[];
  const personal=users.filter(r=>r.acesso==='Conta pessoal').length;
  if(users.length&&personal)attention.push(`${pct(personal,users.length)}% dos usuários de IA informaram uso por conta pessoal.`);
  const lowGov=d.filter(r=>['Não','Não tenho conhecimento de orientações internas'].includes(r.orientacao)).length;
  if(d.length&&lowGov)attention.push(`${pct(lowGov,d.length)}% indicaram não conhecer adequadamente as orientações internas.`);
  const lowReview=users.filter(r=>['Raramente','Nunca'].includes(r.revisao)).length;
  if(users.length&&lowReview)attention.push(`${pct(lowReview,users.length)}% dos usuários relataram revisão rara ou inexistente das respostas de IA.`);
  const topBarrier=countBy(d,'barreiras')[0];if(topBarrier)attention.push(`Principal barreira registrada: ${topBarrier[0]} (${topBarrier[1]} citação${topBarrier[1]===1?'':'ões'}).`);

  const cases=users.filter(r=>r.criou==='Sim').length;if(cases)opportunities.push(`${cases} respondente${cases===1?'':'s'} já criou ou melhorou algo com IA no trabalho.`);
  const multipliers=d.filter(r=>r.multiplicador==='Sim').length;if(multipliers)opportunities.push(`${multipliers} respondente${multipliers===1?'':'s'} se mostrou disponível para compartilhar um caso de uso.`);
  const topTraining=countBy(d,'capacitacao').filter(([x])=>x!=='Sem interesse')[0];if(topTraining)opportunities.push(`Maior demanda de capacitação: ${topTraining[0]} (${topTraining[1]} citação${topTraining[1]===1?'':'ões'}).`);
  const topActivity=countBy(users,'atividades')[0];if(topActivity)opportunities.push(`Atividade com maior adoção: ${topActivity[0]} (${topActivity[1]} citação${topActivity[1]===1?'':'ões'}).`);
  renderInsightList('attentionList',attention,'Nenhum sinal de atenção relevante identificado com os dados atuais.');
  renderInsightList('opportunityList',opportunities,'Ainda não há dados suficientes para destacar oportunidades.');
}

function renderInsightList(id,items,empty){
  const el=$(id);if(!el)return;
  el.innerHTML=items.length?items.map(x=>`<div class="insight-item">${escapeHtml(x)}</div>`).join(''):`<div class="privacy-empty">${escapeHtml(empty)}</div>`;
}

function renderVoice(d,multipliers){
  renderTextCards('caseList',d.filter(r=>r.caso?.trim()).slice(0,8).map(r=>({title:r.setor||'Sem setor',text:r.caso,meta:r.criou||'Caso de uso'})),'Nenhum caso de uso detalhado foi informado ainda.');
  renderTextCards('suggestionList',d.filter(r=>r.sugestao?.trim()).slice(0,8).map(r=>({title:r.setor||'Sem setor',text:r.sugestao,meta:'Sugestão / preocupação'})),'Nenhuma sugestão ou preocupação aberta foi registrada ainda.');
  renderTextCards('multiplierList',multipliers.slice(0,8).map(r=>({title:r.nome?.trim()||'Respondente voluntário',text:r.contato?.trim()||'Contato não informado',meta:r.setor||'Setor não informado'})),'Nenhum potencial multiplicador se identificou nesta visão.');
}

function renderTextCards(id,items,empty){
  const el=$(id);if(!el)return;
  el.innerHTML=items.length?items.map(i=>`<article class="voice-item"><div><strong>${escapeHtml(i.title)}</strong><small>${escapeHtml(i.meta||'')}</small></div><p>${escapeHtml(i.text)}</p></article>`).join(''):`<div class="privacy-empty">${escapeHtml(empty)}</div>`;
}

function renderRecentRows(d){
  const body=$('lastRows');if(!body)return;
  body.innerHTML=d.slice(0,15).map(r=>`<tr><td>${formatDate(r.created_at||r.data)}</td><td>${escapeHtml(r.setor||'-')}</td><td>${escapeHtml(r.cargo||'-')}</td><td>${escapeHtml(normalizeSituation(r.situacao)||'-')}</td><td>${escapeHtml(r.frequencia||'-')}</td><td>${escapeHtml(r.acesso||'-')}</td><td>${escapeHtml(r.tempo||'-')}</td><td>${escapeHtml((r.caso||'-').slice(0,120))}</td></tr>`).join('')||'<tr><td colspan="8">Sem dados nesta visão.</td></tr>';
}

function toCsv(rows){
  const cols=['data','setor','cargo','situacao','frequencia','ferramentas','ferramentaOutra','acesso','atividades','produtividade','qualidade','agilidade','tempo','criou','caso','revisao','orientacao','barreiras','capacitacao','compartilha','sugestao','multiplicador','nome','contato','protocol'];
  return [cols.join(';'),...rows.map(r=>cols.map(c=>'"'+String(Array.isArray(r[c])?r[c].join(', '):(r[c]??'')).replaceAll('"','""')+'"').join(';'))].join('\n');
}
function download(name,content,type='text/plain;charset=utf-8'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
if($('exportCsv'))$('exportCsv').onclick=()=>download('respostas_ia_mundial_filtradas.csv','\ufeff'+toCsv(filteredData),'text/csv;charset=utf-8');
if($('exportJson'))$('exportJson').onclick=()=>download('respostas_ia_mundial_filtradas.json',JSON.stringify(filteredData,null,2),'application/json;charset=utf-8');

function burst(n=36){const c=$('confetti');if(!c)return;for(let i=0;i<n;i++){const s=document.createElement('span');s.className='spark';s.style.left=Math.random()*100+'vw';s.style.top='-20px';s.style.background=['var(--cyan)','var(--violet)','var(--gold)','var(--green)'][i%4];s.style.animationDelay=(Math.random()*.35)+'s';c.appendChild(s);setTimeout(()=>s.remove(),1300)}}
const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.08});document.querySelectorAll('.reveal').forEach(e=>obs.observe(e));

(async()=>{const handled=await handleAuthRedirect();if(!handled)await loadDashboard()})();
