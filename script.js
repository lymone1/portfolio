// ?motion nell'URL forza le animazioni anche con "riduci movimento" attivo (utile per testare)
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches && !new URLSearchParams(location.search).has('motion');
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const animate = typeof gsap !== 'undefined' && !reduce;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const COLORS = {
  ink:  { bg: '#0E0D0B', fg: '#EDE6DA' },
  bone: { bg: '#EDE6DA', fg: '#0E0D0B' },
  sig:  { bg: '#2B3BFF', fg: '#EDE6DA' }
};

/* ---------- split del testo in parole e lettere ---------- */
function split(el) {
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const w = document.createElement('span');
          w.className = 'w';
          [...part].forEach(ch => {
            const c = document.createElement('span');
            c.className = 'c';
            c.textContent = ch;
            w.append(c);
          });
          frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
  };
  walk(el);
}

/* ---------- filtri + lightbox + form (funzionano sempre) ---------- */
const filters = $$('.filter');
const works = $$('.work');
function applyFilter(f) {
  filters.forEach(b => b.classList.toggle('active', b.dataset.filter === f));
  works.forEach(w => w.classList.toggle('hidden', f !== 'all' && w.dataset.cat !== f));
  if (animate) ScrollTrigger.refresh();
}
filters.forEach(b => b.addEventListener('click', () => applyFilter(b.dataset.filter)));

const lb = $('#lightbox'), lbContent = $('.lb-content', lb), lbTitle = $('.lb-title', lb);
works.forEach(w => w.addEventListener('click', () => {
  const { type, src, title } = w.dataset;
  let el;
  if (type === 'video') el = Object.assign(document.createElement('video'), { src, controls: true, autoplay: true, playsInline: true });
  else if (type === 'embed') el = Object.assign(document.createElement('iframe'), { src, allow: 'autoplay; fullscreen', allowFullscreen: true });
  else el = Object.assign(document.createElement('img'), { src, alt: title });
  lbContent.replaceChildren(el);
  lbTitle.textContent = title;
  lb.classList.add('open');
  lb.setAttribute('aria-hidden', false);
}));
const closeLb = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', true); setTimeout(() => lbContent.replaceChildren(), 350); };
$('.lb-close').addEventListener('click', closeLb);
lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeLb(); });

$('#contactForm').addEventListener('submit', e => {
  e.preventDefault();
  const d = new FormData(e.target);
  const subject = encodeURIComponent(`Richiesta: ${d.get('servizio')}`);
  const body = encodeURIComponent(`Ciao Victor,\n\n${d.get('messaggio')}\n\n— ${d.get('nome')}`);
  location.href = `mailto:victorsirbu82@gmail.com?subject=${subject}&body=${body}`;
});
$('#year').textContent = new Date().getFullYear();

