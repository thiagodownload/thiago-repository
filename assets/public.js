const storeKey='mundialDiagnosticoIA';
const draftKey=storeKey+'_draft';
const SUPABASE_URL='https://odthqhyzrmjwynwpsdoc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_VLXCKSh3i4aMvhN00WvvxA_ZprUQxC5';
const form=document.getElementById('aiForm');
const qs=[...document.querySelectorAll('.question')];
const userOnly=[...document.querySelectorAll('.user-only')];
const steps=[...new Set(qs.map(q=>q.dataset.step))];
const otherToolCheckbox=form.querySelector('input[name="ferramentas"][value="Outra"]');
const sectorSelect=form.querySelector('select[name="setor"]');
if(sectorSelect){
  sectorSelect.required=false;
  const sectorTitle=sectorSelect.closest('.question')?.querySelector('.qtitle');
  if(sectorTitle)sectorTitle.textContent=sectorTitle.textContent.replace(/\s*\*$/,'');
}
const accessQuestion=form.querySelector('input[name="acesso"]')?.closest('.question');
if(accessQuestion){
  const accessTitle=accessQuestion.querySelector('.qtitle');
  const accessOptions=accessQuestion.querySelector('.options');
  if(accessTitle)accessTitle.textContent='6. Como é custeado o acesso às ferramentas de IA que você utiliza no trabalho?';
  if(accessOptions)accessOptions.innerHTML=[
    ['Uso apenas versões gratuitas','Uso apenas versões gratuitas, sem custo pessoal'],
    ['Pago com recursos próprios','Pago do meu próprio bolso por uma ou mais ferramentas de IA'],
    ['Empresa disponibiliza ou paga licença','A empresa disponibiliza ou paga alguma licença/plano de IA que utilizo'],
    ['Empresa oferece incentivo financeiro','A empresa reembolsa, subsidia ou oferece algum incentivo financeiro para uso de IA'],
    ['Combinação de formas de acesso','Uso uma combinação das opções acima'],
    ['Não sei informar','Não sei informar']
  ].map(([value,label])=>`<label class="option"><input name="acesso" type="radio" value="${value}"/>${label}</label>`).join('');
}
const orientationQuestion=form.querySelector('input[name="orientacao"]')?.closest('.question');
if(orientationQuestion)orientationQuestion.classList.add('hidden');
const heroQuestionCount=document.getElementById('heroRespondents');
if(heroQuestionCount)heroQuestionCount.textContent='16';
let otherToolField=null;
if(otherToolCheckbox){
  otherToolField=document.createElement('div');
  otherToolField.id='otherToolField';
  otherToolField.className='hidden';
  otherToolField.style.marginTop='14px';
  otherToolField.innerHTML='<input name="ferramentaOutra" type="text" maxlength="120" placeholder="Digite o nome da ferramenta de IA" autocomplete="off" />';
  const options=otherToolCheckbox.closest('.options');
  if(options)options.insertAdjacentElement('afterend',otherToolField);
}
qs.forEach(q=>{const title=q.querySelector('.qtitle');if(title)title.dataset.baseTitle=title.textContent.replace(/^\d+\.\s*/, '')});
document.getElementById('stepList').innerHTML=steps.map((s,i)=>`<div class="step-item" data-stepname="${s}">${String(i+1).padStart(2,'0')} • ${s}</div>`).join('');
function val(name){const el=form.elements[name];if(!el)return '';if(el instanceof RadioNodeList)return el.value||'';return el.value||''}
function arr(name){return [...form.querySelectorAll(`[name="${name}"]:checked`)].map(x=>x.value)}
function shouldUserQs(){return val('situacao')==='Utilizo ferramentas de IA no trabalho'}
function visibleQuestions(){return qs.filter(q=>!q.classList.contains('hidden'))}
function setActiveStep(step){document.querySelectorAll('.step-item').forEach(i=>i.classList.toggle('active',i.dataset.stepname===step))}
function updateActiveStepFromScroll(){
  const visible=visibleQuestions();
  if(!visible.length)return;
  const marker=Math.min(window.innerHeight*.34,280);
  let current=visible.find(q=>q.getBoundingClientRect().bottom>=marker);
  if(!current)current=visible.at(-1);
  setActiveStep(current.dataset.step);
}
function updateQuestionNumbers(){let n=0;qs.forEach(q=>{const title=q.querySelector('.qtitle');if(!title)return;if(q.classList.contains('hidden')){title.textContent=title.dataset.baseTitle||title.textContent.replace(/^\d+\.\s*/,'');return}n+=1;title.textContent=`${n}. ${title.dataset.baseTitle||title.textContent.replace(/^\d+\.\s*/,'')}`})}
function updateConditional(){
  const show=shouldUserQs();
  userOnly.forEach(q=>q.classList.toggle('hidden',!show));
  const m=val('multiplicador')==='Sim';
  const cf=document.getElementById('contactFields');
  if(cf)cf.style.display=m?'block':'none';
  const other=!!otherToolCheckbox?.checked;
  const otherInput=otherToolField?.querySelector('input[name="ferramentaOutra"]');
  if(otherToolField)otherToolField.classList.toggle('hidden',!other);
  if(otherInput){otherInput.required=other;if(!other)otherInput.value=''}
  updateQuestionNumbers();
  requestAnimationFrame(updateActiveStepFromScroll);
}
form.addEventListener('change',()=>{updateConditional();updateProgress()});
function updateProgress(){const visible=visibleQuestions();const answered=visible.filter(q=>{const inputs=[...q.querySelectorAll('input,select,textarea')];return inputs.some(i=>i.type==='checkbox'||i.type==='radio'?i.checked:i.value.trim())}).length;document.getElementById('progressBar').style.width=(visible.length?Math.round(answered/visible.length*100):0)+'%'}
window.addEventListener('scroll',updateActiveStepFromScroll,{passive:true});
window.addEventListener('resize',updateActiveStepFromScroll,{passive:true});
function collect(){return {data:new Date().toISOString(),setor:val('setor')||'Não informado',cargo:val('cargo'),situacao:val('situacao'),frequencia:val('frequencia'),ferramentas:arr('ferramentas'),ferramentaOutra:val('ferramentaOutra'),acesso:val('acesso'),atividades:arr('atividades'),produtividade:val('produtividade'),qualidade:val('qualidade'),agilidade:val('agilidade'),tempo:val('tempo'),criou:val('criou'),caso:val('caso'),revisao:val('revisao'),barreiras:arr('barreiras'),capacitacao:arr('capacitacao'),compartilha:val('compartilha'),sugestao:val('sugestao'),multiplicador:val('multiplicador'),nome:val('nome'),contato:val('contato')}}
function makeProtocol(){const bytes=new Uint8Array(6);crypto.getRandomValues(bytes);const code=[...bytes].map(b=>(b%36).toString(36)).join('').toUpperCase();return `IA-2026-${code}`}
async function submitToSupabase(payload,protocol){const res=await fetch(`${SUPABASE_URL}/rest/v1/mundial_ia_responses`,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'Prefer':'return=minimal'},body:JSON.stringify({protocol,setor:payload.setor,situacao:payload.situacao,payload})});if(!res.ok){let msg='';try{msg=(await res.json())?.message||''}catch{}throw new Error(msg||`Falha no envio (${res.status})`)}}
function setSubmitState(busy){const btn=form.querySelector('button[type="submit"]');if(!btn)return;btn.disabled=busy;btn.dataset.original=btn.dataset.original||btn.textContent;btn.textContent=busy?'Enviando resposta...':btn.dataset.original}
form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;const payload=collect();const protocol=makeProtocol();setSubmitState(true);try{await submitToSupabase(payload,protocol);localStorage.removeItem(draftKey);form.reset();updateConditional();updateProgress();const s=document.getElementById('success');s.innerHTML=`<h3>Resposta registrada com sucesso</h3><p>Obrigado por contribuir com o diagnóstico de Inteligência Artificial da Mundial Atacadista.</p><p><strong>Protocolo: ${protocol}</strong></p>`;s.classList.add('show');burst();s.scrollIntoView({behavior:'smooth',block:'center'})}catch(err){console.error(err);alert('Não foi possível enviar sua resposta agora. Confira sua conexão e tente novamente. O formulário foi mantido preenchido.')}finally{setSubmitState(false)}});
document.getElementById('saveDraft').onclick=()=>{localStorage.setItem(draftKey,JSON.stringify(collect()));burst(18)};
function burst(n=44){const c=document.getElementById('confetti');for(let i=0;i<n;i++){const s=document.createElement('span');s.className='spark';s.style.left=Math.random()*100+'vw';s.style.top='-20px';s.style.background=['var(--cyan)','var(--violet)','var(--gold)','var(--green)'][i%4];s.style.animationDelay=(Math.random()*.35)+'s';c.appendChild(s);setTimeout(()=>s.remove(),1300)}}
const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.14});document.querySelectorAll('.reveal').forEach(e=>obs.observe(e));
updateConditional();updateProgress();updateActiveStepFromScroll();