const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = value => value * value * (3 - 2 * value);
const body = document.body;
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = motionPreference.matches;
body.classList.add('js');
body.classList.toggle('motion-enabled', !reduced);

const intro = $('.intro');
let introFinished = false;
let introTimeline;
let introTimer;
function finishIntro() {
  if (introFinished) return;
  introFinished = true;
  clearTimeout(introTimer);
  introTimeline?.pause();
  body.classList.remove('intro-active');
  $('.site-header').inert=false;
  $('main').inert=false;
  if (reduced || location.hash) { intro.remove(); return; }
  intro.style.pointerEvents = 'none';
  const exit = intro.animate([{opacity:1},{opacity:0}], {duration:420, easing:'ease-out', fill:'forwards'});
  exit.finished.then(() => intro.remove()).catch(() => intro.remove());
}
if (reduced || location.hash) {
  finishIntro();
} else {
  body.classList.add('intro-active');
  $('.site-header').inert=true;
  $('main').inert=true;
  const anime = window.anime;
  if (anime?.createTimeline) {
    introTimeline = anime.createTimeline({onComplete:finishIntro})
      .add('.intro-name span', {
        opacity:[0,1], translateY:['105%','0%'], rotate:['8deg','0deg'],
        delay:(_,index)=>index*65, duration:720, ease:'outExpo'
      })
      .add('.intro-rule i', {translateX:['-101%','0%'],duration:900,ease:'inOutQuint'}, 150)
      .add('.intro-code', {opacity:[0,1],duration:450}, 700)
      .add('.intro-lockup', {opacity:[1,0],translateY:[0,-8],duration:400,ease:'inQuad'}, 1500);
  } else {
    setTimeout(finishIntro, 700);
  }
  introTimer = setTimeout(finishIntro, 2400);
}
$('.intro-skip')?.addEventListener('click', finishIntro);

const hero = $('.hero');
const heroStage = $('.hero-stage');
const railA = $('.rail-a');
const railB = $('.rail-b');
const heroCopy = $('.hero-copy');
const about = $('.about-story');
const aboutContent = $('.about-content');
const portalCover = $('.portal-cover');
const portalGlyph = $('#portal-glyph');
const portalText = $('#portal-mask-text');
const portalOutline = $('.portal-title-outline');
const portalCaption = $('.portal-caption');
const portalSkip = $('.portal-skip');
aboutContent.id = 'about-content';
const work = $('.work');
const workWindow = $('.work-window');
const workTrack = $('.project-list');
const workCounter = $('.work-counter');
const workProgress = $('.work-progress span');
const workPrev = $('.work-prev');
const workNext = $('.work-next');
const projectCards = $$('.project-card');
const timeline = $('.timeline');
const threadPath = $('#journey-curve');
const threadDraw = $('.thread-draw');
const threadHead = $('.thread-head');
const portraitStage = $('.portrait-stage');
const charmRig = $('.charm-rig');
const profileCharm = $('.profile-charm');
const starfields = [
  {section:heroStage, canvas:$('.starfield-hero'), seed:197, desktopCount:118, mobileCount:52},
  {section:$('.contact'), canvas:$('.starfield-contact'), seed:503, desktopCount:78, mobileCount:34}
].map(field => ({
  ...field, context:field.canvas.getContext('2d'), stars:[], visible:false,
  width:0, height:0, pointerX:.5, pointerY:.5, pointerActive:false,
  impulses:[], meteor:null, nextMeteor:performance.now()+4800+field.seed*3
}));
const pathLength = threadPath.getTotalLength();
const pathPoints = Array.from({length:801}, (_,index) => threadPath.getPointAtLength(pathLength*index/800));
threadDraw.style.strokeDasharray = String(pathLength);
const header = $('.site-header');
const progressBar = $('.scroll-progress');
let geometry = {};
let frame = 0, lastTime = 0, resizeFrame = 0;
let state = {hero:0, portal:0, work:0, journey:0};
let lastCounter = -1;
let horizontal = false;
let dragging = null;
const finePointer = matchMedia('(pointer:fine)');
let smoothTarget = scrollY;
let smoothCurrent = scrollY;
let smoothFrame = 0;
let smoothLastTime = 0;
let smoothRunning = false;
const charm = {
  x:0,y:0,restX:0,restY:0,anchorX:0,anchorY:0,size:0,
  vx:0,vy:0,tilt:0,dragging:false,pointerId:null,
  offsetX:0,offsetY:0,lastMove:0,frame:0,ready:false
};
const absoluteTop = element => element.getBoundingClientRect().top + scrollY;