/* ---------- forma d'onda delle clip audio (disegnata una volta) ---------- */
(() => {
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const W = 400, H = 40; let d = '';
  for (let x = 0; x < W; x += 2) { const a = (0.25 + rnd() * 0.75) * (0.55 + 0.45 * Math.sin(x / 23)) * H / 2; d += `M${x} ${H / 2 - a}V${H / 2 + a}`; }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${d}" stroke="rgba(190,255,210,.75)" stroke-width="1.2"/></svg>`;
  document.querySelectorAll('.clip.a').forEach(c => c.style.setProperty('--wave', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`));
})();

/* ---------- mirino: timecode legato allo scroll + nome della scena ---------- */
const FPS = 25, TOTAL = 150 * FPS; // tutta la pagina = 2'30"
const tc = f => [f / (FPS * 3600), f / (FPS * 60) % 60, f / FPS % 60, f % FPS].map(n => String(Math.floor(n)).padStart(2, '0')).join(':');
const tcEl = $('.hud-tc'), sceneEl = $('.hud-scene'), hud = $('.hud');
let tcTick = false;
const updateTc = () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  tcEl.textContent = tc(Math.round((max > 0 ? scrollY / max : 0) * TOTAL));
  tcTick = false;
};
addEventListener('scroll', () => { if (!tcTick) { tcTick = true; requestAnimationFrame(updateTc); } }, { passive: true });
updateTc();

/* REC mentre scorri, STBY quando ti fermi; livelli audio legati alla velocita */
const recLabel = $('.rec-label'), meters = $$('.meters b');
let lastY = scrollY, idleT, level = 0, tilt = 0;
const setRec = on => { hud.classList.toggle('stby', !on); recLabel.textContent = on ? 'REC' : 'STBY'; };
setRec(false);
addEventListener('scroll', () => {
  setRec(true);
  clearTimeout(idleT);
  idleT = setTimeout(() => setRec(false), 1400);
}, { passive: true });
(function meter() {
  const dv = scrollY - lastY, v = Math.abs(dv); lastY = scrollY;
  tilt += (Math.max(-7, Math.min(7, dv * .12)) - tilt) * .12;
  hud.style.setProperty('--tilt', tilt.toFixed(2) + 'deg');
  level += (Math.min(1, v / 60 + .08) - level) * .25;
  meters.forEach((m, i) => m.style.setProperty('--l', Math.min(1, level * (0.85 + Math.random() * .3) + (i ? .02 : 0)).toFixed(3)));
  requestAnimationFrame(meter);
})();
const sceneIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    if (sceneEl.textContent !== e.target.dataset.scene) {
      sceneEl.textContent = e.target.dataset.scene;
      const clap = document.querySelector('.clap');
      clap.classList.remove('snap'); void clap.offsetWidth; clap.classList.add('snap');
    }
    hud.classList.toggle('cine-on', e.target.hasAttribute('data-cine'));
    // colore del mirino leggibile su ogni sezione (serve anche senza animazioni)
    const fg = e.target.dataset.bg === 'bone' ? '#0E0D0B' : '#EDE6DA';
    hud.style.color = fg; document.querySelector('.af').style.color = fg;
  });
}, { rootMargin: '-50% 0px -50% 0px' });
$$('[data-scene]').forEach(s => sceneIO.observe(s));

/* timecode che scorre sul segnaposto dello showreel */
const reelTc = $('.reel-tc');
if (reelTc) { let f = 0; setInterval(() => { f += 1; reelTc.textContent = tc(f); }, 1000 / FPS); }

/* ---------- versione senza animazioni ---------- */
if (!animate) {
  document.documentElement.classList.add('static');
  $('.loader').remove();
  document.body.classList.remove('loading');
  $$('[data-count]').forEach(el => (el.textContent = el.dataset.count));
  $$('.svc').forEach(s => s.addEventListener('click', () => { applyFilter(s.dataset.filter); $('#lavori').scrollIntoView(); }));
} else {
  gsap.registerPlugin(ScrollTrigger);
  gsap.config({ nullTargetWarn: false }); // la foto della camera e' opzionale

  /* smooth scroll */
  const lenis = typeof Lenis !== 'undefined' ? new Lenis({ lerp: 0.09 }) : null;
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const scrollTo = target => lenis ? lenis.scrollTo(target, { duration: 1.6 }) : $(target).scrollIntoView({ behavior: 'smooth' });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length > 1 && $(id)) { e.preventDefault(); scrollTo(id); }
    if (id === '#top') { e.preventDefault(); scrollTo(0); }
  }));
  $$('.svc').forEach(s => s.addEventListener('click', () => { applyFilter(s.dataset.filter); scrollTo('#lavori'); }));

  $$('[data-split]').forEach(split);
  gsap.set(document.body, { '--bg': COLORS.ink.bg, '--fg': COLORS.ink.fg });

  /* ---------- 1. ciak breve, la camera si accende, poi lo showreel ---------- */
  gsap.set('.hero-title .c', { yPercent: 110 });
  const clap = { f: 0 }, clapEl = $('.loader-tc');
  gsap.timeline()
    .to(clap, { f: 20, duration: .8, ease: 'none', onUpdate: () => (clapEl.textContent = tc(Math.round(clap.f))) })
    .set('.loader', { autoAlpha: 0 }, '+=.05')
    .add(() => {
      document.body.classList.remove('loading');
      $('.loader').remove();
      lenis && lenis.start();
    })
    .addLabel('boot')
    .from('.vf', { autoAlpha: 0, scale: 1.6, duration: .35, stagger: .06, ease: 'power3.out' }, 'boot')
    .from('.hud-grid', { autoAlpha: 0, duration: .5 }, 'boot+=.2')
    .from('.hud-cross', { autoAlpha: 0, scale: .4, duration: .4, ease: 'back.out(2)', clearProps: 'transform' }, 'boot+=.3')
    .from('.hud-level', { autoAlpha: 0, duration: .4 }, 'boot+=.3')
    .from('.hud-left > *, .hud-right > *', { autoAlpha: 0, duration: .01, stagger: .1 }, 'boot+=.4')
    // lo showreel si apre come un otturatore
    .fromTo('.reel-frame', { clipPath: 'inset(50% 0 50% 0)' }, { clipPath: 'inset(0% 0 0% 0)', duration: 1.1, ease: 'expo.inOut' }, 'boot+=.3');

  /* casi studio: immagine che si scopre e scene che entrano una dopo l'altra */
  $$('.case').forEach(cs => {
    gsap.fromTo($('.case-media', cs), { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'expo.inOut', scrollTrigger: { trigger: cs, start: 'top 75%' } });
    gsap.from($$('.case-scenes li', cs), { y: 40, autoAlpha: 0, duration: .9, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: $('.case-scenes', cs), start: 'top 85%' } });
  });
  gsap.from('.principles li', { x: -30, autoAlpha: 0, duration: .9, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.principles', start: 'top 85%' } });

  /* ---------- 3. colore di sfondo che cambia tra le sezioni ---------- */
  const setBg = key => gsap.to(document.body, { '--bg': COLORS[key].bg, '--fg': COLORS[key].fg, duration: .7, ease: 'power2.out', overwrite: 'auto' });

  /* ---------- 4. hero ---------- */
  ScrollTrigger.create({
    trigger: '.hero', start: 'top 70%', once: true,
    onEnter: () => gsap.to('.hero-title .c', { yPercent: 0, duration: 1, stagger: .015, ease: 'expo.out' })
  });
  gsap.from('.hero-row > *', { y: 40, opacity: 0, duration: 1, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.hero-row', start: 'top 92%' } });

  /* titoli spezzati */
  $$('[data-split]:not(.hero-title)').forEach(t => {
    gsap.from($$('.c', t), {
      yPercent: 110, duration: .9, stagger: .012, ease: 'expo.out',
      scrollTrigger: { trigger: t, start: 'top 85%' }
    });
    // messa a fuoco: il titolo entra sfocato e si mette a fuoco
    gsap.fromTo(t, { filter: 'blur(14px)' }, { filter: 'blur(0px)', duration: 1.3, ease: 'power2.out', scrollTrigger: { trigger: t, start: 'top 85%' } });
  });
  ScrollTrigger.create({
    trigger: '.hero', start: 'top 70%', once: true,
    onEnter: () => gsap.fromTo('.hero-title', { filter: 'blur(16px)' }, { filter: 'blur(0px)', duration: 1.4, ease: 'power2.out' })
  });

  /* ---------- 6. servizi: immagine che segue il cursore ---------- */
  const float = $('.svc-float'), floatImg = $('img', float);
  if (fine) {
    const fx = gsap.quickTo(float, 'x', { duration: .6, ease: 'power3' });
    const fy = gsap.quickTo(float, 'y', { duration: .6, ease: 'power3' });
    addEventListener('pointermove', e => { fx(e.clientX + 24); fy(e.clientY - float.offsetHeight / 2); });
    $$('.svc').forEach(s => {
      s.addEventListener('pointerenter', () => {
        floatImg.src = s.dataset.img;
        gsap.to(float, { opacity: 1, scale: 1, rotate: gsap.utils.random(-6, 6), duration: .5, ease: 'expo.out' });
      });
      s.addEventListener('pointerleave', () => gsap.to(float, { opacity: 0, scale: .6, duration: .4, ease: 'power3' }));
    });
    // se scorri via dalla lista, l'immagine sparisce anche senza muovere il mouse
    addEventListener('scroll', () => { if (!document.querySelector('.svc:hover')) gsap.to(float, { opacity: 0, scale: .6, duration: .3, overwrite: 'auto' }); }, { passive: true });
  }
  gsap.from('.svc', { y: 60, opacity: 0, duration: 1, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.svc-list', start: 'top 85%' } });

  /* ---------- 7. lavori: scroll orizzontale fissato (desktop) ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const track = $('.track');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const h = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '.works', pin: true, start: 'top top', end: () => '+=' + dist(), scrub: 1, invalidateOnRefresh: true, refreshPriority: 1 }
    });
    $$('.work').forEach(w => {
      gsap.fromTo($('.w-media', w), { clipPath: 'inset(100% 0 0 0)', filter: 'blur(12px)' }, {
        clipPath: 'inset(0% 0 0 0)', filter: 'blur(0px)', duration: 1.3, ease: 'expo.out',
        scrollTrigger: { trigger: w, containerAnimation: h, start: 'left 95%' }
      });
      gsap.fromTo($('img', w), { xPercent: -7 }, {
        xPercent: 7, ease: 'none',
        scrollTrigger: { trigger: w, containerAnimation: h, start: 'left right', end: 'right left', scrub: true }
      });
    });
  });
  mm.add('(max-width: 900px)', () => {
    $$('.work').forEach(w => {
      gsap.fromTo($('.w-media', w), { clipPath: 'inset(100% 0 0 0)', filter: 'blur(12px)' }, {
        clipPath: 'inset(0% 0 0 0)', filter: 'blur(0px)', duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: w, start: 'top 88%' }
      });
      gsap.fromTo($('img', w), { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: w, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });

  /* ---------- 8. chi sono ---------- */
  gsap.fromTo('.about-img-in', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: '.about-img', start: 'top 80%' } });
  gsap.fromTo('.about-img-in img', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.about-img', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.to('.about-img', { y: -80, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } });
  $$('[data-count]').forEach(el => {
    const o = { v: 0 };
    gsap.to(o, { v: +el.dataset.count, duration: 2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' }, onUpdate: () => (el.textContent = Math.round(o.v)) });
  });

  /* colori: creati dopo il pin, così le posizioni sono giuste */
  $$('[data-bg]').forEach(sec => {
    // se la sezione è fissata (pin) uso il suo contenitore, che include tutta la durata del pin
    const trg = sec.parentElement.classList.contains('pin-spacer') ? sec.parentElement : sec;
    ScrollTrigger.create({
      trigger: trg, start: 'top 50%', end: 'bottom 50%',
      onToggle: self => self.isActive && setBg(sec.dataset.bg)
    });
  });

  /* la camera segue un po' il mouse (uso "translate", cosi si somma all'oscillazione) */
  if (fine) {
    let nx = 0, ny = 0, cx = 0, cy = 0;
    addEventListener('pointermove', e => { nx = e.clientX / innerWidth - .5; ny = e.clientY / innerHeight - .5; }, { passive: true });
    gsap.ticker.add(() => {
      cx += (nx * 30 - cx) * .05; cy += (ny * 30 - cy) * .05;
      // ogni oggetto si sposta di una quantita diversa: sembra a profondita diverse
      [['.float-cam .cam-in', 1], ['.g-light .g-in', -.5], ['.g-gimbal .g-in', .7], ['.g-mic .g-in', -1.3]].forEach(([s, k]) => {
        const el = $(s); if (el) el.style.translate = `${(cx * k).toFixed(1)}px ${(cy * k).toFixed(1)}px`;
      });
    });
  }

  /* ---------- cursore autofocus: segue il mouse, si aggancia ai lavori e ai pulsanti ---------- */
  if (fine) {
    document.body.classList.add('has-af');
    const af = $('.af'), afLabel = $('.af-label');
    const SIZE = 46;
    let mx = innerWidth / 2, my = innerHeight / 2, target = null;
    const st = { x: mx, y: my, w: SIZE, h: SIZE };
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; af.classList.add('on'); }, { passive: true });
    document.addEventListener('pointerleave', () => af.classList.remove('on'));
    const lockables = '.work .w-media, a, button, .svc, input, select, textarea';
    document.addEventListener('pointerover', e => {
      const t = e.target.closest(lockables);
      target = t;
      af.classList.toggle('lock', !!t);
      afLabel.textContent = t && t.closest('.work') ? 'AF ● LOCK' : 'AF';
    });
    gsap.ticker.add(() => {
      let x, y, w, h;
      if (target && document.contains(target)) {
        const r = target.getBoundingClientRect(), pad = 6;
        x = r.left - pad; y = r.top - pad; w = r.width + pad * 2; h = r.height + pad * 2;
      } else { x = mx - SIZE / 2; y = my - SIZE / 2; w = SIZE; h = SIZE; }
      const k = target ? .22 : .35;
      st.x += (x - st.x) * k; st.y += (y - st.y) * k; st.w += (w - st.w) * k; st.h += (h - st.h) * k;
      af.style.transform = `translate(${st.x}px, ${st.y}px)`;
      af.style.width = st.w + 'px'; af.style.height = st.h + 'px';
    });
  }

  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  addEventListener('load', () => ScrollTrigger.refresh());
}
