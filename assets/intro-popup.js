(()=>{
  'use strict';

  const SESSION_KEY='mundialIaIntroSeenV1';
  const formTarget=document.getElementById('formulario');
  if(!formTarget||document.getElementById('iaIntroOverlay'))return;

  try{if(sessionStorage.getItem(SESSION_KEY)==='1')return}catch{}

  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
  const mobile=window.matchMedia?.('(max-width: 760px)')?.matches||false;
  const palette=['#25d9ff','#8a5cff','#44e6a0','#ffc35a','#ffffff'];

  const style=document.createElement('style');
  style.id='iaIntroStyles';
  style.textContent=`
    .ia-intro-overlay{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:22px;background:rgba(2,7,16,.78);backdrop-filter:blur(13px);overflow:hidden}
    .ia-intro-ambient{position:absolute;inset:0;pointer-events:none;overflow:hidden}
    .ia-intro-cloud{position:absolute;border-radius:999px;filter:blur(8px);opacity:.18;background:radial-gradient(circle at 30% 40%,rgba(37,217,255,.75),rgba(138,92,255,.18) 55%,transparent 72%);animation:iaIntroCloud 12s ease-in-out infinite alternate}
    .ia-intro-cloud.one{width:360px;height:180px;left:-90px;top:8%}
    .ia-intro-cloud.two{width:300px;height:150px;right:-55px;bottom:10%;animation-duration:15s;animation-direction:alternate-reverse}
    @keyframes iaIntroCloud{from{transform:translate3d(-10px,-6px,0) scale(1)}to{transform:translate3d(28px,18px,0) scale(1.08)}}
    .ia-intro-bgfx,.ia-intro-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
    .ia-intro-bgfx{z-index:1}.ia-intro-fx{z-index:4}
    .ia-intro-modal{width:min(720px,100%);z-index:3;border-radius:30px;padding:24px 28px 22px;background:linear-gradient(180deg,rgba(15,33,70,.96),rgba(7,17,36,.97));border:1px solid rgba(37,217,255,.3);box-shadow:0 30px 100px rgba(0,0,0,.62);position:relative;overflow:hidden;isolation:isolate;transform:translate3d(var(--ia-tx,0px),var(--ia-ty,0px),0);transition:transform .08s linear}
    .ia-intro-modal:before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(circle at var(--ia-mx,80%) var(--ia-my,15%),rgba(37,217,255,.18),transparent 30%);pointer-events:none}
    .ia-intro-eyebrow{color:#8feaff;text-transform:uppercase;letter-spacing:.08em;font-size:11px;font-weight:900}
    .ia-intro-modal h2{font-size:28px;line-height:1.06;margin:7px 0 0;letter-spacing:-.03em;max-width:520px}
    .ia-intro-copy{margin-top:16px;color:#d4e3f2;font-size:15px;line-height:1.58;max-width:620px}
    .ia-intro-copy p{margin:0 0 10px}.ia-intro-copy strong{color:#fff}
    .ia-intro-privacy{margin-top:15px;padding:12px 14px;border-radius:16px;background:rgba(68,230,160,.07);border:1px solid rgba(68,230,160,.2);color:#c9f6e4;font-size:13px;font-weight:750;line-height:1.45}
    .ia-intro-meta{display:flex;gap:8px;flex-wrap:wrap;margin:13px 0 17px}
    .ia-intro-chip{padding:8px 10px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:#bcd0e4;font-size:12px;font-weight:750}
    .ia-intro-actions{display:flex;justify-content:flex-end;gap:10px}
    .ia-intro-start{border:0;border-radius:999px;padding:12px 18px;background:linear-gradient(135deg,var(--cyan),var(--blue));color:#04101e;font-weight:900;cursor:pointer;box-shadow:0 12px 28px rgba(37,217,255,.25);transition:transform .18s,box-shadow .18s}
    .ia-intro-start:hover{transform:translateY(-1px) scale(1.02);box-shadow:0 16px 32px rgba(37,217,255,.3)}
    .ia-intro-start:focus-visible{outline:3px solid rgba(255,255,255,.9);outline-offset:3px}
    .ia-intro-note{color:#839ab4;font-size:11px;margin-top:11px;line-height:1.4}
    @media(max-width:760px){.ia-intro-overlay{padding:14px}.ia-intro-modal{padding:21px 18px 19px;border-radius:24px}.ia-intro-modal h2{font-size:24px}.ia-intro-copy{font-size:14px}.ia-intro-actions{justify-content:stretch}.ia-intro-start{width:100%;min-height:48px}}
    @media(prefers-reduced-motion:reduce){.ia-intro-cloud,.ia-intro-modal,.ia-intro-start{animation:none!important;transition:none!important}}
  `;
  document.head.appendChild(style);

  const overlay=document.createElement('div');
  overlay.id='iaIntroOverlay';
  overlay.className='ia-intro-overlay';
  overlay.innerHTML=`
    <div class="ia-intro-ambient" aria-hidden="true"><span class="ia-intro-cloud one"></span><span class="ia-intro-cloud two"></span></div>
    <canvas class="ia-intro-bgfx" id="iaIntroBgFx" aria-hidden="true"></canvas>
    <canvas class="ia-intro-fx" id="iaIntroFx" aria-hidden="true"></canvas>
    <section class="ia-intro-modal" id="iaIntroModal" role="dialog" aria-modal="true" aria-labelledby="iaIntroTitle">
      <div class="ia-intro-eyebrow">Antes de começar</div>
      <h2 id="iaIntroTitle">Por que sua participação é importante?</h2>
      <div class="ia-intro-copy">
        <p>A IA já faz parte da rotina de muitos profissionais. Este diagnóstico quer entender <strong>como ela está sendo usada hoje na Mundial Atacadista</strong>, quais benefícios já proporciona e quais necessidades ainda existem.</p>
        <p><strong>Sua resposta transforma experiências individuais em dados</strong> que podem apoiar futuras decisões sobre capacitação, ferramentas e investimentos em Inteligência Artificial.</p>
      </div>
      <div class="ia-intro-privacy">🔒 Resposta anônima, sem login corporativo e com a pesquisa hospedada fora do domínio da Mundial Atacadista.</div>
      <div class="ia-intro-meta">
        <span class="ia-intro-chip">⏱ Cerca de 3 minutos</span>
        <span class="ia-intro-chip">📊 Análise consolidada</span>
        <span class="ia-intro-chip">✓ Não existem respostas certas ou erradas</span>
      </div>
      <div class="ia-intro-actions"><button class="ia-intro-start" id="iaIntroStart" type="button">Começar diagnóstico</button></div>
      <div class="ia-intro-note">Identificação só é solicitada de forma opcional ao final, caso a pessoa queira se disponibilizar para compartilhar um caso de uso.</div>
    </section>
  `;
  document.body.appendChild(overlay);

  const modal=document.getElementById('iaIntroModal');
  const startButton=document.getElementById('iaIntroStart');
  const bgCanvas=document.getElementById('iaIntroBgFx');
  const fxCanvas=document.getElementById('iaIntroFx');
  const bgCtx=bgCanvas.getContext('2d');
  const fxCtx=fxCanvas.getContext('2d');
  const previousBodyOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';

  let mouse={x:innerWidth*.5,y:innerHeight*.5,vx:0,vy:0,active:false};
  let fireflies=[];
  let ripples=[];
  let fireworks=[];
  let animationFrame=0;

  function rememberSeen(){try{sessionStorage.setItem(SESSION_KEY,'1')}catch{}}

  function resizeCanvases(){
    const rect=overlay.getBoundingClientRect();
    bgCanvas.width=Math.max(1,Math.floor(rect.width));
    bgCanvas.height=Math.max(1,Math.floor(rect.height));
    fxCanvas.width=bgCanvas.width;
    fxCanvas.height=bgCanvas.height;
  }

  function initFireflies(){
    const count=reduced?28:(mobile?58:110);
    fireflies=Array.from({length:count},()=>({
      x:Math.random()*bgCanvas.width,
      y:Math.random()*bgCanvas.height,
      vx:(Math.random()-.5)*.35,
      vy:(Math.random()-.5)*.35,
      size:1.4+Math.random()*3.4,
      glow:10+Math.random()*18,
      baseAlpha:.15+Math.random()*.45,
      twinkle:Math.random()*Math.PI*2,
      color:palette[Math.floor(Math.random()*4)]
    }));
  }

  function moveModal(x,y){
    if(reduced||mobile)return;
    const r=modal.getBoundingClientRect();
    const mx=((x-r.left)/r.width)*100;
    const my=((y-r.top)/r.height)*100;
    modal.style.setProperty('--ia-mx',Math.max(0,Math.min(100,mx))+'%');
    modal.style.setProperty('--ia-my',Math.max(0,Math.min(100,my))+'%');
    const nx=(x-(r.left+r.width/2))/(r.width/2);
    const ny=(y-(r.top+r.height/2))/(r.height/2);
    modal.style.setProperty('--ia-tx',(nx*5)+'px');
    modal.style.setProperty('--ia-ty',(ny*5)+'px');
  }

  function scatterFireflies(x,y){
    ripples.push({x,y,r:12,a:.42});
    for(const f of fireflies){
      const dx=f.x-x,dy=f.y-y;
      const dist=Math.hypot(dx,dy)||1;
      const radius=260;
      if(dist<radius){
        const force=(1-dist/radius)*2.8;
        f.vx+=(dx/dist)*force;
        f.vy+=(dy/dist)*force;
        f.twinkle+=.7;
      }
    }
  }

  function drawFireflies(){
    bgCtx.clearRect(0,0,bgCanvas.width,bgCanvas.height);
    for(const f of fireflies){
      f.twinkle+=.025+f.size*.002;
      if(!reduced){
        f.x+=f.vx;f.y+=f.vy;
        if(f.x<0||f.x>bgCanvas.width)f.vx*=-1;
        if(f.y<0||f.y>bgCanvas.height)f.vy*=-1;
        if(mouse.active){
          const dx=mouse.x-f.x,dy=mouse.y-f.y;
          const dist=Math.hypot(dx,dy)||1;
          const radius=220;
          if(dist<radius){
            const force=(1-dist/radius)*.14;
            const spin=(mouse.vx+mouse.vy)*.0025;
            f.vx+=(dx/dist)*force+(-dy/dist)*spin;
            f.vy+=(dy/dist)*force+(dx/dist)*spin;
          }
        }
        f.vx*=.985;f.vy*=.985;
        f.vx=Math.max(-1.5,Math.min(1.5,f.vx));
        f.vy=Math.max(-1.5,Math.min(1.5,f.vy));
      }
      const alpha=f.baseAlpha+Math.sin(f.twinkle)*.18;
      bgCtx.globalAlpha=Math.max(.05,alpha);
      bgCtx.fillStyle=f.color;
      bgCtx.shadowBlur=f.glow;
      bgCtx.shadowColor=f.color;
      bgCtx.beginPath();bgCtx.arc(f.x,f.y,f.size,0,Math.PI*2);bgCtx.fill();
    }
    bgCtx.shadowBlur=0;bgCtx.globalAlpha=1;

    if(mouse.active&&!reduced){
      const grad=bgCtx.createRadialGradient(mouse.x,mouse.y,0,mouse.x,mouse.y,180);
      grad.addColorStop(0,'rgba(255,255,255,.08)');
      grad.addColorStop(.18,'rgba(37,217,255,.10)');
      grad.addColorStop(.45,'rgba(138,92,255,.05)');
      grad.addColorStop(1,'rgba(37,217,255,0)');
      bgCtx.fillStyle=grad;bgCtx.beginPath();bgCtx.arc(mouse.x,mouse.y,180,0,Math.PI*2);bgCtx.fill();

      bgCtx.strokeStyle='rgba(143,234,255,.18)';
      for(const f of fireflies){
        const dist=Math.hypot(f.x-mouse.x,f.y-mouse.y);
        if(dist<120){
          bgCtx.globalAlpha=(1-dist/120)*.35;
          bgCtx.beginPath();bgCtx.moveTo(mouse.x,mouse.y);bgCtx.lineTo(f.x,f.y);bgCtx.stroke();
        }
      }
      bgCtx.globalAlpha=1;
    }

    ripples=ripples.filter(r=>r.a>.01);
    for(const r of ripples){
      r.r+=3.5;r.a*=.94;
      bgCtx.strokeStyle=`rgba(37,217,255,${r.a})`;
      bgCtx.lineWidth=1.2;
      bgCtx.beginPath();bgCtx.arc(r.x,r.y,r.r,0,Math.PI*2);bgCtx.stroke();
    }
  }

  function burstFirework(x,y,count=30){
    for(let i=0;i<count;i++){
      const angle=(Math.PI*2/count)*i+Math.random()*.4;
      const speed=2+Math.random()*4;
      fireworks.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:50+Math.random()*18,size:2+Math.random()*3,color:palette[Math.floor(Math.random()*palette.length)]});
    }
  }

  function launchFireworks(){
    const rect=modal.getBoundingClientRect();
    const points=[
      [rect.left+rect.width*.18,rect.top+rect.height*.26],
      [rect.left+rect.width*.77,rect.top+rect.height*.25],
      [rect.left+rect.width*.52,rect.top+rect.height*.12],
      [rect.left+rect.width*.38,rect.top+rect.height*.38]
    ];
    points.forEach((p,index)=>setTimeout(()=>burstFirework(p[0],p[1],28+index*4),index*120));
  }

  function drawFireworks(){
    fxCtx.clearRect(0,0,fxCanvas.width,fxCanvas.height);
    fireworks=fireworks.filter(p=>p.life>0);
    for(const p of fireworks){
      p.x+=p.vx;p.y+=p.vy;p.vy+=.04;p.life-=1;p.vx*=.992;
      fxCtx.globalAlpha=Math.max(0,p.life/70);
      fxCtx.fillStyle=p.color;fxCtx.shadowBlur=12;fxCtx.shadowColor=p.color;
      fxCtx.beginPath();fxCtx.arc(p.x,p.y,p.size,0,Math.PI*2);fxCtx.fill();
    }
    fxCtx.globalAlpha=1;fxCtx.shadowBlur=0;
  }

  function animate(){
    if(!document.body.contains(overlay))return;
    drawFireflies();drawFireworks();
    animationFrame=requestAnimationFrame(animate);
  }

  function closeIntro({scroll=false}={}){
    rememberSeen();
    cancelAnimationFrame(animationFrame);
    document.body.style.overflow=previousBodyOverflow;
    overlay.remove();
    style.remove();
    if(scroll)requestAnimationFrame(()=>formTarget.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'}));
  }

  overlay.addEventListener('pointermove',event=>{
    const oldX=mouse.x,oldY=mouse.y;
    mouse.vx=event.clientX-oldX;mouse.vy=event.clientY-oldY;
    mouse.x=event.clientX;mouse.y=event.clientY;mouse.active=true;
    moveModal(event.clientX,event.clientY);
  });
  overlay.addEventListener('pointerleave',()=>{mouse.active=false});
  overlay.addEventListener('click',event=>{
    if(modal.contains(event.target))return;
    scatterFireflies(event.clientX,event.clientY);
  });
  window.addEventListener('resize',()=>{resizeCanvases();initFireflies()},{passive:true});

  startButton.addEventListener('click',()=>{
    startButton.disabled=true;
    startButton.textContent='Ótimo!';
    launchFireworks();
    setTimeout(()=>closeIntro({scroll:true}),1100);
  });

  document.addEventListener('keydown',function onKeydown(event){
    if(event.key!=='Escape'||!document.body.contains(overlay))return;
    document.removeEventListener('keydown',onKeydown);
    closeIntro();
  });

  resizeCanvases();
  initFireflies();
  animate();
  requestAnimationFrame(()=>startButton.focus({preventScroll:true}));
})();