function seedRandom(seed) {
  let value=seed;
  return () => {
    value=(Math.imul(value,1664525)+1013904223)>>>0;
    return value/4294967296;
  };
}
function sizeStarfields() {
  const ink=getComputedStyle(document.documentElement).getPropertyValue('--steel').trim();
  for (const field of starfields) {
    if (!field.context) continue;
    const bounds=field.section.getBoundingClientRect();
    const width=Math.max(1,bounds.width), height=Math.max(1,bounds.height);
    const ratio=Math.min(devicePixelRatio||1,2);
    if (field.width===width && field.height===height && field.ratio===ratio) continue;
    field.width=width;field.height=height;field.ratio=ratio;field.ink=ink;
    field.canvas.width=Math.round(width*ratio);
    field.canvas.height=Math.round(height*ratio);
    field.context.setTransform(ratio,0,0,ratio,0,0);
    const random=seedRandom(field.seed);
    const count=innerWidth<=820 ? field.mobileCount : field.desktopCount;
    field.stars=Array.from({length:count},()=>({
      x:random()*width, y:random()*height,
      radius:.5+random()*.85, alpha:.36+random()*.36,
      phase:random()*Math.PI*2, speed:.0003+random()*.00055,
      depth:.35+random()*.65
    }));
    if (reduced) drawStarfield(field,0);
  }
}
function drawStarfield(field,time) {
  const ctx=field.context;
  if (!ctx) return;
  ctx.clearRect(0,0,field.width,field.height);
  const moving=!reduced;
  const pointerX=(field.pointerX-.5)*8, pointerY=(field.pointerY-.5)*8;
  if (moving) field.impulses=field.impulses.filter(impulse=>time-impulse.time<1250);
  ctx.fillStyle=field.ink;
  for (const star of field.stars) {
    let x=star.x+(moving&&field.pointerActive?pointerX*star.depth:0);
    let y=star.y+(moving&&field.pointerActive?pointerY*star.depth:0);
    if (moving) for (const impulse of field.impulses) {
      const age=clamp((time-impulse.time)/1250);
      const dx=impulse.x-x, dy=impulse.y-y;
      const influence=Math.exp(-(dx*dx+dy*dy)/(field.width*field.width*.09));
      const pull=Math.sin(Math.PI*age)*influence*.12;
      x+=dx*pull;y+=dy*pull;
    }
    ctx.globalAlpha=star.alpha*(moving?.76+.24*Math.sin(time*star.speed+star.phase):.76);
    ctx.beginPath();ctx.arc(x,y,star.radius,0,Math.PI*2);ctx.fill();
  }
  if (moving) {
    for (const impulse of field.impulses) {
      const age=clamp((time-impulse.time)/1250);
      ctx.globalAlpha=(1-age)*.34;
      ctx.strokeStyle=field.ink;ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(impulse.x,impulse.y,16+age*90,0,Math.PI*2);ctx.stroke();
    }
    if (time>=field.nextMeteor) {
      const random=seedRandom(field.seed+Math.floor(time/1000));
      field.meteor={time,x:field.width*(.18+random()*.6),y:field.height*(.12+random()*.35)};
      field.nextMeteor=time+10000+random()*5000;
    }
    if (field.meteor) {
      const age=(time-field.meteor.time)/900;
      if (age>=1) field.meteor=null;
      else {
        const headX=field.meteor.x+age*135, headY=field.meteor.y+age*62;
        const tailX=headX-75, tailY=headY-34;
        const trail=ctx.createLinearGradient(tailX,tailY,headX,headY);
        trail.addColorStop(0,'rgba(161,174,192,0)');
        trail.addColorStop(1,'rgba(229,231,235,.9)');
        ctx.globalAlpha=Math.sin(Math.PI*age)*.65;
        ctx.strokeStyle=trail;ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(tailX,tailY);ctx.lineTo(headX,headY);ctx.stroke();
      }
    }
  }
  ctx.globalAlpha=1;
}
function drawVisibleStarfields(time) {
  let animated=false;
  for (const field of starfields) {
    if (!field.visible || !field.context) continue;
    drawStarfield(field,time);
    if (!reduced) animated=true;
  }
  return animated;
}
const starfieldObserver=new IntersectionObserver(entries=>{
  for(const entry of entries) {
    const field=starfields.find(item=>item.section===entry.target);
    field.visible=entry.isIntersecting;
  }
  requestRender();
},{threshold:0});
for(const field of starfields) {
  starfieldObserver.observe(field.section);
  field.section.addEventListener('pointermove',event=>{
    if (reduced || event.pointerType!=='mouse') return;
    const bounds=field.section.getBoundingClientRect();
    field.pointerX=clamp((event.clientX-bounds.left)/bounds.width);
    field.pointerY=clamp((event.clientY-bounds.top)/bounds.height);
    field.pointerActive=true;
  },{passive:true});
  field.section.addEventListener('pointerleave',()=>{field.pointerActive=false},{passive:true});
  field.section.addEventListener('click',event=>{
    if (reduced || !field.visible || event.target.closest('a,button,[role="button"]')) return;
    const bounds=field.section.getBoundingClientRect();
    field.impulses.push({x:event.clientX-bounds.left,y:event.clientY-bounds.top,time:performance.now()});
    if(field.impulses.length>2)field.impulses.shift();
    requestRender();
  });
}

