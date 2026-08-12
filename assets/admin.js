const SUPABASE_URL='https://odthqhyzrmjwynwpsdoc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_VLXCKSh3i4aMvhN00WvvxA_ZprUQxC5';
const SESSION_KEY='mundialIaAdminSession';
let dashboardData=[];

const loginScreen=document.getElementById('loginScreen');
const adminApp=document.getElementById('adminApp');
const loginForm=document.getElementById('loginForm');
const loginMessage=document.getElementById('loginMessage');
const loginButton=document.getElementById('loginButton');

function readSession(){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
function saveSession(s){sessionStorage.setItem(SESSION_KEY,JSON.stringify(s))}
function clearSession(){sessionStorage.removeItem(SESSION_KEY)}
function authHeaders(token){return {'apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':`Bearer ${token}`}}

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
    showAdmin();renderDashboard();setAdminStatus('Conectado • dados atualizados');
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
  adminApp.classList.add('hidden');loginScreen.classList.remove('hidden');
  if(message)loginMessage.textContent=message;
}
function showAdmin(){loginScreen.classList.add('hidden');adminApp.classList.remove('hidden')}
function setAdminStatus(text){const el=document.getElementById('adminStatus');if(el)el.textContent=text}

loginForm.addEventListener('submit',async e=>{
  e.preventDefault();loginMessage.textContent='';loginButton.disabled=true;loginButton.textContent='Entrando…';
  try{
    const s=await signIn(document.getElementById('adminEmail').value.trim(),document.getElementById('adminPassword').value);
    await ensureAdmin(s.access_token);saveSession(s);document.getElementById('adminPassword').value='';showAdmin();await loadDashboard();
  }catch(err){clearSession();loginMessage.textContent=err.message||'Falha no login.'}
  finally{loginButton.disabled=false;loginButton.textContent='Entrar no painel'}
});

document.getElementById('logoutButton').onclick=()=>{clearSession();dashboardData=[];showLogin('Sessão encerrada com segurança.')};
document.getElementById('refreshDash').onclick=()=>loadDashboard();

function pct(n,d){return d?Math.round(n/d*100):0}
function countBy(list,field){const m={};list.forEach(r=>{const v=r[field];if(Array.isArray(v))v.forEach(x=>m[x]=(m[x]||0)+1);else if(v)m[v]=(m[v]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1])}
function bars(id,entries,total,percentMode=false){const el=document.getElementById(id);if(!el)return;el.innerHTML=(entries.length?entries.slice(0,7):[['Sem dados',0]]).map(([k,v])=>{const width=percentMode?v:pct(v,total||1);const label=percentMode?`${v}%`:v;return `<div class="bar-row"><span>${escapeHtml(k)}</span><div class="bar"><i style="width:${Math.min(100,width)}%"></i></div><b>${label}</b></div>`}).join('')}
function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function formatDate(v){if(!v)return '-';try{return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v))}catch{return '-'}}

function renderDashboard(){
  const d=dashboardData;const total=d.length;
  const users=d.filter(r=>r.situacao==='Utilizo ferramentas de IA no trabalho');
  const recurring=users.filter(r=>['Várias vezes ao dia','Todos ou quase todos os dias','Algumas vezes por semana','Aproximadamente uma vez por semana'].includes(r.frequencia));
  const review=users.filter(r=>['Sempre','Frequentemente'].includes(r.revisao));
  const gov=d.filter(r=>['Sim','Parcialmente'].includes(r.orientacao));
  document.getElementById('adminTotalHero').textContent=total;
  document.getElementById('kpiTotal').textContent=total;
  document.getElementById('kpiAdoption').textContent=pct(users.length,total)+'%';
  document.getElementById('kpiRecurring').textContent=pct(recurring.length,total)+'%';
  document.getElementById('kpiReview').textContent=pct(review.length,users.length)+'%';
  bars('activityBars',countBy(users,'atividades'),users.length);
  const sectors=countBy(d,'setor').map(([s,c])=>{const adopted=d.filter(r=>r.setor===s&&r.situacao==='Utilizo ferramentas de IA no trabalho').length;return [s,pct(adopted,c)]}).sort((a,b)=>b[1]-a[1]);
  bars('sectorBars',sectors,100,true);bars('toolBars',countBy(users,'ferramentas'),users.length);
  const gp=pct(gov.length,total);document.getElementById('govDonut').style.background=`conic-gradient(var(--cyan) 0 ${gp}%, var(--violet) ${gp}% 100%)`;document.getElementById('govLabel').textContent=gp+'%';
  document.getElementById('execSummary').textContent=total?`Foram registradas ${total} respostas. A adoção declarada de IA está em ${pct(users.length,total)}%, com ${pct(recurring.length,total)}% dos respondentes utilizando ferramentas pelo menos semanalmente. Entre usuários de IA, ${pct(review.length,users.length)}% afirmam revisar ou validar resultados com frequência elevada. O conhecimento total ou parcial das orientações internas aparece em ${gp}% das respostas.`:'Ainda não há respostas registradas na pesquisa.';
  document.getElementById('lastRows').innerHTML=d.slice(0,10).map(r=>`<tr><td>${formatDate(r.data||r.created_at)}</td><td>${escapeHtml(r.setor||'-')}</td><td>${escapeHtml(r.situacao||'-')}</td><td>${escapeHtml(r.frequencia||'-')}</td><td>${escapeHtml(r.tempo||'-')}</td><td>${escapeHtml((r.caso||'-').slice(0,90))}</td></tr>`).join('')||'<tr><td colspan="6">Sem dados.</td></tr>';
}

function toCsv(rows){const cols=['data','setor','cargo','situacao','frequencia','ferramentas','acesso','atividades','produtividade','qualidade','agilidade','tempo','criou','caso','revisao','orientacao','barreiras','capacitacao','compartilha','sugestao','multiplicador','nome','contato','protocol'];return [cols.join(';'),...rows.map(r=>cols.map(c=>'"'+String(Array.isArray(r[c])?r[c].join(', '):(r[c]??'')).replaceAll('"','""')+'"').join(';'))].join('\n')}
function download(name,content,type='text/plain;charset=utf-8'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
document.getElementById('exportCsv').onclick=()=>download('respostas_ia_mundial.csv','\ufeff'+toCsv(dashboardData),'text/csv;charset=utf-8');
document.getElementById('exportJson').onclick=()=>download('respostas_ia_mundial.json',JSON.stringify(dashboardData,null,2),'application/json;charset=utf-8');

function burst(n=36){const c=document.getElementById('confetti');for(let i=0;i<n;i++){const s=document.createElement('span');s.className='spark';s.style.left=Math.random()*100+'vw';s.style.top='-20px';s.style.background=['var(--cyan)','var(--violet)','var(--gold)','var(--green)'][i%4];s.style.animationDelay=(Math.random()*.35)+'s';c.appendChild(s);setTimeout(()=>s.remove(),1300)}}
const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.14});document.querySelectorAll('.reveal').forEach(e=>obs.observe(e));
loadDashboard();
