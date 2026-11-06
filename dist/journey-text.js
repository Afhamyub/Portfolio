/* Natural-line block wipes; text keeps its original semantic heading/paragraph. */
(() => {
  const cards=[...document.querySelectorAll('.timeline-item')];
  const sources=new Map();
  const played=new WeakSet();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let resizeTimer;
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(({target,isIntersecting})=>{
      if(!isIntersecting)return;
      played.add(target);target.classList.add('wipe-played');observer.unobserve(target);
    });
  },{rootMargin:'0px 0px -12% 0px',threshold:.1});
  function build(){
    cards.forEach(card=>{
      let lineIndex=0;
      card.querySelectorAll('.timeline-year span,h3,p').forEach(element=>{
        if(!sources.has(element))sources.set(element,element.textContent.trim());
        const text=sources.get(element);
        element.textContent=text;
        if(reduced.matches)return;
        const words=text.split(/\s+/).map((word,index)=>{
          const span=document.createElement('span');span.textContent=word;
          element.append(span,document.createTextNode(' '));return span;
        });
        // Remove the initial plain-text copy before measuring natural wrapping.
        element.firstChild.remove();
        const lines=[];
        words.forEach(word=>{
          const top=word.offsetTop;
          let line=lines.at(-1);
          if(!line || Math.abs(line.top-top)>2){line={top,words:[]};lines.push(line);}
          line.words.push(word.textContent);
        });
        element.textContent='';element.setAttribute('aria-label',text);
        element.classList.add('journey-wipe');
        lines.forEach(line=>{
          const wrapper=document.createElement('span');wrapper.className='wipe-line';wrapper.setAttribute('aria-hidden','true');
          const ink=document.createElement('span');ink.className='wipe-ink';ink.textContent=line.words.join(' ');
          const block=document.createElement('span');block.className='wipe-block';
          wrapper.style.setProperty('--wipe-delay',Math.min(lineIndex++*.085,.6)+'s');
          wrapper.append(ink,block);element.append(wrapper);
        });
      });
      if(played.has(card)||reduced.matches){card.classList.add('wipe-complete');observer.unobserve(card);}
      else observer.observe(card);
    });
  }
  document.fonts.ready.then(build);
  addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(build,180);},{passive:true});
  reduced.addEventListener('change',build);
})();