function canLockScroll() {
  return !reduced && finePointer.matches && innerWidth > 820;
}
function stopSmoothScroll(sync = true) {
  cancelAnimationFrame(smoothFrame);
  smoothFrame = 0;
  smoothRunning = false;
  smoothLastTime = 0;
  if (sync) smoothTarget = smoothCurrent = scrollY;
  document.documentElement.classList.toggle('smooth-scroll-active',canLockScroll());
}
function smoothScrollTick(time) {
  smoothFrame = 0;
  smoothRunning = true;
  const delta = Math.min(40,smoothLastTime ? time-smoothLastTime : 16.7);
  smoothLastTime = time;
  const ease = 1-Math.exp(-delta/210);
  smoothCurrent = mix(smoothCurrent,smoothTarget,ease);
  if (Math.abs(smoothTarget-smoothCurrent) < .35) smoothCurrent = smoothTarget;
  window.scrollTo(0,smoothCurrent);
  requestRender();
  if (smoothCurrent !== smoothTarget) smoothFrame = requestAnimationFrame(smoothScrollTick);
  else { smoothRunning = false; smoothLastTime = 0; }
}
function setScrollTarget(top, immediate = false) {
  const maximum = geometry.maxScroll || Math.max(0,document.documentElement.scrollHeight-innerHeight);
  smoothTarget = clamp(top,0,maximum);
  if (immediate || !canLockScroll()) {
    cancelAnimationFrame(smoothFrame);
    smoothFrame = 0;
    smoothRunning = false;
    smoothCurrent = smoothTarget;
    window.scrollTo(0,smoothCurrent);
    return;
  }
  if (!smoothRunning) smoothCurrent = scrollY;
  if (!smoothFrame) smoothFrame = requestAnimationFrame(smoothScrollTick);
}
function movePage(top, behavior = reduced ? 'instant' : 'smooth') {
  if (canLockScroll() && behavior !== 'instant') setScrollTarget(top);
  else {
    stopSmoothScroll(false);
    window.scrollTo({top,behavior});
  }
}

function measure() {
  resizeFrame = 0;
  const viewport = document.documentElement.clientWidth;
  const height = innerHeight;
  // Keep scroll travel even when the hero's content is taller than the viewport.
  hero.style.setProperty('--hero-height', heroStage.offsetHeight + 'px');
  hero.style.setProperty('--hero-pin-top', Math.min(0,height-heroStage.offsetHeight) + 'px');
  $('.journey-thread').setAttribute('viewBox',viewport<=580?'405 0 280 1560':'0 0 1000 1560');
  // Keep enough photographs above and below the frame on tall/narrow screens.
  for (const rail of [railA,railB]) {
    const pair=[...rail.children].slice(0,2);
    while (rail.offsetHeight < height*1.8 && rail.childElementCount < 20) {
      pair.forEach(photo=>rail.append(photo.cloneNode(true)));
    }
  }
  const travel = reduced ? 0 : height * (viewport <= 580 ? .95 : 1.2);
  about.style.setProperty('--about-height', aboutContent.offsetHeight + 'px');
  about.style.setProperty('--portal-travel', travel + 'px');
  // Short desktop windows scroll the heading away before pinning the cards.
  // The horizontal timeline starts at that pin boundary, never on pointer entry.
  horizontal = !reduced && viewport > 820 && height >= 440;
  work.classList.toggle('is-horizontal', horizontal);
  const pinHeight = height < 600 ? height+100 : height;
  const pinTop = Math.min(0, height-pinHeight);
  work.style.setProperty('--work-pin-height', pinHeight + 'px');
  work.style.setProperty('--work-pin-top', pinTop + 'px');
  const range = Math.max(0, workTrack.scrollWidth - workWindow.clientWidth);
  const distance = Math.max(range, height);
  work.style.setProperty('--work-distance', distance + 'px');
  if (!horizontal) workTrack.style.transform = '';
  if (horizontal) workWindow.scrollLeft = 0;
  const portalHeight = $('.portal-svg').clientHeight || height;
  const cx = viewport / 2, cy = portalHeight * .47;
  const fontSize = Math.min(240, viewport * .19);
  [portalText, portalOutline].forEach(text => {
    text.setAttribute('x', cx);
    text.setAttribute('y', cy+fontSize*.34);
    text.style.fontSize = fontSize + 'px';
  });
  // Sample the rendered font so the zoom lands inside ink, not in a counter
  // or the font's side bearing. SVG character bounds include that empty space.
  let stemX=cx, stemY=cy;
  if (!reduced && portalText.getNumberOfChars()>1) {
    const start=portalText.getStartPositionOfChar(1);
    const canvas=document.createElement('canvas');
    canvas.width=Math.ceil(fontSize*2);canvas.height=Math.ceil(fontSize*2);
    const context=canvas.getContext('2d',{willReadFrequently:true});
    context.font='700 '+fontSize+'px Georgia';
    const metrics=context.measureText('B');
    const sampleY=Math.round(fontSize-metrics.actualBoundingBoxAscent*.5);
    context.fillText('B',16,fontSize);
    const pixels=context.getImageData(0,sampleY,canvas.width,1).data;
    let runStart=-1, runEnd=-1;
    for(let x=16;x<16+metrics.width*.55;x++){
      if(pixels[x*4+3]>220){if(runStart<0)runStart=x;runEnd=x}
      else if(runStart>=0)break;
    }
    stemX=start.x+(runStart>=0?(runStart+runEnd)/2-16:metrics.width*.3);
    stemY=start.y-metrics.actualBoundingBoxAscent*.5;
  }
  geometry = {
    viewport, height, cx, cy, stemX, stemY, travel,
    heroTop:absoluteTop(hero), heroRange:Math.max(1,hero.offsetHeight-height),
    railARange:Math.max(0,railA.offsetHeight-height+90),
    railBRange:Math.max(0,railB.offsetHeight-height+90),
    aboutTop:absoluteTop(about), workTop:absoluteTop(work)-pinTop, range, distance,
    journeyTop:absoluteTop(timeline), journeyHeight:timeline.offsetHeight,
    maxScroll:Math.max(1,document.documentElement.scrollHeight-height)
  };
  sizeStarfields();
  smoothTarget = clamp(smoothTarget,0,geometry.maxScroll);
  smoothCurrent = clamp(smoothCurrent,0,geometry.maxScroll);
  document.documentElement.classList.toggle('smooth-scroll-active',canLockScroll());
  layoutCharm();
  state = targets();
  requestRender();
}
function targets() {
  const y = scrollY;
  return {
    hero:clamp((y-geometry.heroTop)/geometry.heroRange),
    portal:reduced ? 1 : clamp((y-geometry.aboutTop)/Math.max(1,geometry.travel)),
    work:horizontal ? clamp((y-geometry.workTop)/geometry.distance) : clamp(workWindow.scrollLeft/Math.max(1,geometry.range)),
    journey:reduced ? 1 : clamp((y+geometry.height*.7-geometry.journeyTop)/geometry.journeyHeight)
  };
}
function requestRender() {
  if (!frame && !document.hidden) frame = requestAnimationFrame(render);
}
function updateWorkUI(progress) {
  const index = Math.round(progress*(projectCards.length-1));
  if (lastCounter !== index) {
    lastCounter = index;
    workCounter.textContent = String(index+1).padStart(2,'0') + ' / ' + String(projectCards.length).padStart(2,'0');
  }
  workPrev.disabled = progress < .005;
  workNext.disabled = progress > .995;
  workProgress.style.transform = 'scaleX(' + mix(.04,1,progress) + ')';
}
function render(time) {
  frame = 0;
  const delta = Math.min(64, lastTime ? time-lastTime : 16.7);
  lastTime = time;
  const ease = 1 - Math.exp(-delta/75);
  const target = targets();
  let unsettled = false;
  for (const key of Object.keys(state)) {
    // Pin boundaries must meet native document flow exactly.
    state[key] = reduced || target[key]===0 || target[key]===1
      ? target[key] : mix(state[key],target[key],ease);
    if (Math.abs(state[key]-target[key])>.0001) unsettled = true;
  }
  progressBar.style.transform = 'scaleX(' + clamp(scrollY/geometry.maxScroll) + ')';
  header.classList.toggle('scrolled',scrollY>32);
  if (!reduced) {
    railA.style.transform = 'translate3d(0,' + mix(-geometry.railARange,-25,state.hero) + 'px,0)';
    railB.style.transform = 'translate3d(0,' + mix(-25,-geometry.railBRange,state.hero) + 'px,0)';
    heroCopy.style.transform = 'translate3d(0,' + (-state.hero*38) + 'px,0)';
    const p = state.portal;
    const t = smoothstep(clamp((p-.04)/.87));
    // A bounded zoom avoids oversized glyph textures on mobile GPUs.
    // The final dissolve completes the opening into normal document flow.
    const scale = Math.exp(t*Math.log(22));
    const aim = smoothstep(clamp(p/.55));
    const x = mix(geometry.cx,geometry.stemX,aim);
    const y = mix(geometry.cy,geometry.stemY,aim);
    const transform = 'translate(' + geometry.cx + ' ' + geometry.cy + ') scale(' + scale + ') translate(' + (-x) + ' ' + (-y) + ')';
    portalGlyph.setAttribute('transform',transform);
    portalOutline.setAttribute('transform',transform);
    // Start with solid ink, then dissolve it into the live section as we enter.
    portalOutline.style.opacity = String(1-smoothstep(clamp((p-.08)/.36)));
    aboutContent.style.opacity = String(mix(.3,1,smoothstep(clamp(p/.68))));
    const captionOpacity = String(1-clamp(p/.18));
    portalCaption.style.opacity = captionOpacity;
    portalSkip.style.opacity = captionOpacity;
    portalSkip.tabIndex = p < .18 ? 0 : -1;
    portalCover.style.opacity = String(1-smoothstep(clamp((p-.44)/.36)));
    portalCover.classList.toggle('is-finished',p>=.82);
    aboutContent.inert = p < .82;
  } else {
    aboutContent.inert = false;
    aboutContent.style.opacity = '1';
    heroCopy.style.transform = '';
  }
  if (horizontal) workTrack.style.transform = 'translate3d(' + (-state.work*geometry.range) + 'px,0,0)';
  updateWorkUI(horizontal ? state.work : target.work);
  threadDraw.style.strokeDashoffset = String(pathLength*(1-state.journey));
  const point = pathPoints[Math.round(state.journey*800)];
  threadHead.setAttribute('cx',point.x);
  threadHead.setAttribute('cy',point.y);
  if (drawVisibleStarfields(time) || unsettled) requestRender();
}

addEventListener('scroll',()=>{
  if (!smoothRunning) smoothTarget = smoothCurrent = scrollY;
  requestRender();
},{passive:true});
addEventListener('wheel',event=>{
  if (event.ctrlKey || event.metaKey || body.classList.contains('intro-active') || body.classList.contains('menu-open')) return;
  const unit = event.deltaMode===1 ? 18 : event.deltaMode===2 ? innerHeight : 1;
  const overGallery = workWindow.contains(event.target);
  // Never swallow a horizontal trackpad gesture in the native gallery.
  if (!horizontal && overGallery && (event.shiftKey || Math.abs(event.deltaX)>Math.abs(event.deltaY))) {
    return;
  }
  if (!canLockScroll()) return;
  event.preventDefault();
  const input=horizontal && overGallery && Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
  const delta = clamp(input*unit,-150,150);
  if (!smoothRunning) smoothTarget = smoothCurrent = scrollY;
  setScrollTarget(smoothTarget+delta*.82);
},{passive:false});
addEventListener('keydown',event=>{
  if (!canLockScroll() || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
  if (body.classList.contains('intro-active') || body.classList.contains('menu-open')) return;
  const editable = event.target.closest?.('input,textarea,select,button,[contenteditable="true"]');
  if (editable) return;
  const page = innerHeight*.78;
  const amounts = {ArrowDown:115,ArrowUp:-115,PageDown:page,PageUp:-page,' ':event.shiftKey?-page:page};
  if (event.key==='Home' || event.key==='End') {
    event.preventDefault();
    setScrollTarget(event.key==='Home'?0:geometry.maxScroll);
  } else if (event.key in amounts) {
    event.preventDefault();
    if (!smoothRunning) smoothTarget = smoothCurrent = scrollY;
    setScrollTarget(smoothTarget+amounts[event.key]);
  }
});
workWindow.addEventListener('scroll', requestRender, {passive:true});
function scheduleMeasure() {
  if (!resizeFrame) resizeFrame = requestAnimationFrame(measure);
}
addEventListener('resize', scheduleMeasure, {passive:true});
new ResizeObserver(scheduleMeasure).observe(aboutContent);
addEventListener('load', measure, {once:true});
document.fonts.ready.then(measure);
motionPreference.addEventListener('change',event => {
  reduced = event.matches;
  body.classList.toggle('motion-enabled',!reduced);
  if (reduced) finishIntro();
  stopSmoothScroll();
  if (reduced) stopCharm();
  measure();
});
finePointer.addEventListener('change',()=>{stopSmoothScroll();measure()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastTime=0;requestRender()}});
measure();

function navigateHash(hash, behavior = reduced ? 'instant' : 'smooth') {
  const id = decodeURIComponent(hash.slice(1));
  if (id==='about-content') {
    movePage(geometry.aboutTop+geometry.travel,behavior);
    return;
  }
  const target = document.getElementById(id);
  if (target) {
    movePage(absoluteTop(target)-(id==='about'||id==='home'?0:88),behavior);
    if (id==='main') target.focus({preventScroll:true});
  }
}
$$('a[href^="#"]').forEach(link => link.addEventListener('click',event => {
  const hash = link.getAttribute('href');
  if (!document.getElementById(hash.slice(1))) return;
  event.preventDefault();
  setMenu(false);
  finishIntro();
  history.pushState(null,'',hash);
  navigateHash(hash);
}));
if (location.hash) requestAnimationFrame(()=>navigateHash(location.hash,'instant'));
addEventListener('hashchange',()=>navigateHash(location.hash));

function moveProject(direction) {
  const actual = horizontal ? clamp((scrollY-geometry.workTop)/geometry.distance) : clamp(workWindow.scrollLeft/Math.max(1,geometry.range));
  const index = clamp(Math.round(actual*(projectCards.length-1))+direction,0,projectCards.length-1);
  const progress = index/(projectCards.length-1);
  if (horizontal) movePage(geometry.workTop+geometry.distance*progress,reduced?'instant':'smooth');
  else workWindow.scrollTo({left:progress*geometry.range,behavior:reduced?'instant':'smooth'});
}
workPrev.addEventListener('click',()=>moveProject(-1));
workNext.addEventListener('click',()=>moveProject(1));
workWindow.addEventListener('keydown',event=>{
  if (event.target !== workWindow) return;
  if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
    event.preventDefault();
    moveProject(event.key==='ArrowRight'?1:-1);
  }
});
workWindow.addEventListener('pointerdown',event=>{
  if(!horizontal||event.pointerType!=='mouse'||event.button!==0||event.target.closest('button,a'))return;
  dragging={x:event.clientX,scroll:scrollY,id:event.pointerId};
  workWindow.setPointerCapture(event.pointerId);
  workWindow.classList.add('is-dragging');
});
workWindow.addEventListener('pointermove',event=>{
  if(!dragging)return;
  const offset=(dragging.x-event.clientX)*geometry.distance/Math.max(1,geometry.range);
  setScrollTarget(clamp(dragging.scroll+offset,geometry.workTop,geometry.workTop+geometry.distance),true);
});
function releaseDrag(){dragging=null;workWindow.classList.remove('is-dragging')}
workWindow.addEventListener('pointerup',releaseDrag);
workWindow.addEventListener('pointercancel',releaseDrag);
workWindow.addEventListener('lostpointercapture',releaseDrag);

const revealObserver = new IntersectionObserver(entries=>{
  for (const entry of entries) if(entry.isIntersecting){
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  }
},{threshold:.08,rootMargin:'0px 0px -25px 0px'});
$$('.reveal').forEach(element=>revealObserver.observe(element));

const menuButton=$('.menu-toggle');
const menuPanel=$('.menu-panel');
menuPanel.inert=true;
function setMenu(open){
  const wasOpen=body.classList.contains('menu-open');
  if (open) stopSmoothScroll();
  body.classList.toggle('menu-open',open);
  menuButton.setAttribute('aria-expanded',String(open));
  menuButton.setAttribute('aria-label',open?'Close navigation menu':'Open navigation menu');
  menuPanel.setAttribute('aria-hidden',String(!open));
  menuPanel.inert=!open;
  $('main').inert=open;
  if(open) $('a',menuPanel).focus({preventScroll:true});
  else if(wasOpen) menuButton.focus({preventScroll:true});
}
menuButton.addEventListener('click',()=>setMenu(!body.classList.contains('menu-open')));
addEventListener('keydown',event=>{
  if(event.key==='Escape'){setMenu(false);finishIntro()}
  if(event.key==='Tab'&&body.classList.contains('menu-open')){
    const items=[menuButton,...$$('a',menuPanel)];
    const index=items.indexOf(document.activeElement);
    if(event.shiftKey&&index===0){event.preventDefault();items.at(-1).focus()}
    else if(!event.shiftKey&&index===items.length-1){event.preventDefault();menuButton.focus()}
  }
});
$('.portrait-card').addEventListener('pointerdown',event=>{
  if(event.pointerType==='touch') event.currentTarget.classList.toggle('is-squished');
});

function drawCharm() {
  const loopX = charm.x+charm.size*.5;
  const loopY = charm.y+charm.size*.105;
  const dx = loopX-charm.anchorX;
  const dy = loopY-charm.anchorY;
  charmRig.style.setProperty('--anchor-x',charm.anchorX+'px');
  charmRig.style.setProperty('--anchor-y',charm.anchorY+'px');
  charmRig.style.setProperty('--chain-length',Math.max(18,Math.hypot(dx,dy))+'px');
  charmRig.style.setProperty('--chain-angle',(Math.atan2(dy,dx)-Math.PI/2)+'rad');
  charmRig.style.setProperty('--charm-x',charm.x+'px');
  charmRig.style.setProperty('--charm-y',charm.y+'px');
  charmRig.style.setProperty('--charm-tilt',charm.tilt+'deg');
}
function layoutCharm() {
  if (!portraitStage || !charmRig || !profileCharm) return;
  const rigRect = charmRig.getBoundingClientRect();
  const stageRect = portraitStage.getBoundingClientRect();
  charm.size = profileCharm.offsetWidth || 116;
  charm.anchorX = stageRect.right-rigRect.left-(innerWidth<=580?36:innerWidth<=820?42:52);
  charm.anchorY = stageRect.top-rigRect.top+(innerWidth<=580?22:30);
  charm.restX = charm.anchorX-charm.size*.5+(innerWidth<=580?-10:14);
  charm.restY = charm.anchorY+(innerWidth<=580?52:68);
  if (!charm.dragging && !charm.frame) {
    charm.x = charm.restX;
    charm.y = charm.restY;
    charm.tilt = -4;
  }
  drawCharm();
  if (!charm.ready) {
    charm.ready = true;
    requestAnimationFrame(()=>charmRig.classList.add('is-ready'));
  }
}
function stopCharm() {
  cancelAnimationFrame(charm.frame);
  charm.frame = 0;
  charm.dragging = false;
  charmRig?.classList.remove('is-dragging');
}
function settleCharm() {
  charm.frame = 0;
  charm.vx = (charm.vx+(charm.restX-charm.x)*.055)*.82;
  charm.vy = (charm.vy+(charm.restY-charm.y)*.055)*.82;
  charm.x += charm.vx;
  charm.y += charm.vy;
  charm.tilt = mix(charm.tilt,clamp(charm.vx*1.4,-18,18),.22);
  drawCharm();
  const settled = Math.abs(charm.restX-charm.x)+Math.abs(charm.restY-charm.y)+Math.abs(charm.vx)+Math.abs(charm.vy)<.35;
  if (!settled) charm.frame = requestAnimationFrame(settleCharm);
  else {
    charm.x=charm.restX;charm.y=charm.restY;charm.vx=0;charm.vy=0;charm.tilt=-4;drawCharm();
  }
}
function releaseCharm(event) {
  if (!charm.dragging || (event && event.pointerId!==charm.pointerId)) return;
  charm.dragging = false;
  charmRig.classList.remove('is-dragging');
  if (event && profileCharm.hasPointerCapture?.(event.pointerId)) profileCharm.releasePointerCapture(event.pointerId);
  if (!reduced) charm.frame=requestAnimationFrame(settleCharm);
}
profileCharm?.addEventListener('pointerdown',event=>{
  if (reduced || event.button!==0) return;
  event.preventDefault();
  stopCharm();
  const rect=charmRig.getBoundingClientRect();
  charm.dragging=true;charm.pointerId=event.pointerId;
  charm.offsetX=event.clientX-rect.left-charm.x;
  charm.offsetY=event.clientY-rect.top-charm.y;
  charm.lastMove=performance.now();
  charm.vx=0;charm.vy=0;
  charmRig.classList.add('is-dragging');
  profileCharm.setPointerCapture(event.pointerId);
});
profileCharm?.addEventListener('pointermove',event=>{
  if (!charm.dragging || event.pointerId!==charm.pointerId) return;
  const rect=charmRig.getBoundingClientRect();
  const now=performance.now();
  const elapsed=Math.max(8,now-charm.lastMove);
  const nextX=clamp(event.clientX-rect.left-charm.offsetX,-charm.size*.25,rect.width-charm.size*.75);
  const nextY=clamp(event.clientY-rect.top-charm.offsetY,-charm.size*.15,rect.height-charm.size*.45);
  charm.vx=clamp((nextX-charm.x)*16/elapsed,-18,18);
  charm.vy=clamp((nextY-charm.y)*16/elapsed,-18,18);
  charm.tilt=clamp(charm.vx*1.6,-22,22);
  charm.x=nextX;charm.y=nextY;charm.lastMove=now;
  drawCharm();
});
profileCharm?.addEventListener('pointerup',releaseCharm);
profileCharm?.addEventListener('pointercancel',releaseCharm);
profileCharm?.addEventListener('lostpointercapture',releaseCharm);
profileCharm?.addEventListener('keydown',event=>{
  if (reduced || !['Enter',' '].includes(event.key)) return;
  event.preventDefault();
  stopCharm();
  charm.x-=28;charm.y+=18;charm.vx=7;charm.vy=-2;charm.tilt=-18;drawCharm();
  charm.frame=requestAnimationFrame(settleCharm);
});

// A small playable study, not a claim that this is the original game's UI.
const knightBoard=$('.knight-board');
const knightStatus=$('.knight-status');
let knightPosition=35; // d4: row 4, column 3, with rank 8 at the top.
let knightFocus=35;
let knightMoves=0;
const squareName=index=>'abcdefgh'[index%8]+(8-Math.floor(index/8));
const legalKnightMove=(from,to)=>{
  const dx=Math.abs(from%8-to%8);
  const dy=Math.abs(Math.floor(from/8)-Math.floor(to/8));
  return dx*dy===2;
};
const knightSquares=Array.from({length:64},(_,index)=>{
  const square=document.createElement('button');
  square.type='button';
  square.className='knight-square'+((Math.floor(index/8)+index%8)%2?' is-dark':'');
  square.addEventListener('click',()=>{
    if(!legalKnightMove(knightPosition,index)) return;
    knightPosition=index;knightFocus=index;knightMoves++;
    paintKnight();
  });
  square.addEventListener('keydown',event=>{
    const steps={ArrowRight:1,ArrowLeft:-1,ArrowDown:8,ArrowUp:-8};
    if(!(event.key in steps))return;
    event.preventDefault();event.stopPropagation();
    const next=clamp(index+steps[event.key],0,63);
    if(Math.abs(steps[event.key])===1&&Math.floor(next/8)!==Math.floor(index/8))return;
    knightFocus=next;paintKnight();knightSquares[next].focus({preventScroll:true});
  });
  knightBoard.append(square);
  return square;
});
function paintKnight(){
  knightSquares.forEach((square,index)=>{
    const current=index===knightPosition;
    const legal=legalKnightMove(knightPosition,index);
    square.textContent=current?'♞':'';
    square.classList.toggle('is-current',current);
    square.classList.toggle('is-legal',legal);
    square.setAttribute('aria-label',squareName(index)+(current?', knight':legal?', move knight here':', unavailable'));
    square.setAttribute('aria-disabled',String(!legal));
    square.tabIndex=index===knightFocus?0:-1;
  });
  knightStatus.textContent='Knight on '+squareName(knightPosition)+(knightMoves?' · '+knightMoves+(knightMoves===1?' move':' moves'):'');
}
$('.knight-reset').addEventListener('click',()=>{knightPosition=35;knightFocus=35;knightMoves=0;paintKnight()});
paintKnight();
for(let index=0;index<36;index++){
  const piece=document.createElement('span');
  piece.className='candy-piece'+([14,20,26].includes(index)?' is-match':'');
  $('.candy-board').append(piece);
}
// Yield immediately when the user takes hold of the native scrollbar.
addEventListener('pointerdown',event=>{
  if(event.clientX>=document.documentElement.clientWidth)stopSmoothScroll();
},{passive:true});

// Cursor animation sleeps once it catches up, rather than running continuously.
const cursor=$('.cursor');
const cursorLabel=$('.cursor span');
let mouse={x:0,y:0,cx:0,cy:0},cursorFrame=0;
function chaseCursor(){
  cursorFrame=0;
  mouse.cx=mix(mouse.cx,mouse.x,.22); mouse.cy=mix(mouse.cy,mouse.y,.22);
  cursor.style.transform='translate3d('+mouse.cx+'px,'+mouse.cy+'px,0) translate(-50%,-50%)';
  if(Math.abs(mouse.x-mouse.cx)+Math.abs(mouse.y-mouse.cy)>.2)cursorFrame=requestAnimationFrame(chaseCursor);
}
addEventListener('pointermove',event=>{
  if(reduced||event.pointerType!=='mouse'||innerWidth<=1100)return;
  mouse.x=event.clientX;mouse.y=event.clientY;
  if(!cursor.style.opacity){mouse.cx=mouse.x;mouse.cy=mouse.y}
  cursor.style.opacity='1';
  if(!cursorFrame)cursorFrame=requestAnimationFrame(chaseCursor);
},{passive:true});
document.documentElement.addEventListener('pointerleave',()=>cursor.style.opacity='0');
$$('a,button,.portrait-card').forEach(item=>{
  item.addEventListener('pointerenter',()=>{cursor.classList.add('is-active');cursorLabel.textContent=item.dataset.cursor||'View'});
  item.addEventListener('pointerleave',()=>cursor.classList.remove('is-active'));
});
$('#year').textContent=new Date().getFullYear();
