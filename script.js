/* ============================================================
   برقتو — منطق ماشین‌حساب، FAQ، اعتبارسنجی فرم و شمارنده آمار
   ============================================================
   ضرایب تخمینی — قابل ویرایش. مقادیر واقعی بازار را اینجا به‌روزرسانی کنید.
*/
const CONFIG = {
  // ساعت تولید معادل سالانه به ازای هر کیلووات ظرفیت (kWh در سال به ازای هر kW)
  SPECIFIC_YIELD: {
    ongrid: 1600, // آنگرید
    hybrid: 1450  // هیبرید (بخشی از انرژی صرف ذخیره/مصرف می‌شود)
  },
  // نرخ خرید تضمینی دولت (ریال به ازای هر کیلووات‌ساعت)
  GUARANTEED_RATE: 4000,
  // ضریب افزایش درآمد در فروش از طریق برقتو نسبت به خرید تضمینی
  BARGHTO_UPLIFT: 1.35
};

// ------- ابزار اعداد فارسی -------
const faDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
function toFa(str) {
  return String(str).replace(/\d/g, d => faDigits[d]);
}
function formatNumber(n) {
  return toFa(Math.round(n).toLocaleString('en-US'));
}
function formatToman(rials) {
  const toman = rials / 10;
  return formatNumber(toman) + ' تومان';
}
function easeOutExpo(t) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}
function animateCalcValue(el, target, formatter) {
  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    el.textContent = formatter(target);
    return;
  }
  const duration = 950;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = formatter(target * easeOutExpo(progress));
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ------- ماشین‌حساب -------
const calcForm = document.getElementById('calc-form');
if (calcForm) {
  calcForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const rawCapacity = parseFloat(document.getElementById('capacity').value);
    const unit = document.getElementById('capacity-unit').value;
    const type = document.getElementById('plant-type').value;

    if (!rawCapacity || rawCapacity <= 0) {
      document.getElementById('capacity').classList.add('invalid');
      document.getElementById('capacity').focus();
      return;
    }
    document.getElementById('capacity').classList.remove('invalid');

    // تبدیل به کیلووات
    const capacityKw = unit === 'mw' ? rawCapacity * 1000 : rawCapacity;

    const yieldPerKw = CONFIG.SPECIFIC_YIELD[type] || CONFIG.SPECIFIC_YIELD.ongrid;
    const annualProduction = capacityKw * yieldPerKw;             // kWh در سال
    const guaranteedIncome = annualProduction * CONFIG.GUARANTEED_RATE;
    const barghtoIncome = guaranteedIncome * CONFIG.BARGHTO_UPLIFT;
    const diff = barghtoIncome - guaranteedIncome;

    const rProduction = document.getElementById('r-production');
    const rGuaranteed = document.getElementById('r-guaranteed');
    const rBarghto = document.getElementById('r-barghto');
    const rDiff = document.getElementById('r-diff');

    animateCalcValue(rProduction, annualProduction, formatNumber);
    animateCalcValue(rGuaranteed, guaranteedIncome, formatToman);
    animateCalcValue(rBarghto, barghtoIncome, formatToman);
    animateCalcValue(rDiff, diff, value => '+ ' + formatToman(value));

    document.querySelectorAll('#calc-results .result-row').forEach(function (row, i) {
      row.classList.remove('result-pop', 'diff-pulse');
      void row.offsetWidth;
      row.style.animationDelay = (i * 0.08) + 's';
      row.classList.add('result-pop');
      if (row.classList.contains('diff')) row.classList.add('diff-pulse');
    });
  });
}

// ------- آکاردئون FAQ -------
document.querySelectorAll('.faq-q').forEach(function (btn) {
  btn.addEventListener('click', function () {
    const item = btn.closest('.faq-item');
    const answer = item.querySelector('.faq-a');
    const isOpen = item.classList.contains('open');

    // بستن بقیه
    document.querySelectorAll('.faq-item.open').forEach(function (other) {
      if (other !== item) {
        other.classList.remove('open');
        other.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
        other.querySelector('.faq-a').style.maxHeight = null;
      }
    });

    if (isOpen) {
      item.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      answer.style.maxHeight = null;
    } else {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  });
});

// ------- اعتبارسنجی فرم بررسی -------
const lead = document.getElementById('lead');
if (lead) {
  const mobileRegex = /^09\d{9}$/;

  function setError(id, msg) {
    const field = document.getElementById(id);
    const errEl = lead.querySelector('.error[data-for="' + id + '"]');
    if (msg) {
      field.classList.add('invalid');
      if (errEl) errEl.textContent = msg;
    } else {
      field.classList.remove('invalid');
      if (errEl) errEl.textContent = '';
    }
  }

  // تبدیل ارقام فارسی/عربی به لاتین برای اعتبارسنجی موبایل
  function normalizeDigits(s) {
    return s.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
            .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  }

  lead.addEventListener('submit', function (e) {
    e.preventDefault();
    let valid = true;

    const name = document.getElementById('l-name').value.trim();
    if (name.length < 2) { setError('l-name', 'نام را وارد کنید.'); valid = false; }
    else setError('l-name', '');

    const mobile = normalizeDigits(document.getElementById('l-mobile').value.trim());
    if (!mobileRegex.test(mobile)) { setError('l-mobile', 'شماره موبایل معتبر وارد کنید (۰۹xxxxxxxxx).'); valid = false; }
    else setError('l-mobile', '');

    const capacity = parseFloat(normalizeDigits(document.getElementById('l-capacity').value));
    if (!capacity || capacity <= 0) { setError('l-capacity', 'ظرفیت نیروگاه را وارد کنید.'); valid = false; }
    else setError('l-capacity', '');

    const province = document.getElementById('l-province').value;
    if (!province) { setError('l-province', 'استان را انتخاب کنید.'); valid = false; }
    else setError('l-province', '');

    const status = document.getElementById('l-status').value;
    if (!status) { setError('l-status', 'وضعیت نیروگاه را انتخاب کنید.'); valid = false; }
    else setError('l-status', '');

    if (valid) {
      const submitBtn = lead.querySelector('button[type="submit"]');
      const reduce = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      function finish() {
        if (submitBtn) submitBtn.classList.remove('is-loading');
        lead.querySelectorAll('input, select, button').forEach(el => el.setAttribute('disabled', 'disabled'));
        const success = document.getElementById('lead-success');
        success.hidden = false;
        success.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      }

      // نمایش کوتاه حالت «در حال ارسال» پیش از پیام موفقیت
      if (reduce) {
        finish();
      } else {
        if (submitBtn) submitBtn.classList.add('is-loading');
        setTimeout(finish, 900);
      }
    }
  });
}

// ------- شمارنده کارت‌های آمار -------
function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const suffix = el.dataset.suffix || '';
  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // در حالت کاهش حرکت، عدد نهایی بدون انیمیشن نمایش داده می‌شود
  if (reduceMotion) {
    el.textContent = toFa(Math.round(target).toLocaleString('en-US')) + suffix;
    return;
  }

  const duration = 1700;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = easeOutExpo(progress);
    const current = Math.round(target * eased);
    el.textContent = toFa(current.toLocaleString('en-US')) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const statNumbers = document.querySelectorAll('.stat-number');
if (statNumbers.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  statNumbers.forEach(el => observer.observe(el));
} else {
  statNumbers.forEach(animateCounter);
}

// ------- افکت‌های اسکرول (Scroll Reveal + Progress + Parallax) -------
(function () {
  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const enhancedMotion = !reduceMotion && window.gsap && window.ScrollTrigger;

  const revealEls = document.querySelectorAll('.reveal');

  // ۱) ظاهرشدن نرم عناصر هنگام ورود به دید
  if (enhancedMotion) {
    // GSAP initializes these elements after the solar text has been prepared.
  } else if (reduceMotion) {
    revealEls.forEach(el => el.classList.add('in-view'));
  } else if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in-view'));
  }

  // ۲) نوار پیشرفت اسکرول + پارالاکس ملایم هیرو
  const progressBar = document.getElementById('scroll-progress');
  const heroVisual = document.querySelector('.hero-visual');
  let ticking = false;

  function onScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;

    if (progressBar) {
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = pct + '%';
    }

    if (heroVisual && !reduceMotion && scrollTop < window.innerHeight) {
      heroVisual.style.transform = 'translateY(' + (scrollTop * 0.12) + 'px)';
    }

    ticking = false;
  }

  if (!enhancedMotion) {
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(onScroll);
        ticking = true;
      }
    }, { passive: true });

    onScroll();
  }
})();

// SOLAR MOTION SYSTEM — lightweight, dependency-free interaction layer
(function () {
  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Floating photons in the hero.
  const particleField = document.getElementById('solar-particles');
  if (particleField && !reduceMotion) {
    const colors = ['#ffb21c', '#c8ff72', '#57e49b', '#63d8ff'];
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 38; i += 1) {
      const particle = document.createElement('i');
      particle.className = 'solar-particle';
      particle.style.setProperty('--x', (Math.random() * 96).toFixed(2) + '%');
      particle.style.setProperty('--y', (18 + Math.random() * 78).toFixed(2) + '%');
      particle.style.setProperty('--s', (1.5 + Math.random() * 3.5).toFixed(2) + 'px');
      particle.style.setProperty('--d', (5 + Math.random() * 7).toFixed(2) + 's');
      particle.style.setProperty('--delay', (-Math.random() * 10).toFixed(2) + 's');
      particle.style.setProperty('--dx', (-60 + Math.random() * 120).toFixed(0) + 'px');
      particle.style.setProperty('--c', colors[i % colors.length]);
      fragment.appendChild(particle);
    }
    particleField.appendChild(fragment);
  }

  // Floating live-energy labels around the solar network diagram.
  const heroVisual = document.querySelector('.hero-visual');
  const flowDiagram = heroVisual && heroVisual.querySelector('.flow-diagram');
  if (flowDiagram && !flowDiagram.querySelector('.energy-chip')) {
    const chipRow = document.createElement('div');
    chipRow.className = 'energy-chip-row';
    const chipOne = document.createElement('div');
    chipOne.className = 'energy-chip energy-chip--one';
    chipOne.innerHTML = '<span>☀</span><span><b>زنده</b> تولید خورشیدی</span>';
    const chipTwo = document.createElement('div');
    chipTwo.className = 'energy-chip energy-chip--two';
    chipTwo.innerHTML = '<span>↗</span><span><b>۳۵٪+</b> بازده فروش</span>';
    chipRow.append(chipOne, chipTwo);
    flowDiagram.insertBefore(chipRow, flowDiagram.firstChild);
  }

  // Word-by-word blur reveal while preserving nested accent styling.
  function splitWords(element) {
    if (!element || element.dataset.solarSplit === 'true') return;
    element.dataset.solarSplit = 'true';
    element.setAttribute('aria-label', element.textContent.trim());
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue.trim()) textNodes.push(walker.currentNode);
    }
    let wordIndex = 0;
    textNodes.forEach(function (textNode) {
      const words = textNode.nodeValue.trim().split(/\s+/);
      const part = document.createDocumentFragment();
      words.forEach(function (word) {
        const span = document.createElement('span');
        span.className = 'solar-word';
        span.textContent = word;
        span.setAttribute('aria-hidden', 'true');
        span.style.setProperty('--word-index', wordIndex);
        wordIndex += 1;
        part.appendChild(span);
      });
      textNode.parentNode.replaceChild(part, textNode);
    });
  }

  const heroTitle = document.querySelector('.hero h1');
  splitWords(heroTitle);
  const kineticTitles = document.querySelectorAll('.section-head h2, .note-card h2');
  kineticTitles.forEach(splitWords);
  if (reduceMotion || !('IntersectionObserver' in window)) {
    kineticTitles.forEach(function (title) { title.classList.add('solar-text-ready'); });
  } else {
    const titleObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('solar-text-ready');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .35, rootMargin: '0px 0px -8% 0px' });
    kineticTitles.forEach(function (title) { titleObserver.observe(title); });
  }

  // Cursor sunlight and dark-glass navigation state.
  const hero = document.querySelector('.hero');
  const navbar = document.querySelector('.navbar');
  let pointerFrame = 0;
  if (hero && !reduceMotion && window.matchMedia('(pointer:fine)').matches) {
    hero.addEventListener('pointermove', function (event) {
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      pointerFrame = requestAnimationFrame(function () {
        const rect = hero.getBoundingClientRect();
        hero.style.setProperty('--hero-x', (((event.clientX - rect.left) / rect.width) * 100).toFixed(1) + '%');
        hero.style.setProperty('--hero-y', (((event.clientY - rect.top) / rect.height) * 100).toFixed(1) + '%');
      });
    });
  }
  function updateNav() {
    if (navbar) navbar.classList.toggle('is-scrolled', window.scrollY > 20);
  }
  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });

  if (!reduceMotion && window.matchMedia('(pointer:fine)').matches) {
    // Spotlight follows the pointer across interactive surfaces.
    document.querySelectorAll('.note-card, .calc-card, .lead-card, .stat-card, .faq-item').forEach(function (card) {
      card.addEventListener('pointermove', function (event) {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', (event.clientX - rect.left) + 'px');
        card.style.setProperty('--mouse-y', (event.clientY - rect.top) + 'px');
      });
    });

    // ReactBits-style subtle depth without a runtime dependency.
    document.querySelectorAll('.flow-diagram, .stat-card, .note-card').forEach(function (card) {
      card.addEventListener('pointermove', function (event) {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        card.style.transform = 'perspective(900px) rotateX(' + (-y * 5).toFixed(2) + 'deg) rotateY(' + (x * 7).toFixed(2) + 'deg) translateY(-5px)';
      });
      card.addEventListener('pointerleave', function () {
        card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)';
      });
    });

    // Magnetic CTA movement kept intentionally small for usability.
    document.querySelectorAll('.btn').forEach(function (button) {
      button.addEventListener('pointermove', function (event) {
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        button.style.transform = 'translate(' + (x * .08).toFixed(1) + 'px,' + (y * .12).toFixed(1) + 'px)';
      });
      button.addEventListener('pointerleave', function () { button.style.transform = ''; });
    });
  }
})();

// NATURAL MOTION ENGINE — GSAP + ScrollTrigger + Lenis
(function () {
  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !window.gsap || !window.ScrollTrigger) return;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  document.body.classList.add('motion-powered');

  // Lenis keeps wheel motion fluid while native touch scrolling remains familiar.
  if (window.Lenis) {
    const lenis = new window.Lenis({
      duration: 1.12,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.9,
      anchors: { offset: -84 }
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    window.__barghtoLenis = lenis;
  }

  const progressBar = document.getElementById('scroll-progress');
  if (progressBar) {
    gsap.set(progressBar, { scaleX: 0, transformOrigin: 'right center' });
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: function (self) { gsap.set(progressBar, { scaleX: self.progress }); }
    });
  }

  // First impression: a calm, cinematic sequence instead of simultaneous motion.
  const heroContent = document.querySelector('.hero-content');
  const heroVisual = document.querySelector('.hero-visual');
  const heroWords = gsap.utils.toArray('.hero h1 .solar-word');
  const heroTimeline = gsap.timeline({ defaults: { ease: 'power3.out' } });

  if (heroContent) gsap.set(heroContent, { autoAlpha: 1, x: 0, y: 0 });
  if (heroVisual) gsap.set(heroVisual, { autoAlpha: 1, x: 0, y: 0 });

  heroTimeline
    .from('.hero .badge', { autoAlpha: 0, y: 16, duration: 0.6 })
    .fromTo(heroWords,
      { autoAlpha: 0, y: 34, rotateX: -32, filter: 'blur(9px)' },
      { autoAlpha: 1, y: 0, rotateX: 0, filter: 'blur(0px)', duration: 0.78, stagger: 0.045 },
      '-=0.3')
    .from('.hero-lead', { autoAlpha: 0, y: 20, duration: 0.7 }, '-=0.48')
    .from('.hero-cta .btn', { autoAlpha: 0, y: 18, duration: 0.58, stagger: 0.09 }, '-=0.42')
    .from('.hero-metrics span', { autoAlpha: 0, y: 14, duration: 0.5, stagger: 0.07 }, '-=0.34');

  if (heroVisual) {
    heroTimeline.from(heroVisual, { autoAlpha: 0, x: -54, scale: 0.94, duration: 1.05 }, 0.18);
  }

  // Each section enters once with direction-aware movement and a restrained stagger.
  gsap.utils.toArray('.reveal').forEach(function (element) {
    if (element === heroContent || element === heroVisual) return;

    const isStagger = element.classList.contains('reveal-stagger');
    const fromX = element.classList.contains('reveal-right') ? 48 :
      element.classList.contains('reveal-left') ? -48 : 0;
    const fromScale = element.classList.contains('reveal-zoom') ? 0.94 : 1;

    gsap.set(element, { autoAlpha: 1, x: 0, y: 0, scale: 1 });
    if (isStagger && element.children.length) {
      gsap.fromTo(element.children,
        { autoAlpha: 0, y: 28 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.72,
          stagger: 0.075,
          ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 86%', once: true }
        });
    } else {
      gsap.fromTo(element,
        { autoAlpha: 0, x: fromX, y: fromX ? 0 : 30, scale: fromScale },
        {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.82,
          ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 87%', once: true }
        });
    }
  });

  // Solar layers move at different speeds, creating depth without heavy 3D rendering.
  gsap.to('.solar-orb', {
    yPercent: 22,
    scale: 1.06,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 }
  });
  gsap.to('.solar-rays', {
    rotation: 7,
    yPercent: 10,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.1 }
  });
  gsap.to('.solar-horizon', {
    yPercent: -8,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.3 }
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); }, { once: true });
})();

// ------- Radial Burst — انفجار شعاعی متحرک پشت هیرو -------
(function () {
  const canvas = document.getElementById('burst-canvas');
  if (!canvas) return;

  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ctx = canvas.getContext('2d');
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  let origin = { x: 0, y: 0 };
  let rays = [];

  // پالت خورشیدی برقتو
  const COLORS = [
    [255, 138, 0],   // نارنجی
    [255, 193, 7],   // زرد
    [22, 163, 74]    // سبز
  ];

  function lerpColor(c, t) {
    // t=0 پایه رنگ، t=1 روشن‌تر
    const r = Math.round(c[0] + (255 - c[0]) * t);
    const g = Math.round(c[1] + (255 - c[1]) * t);
    const b = Math.round(c[2] + (255 - c[2]) * t);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function resize() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // مبدأ: پایین-وسط بوم (مثل تصویر مرجع، شعاع‌ها به سمت بالا باز می‌شوند)
    origin = { x: W / 2, y: H * 1.02 };
    buildRays();
  }

  function buildRays() {
    rays = [];
    const count = Math.max(60, Math.min(180, Math.round(W / 8)));
    const maxLen = Math.hypot(W / 2, H) * 1.05;
    for (let i = 0; i < count; i++) {
      // زاویه در نیم‌دایره بالایی: از -180 تا 0 درجه
      const angle = Math.PI + (i / (count - 1)) * Math.PI +
        (Math.random() - 0.5) * 0.02;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      rays.push({
        angle: angle,
        length: maxLen * (0.45 + Math.random() * 0.55),
        width: 0.6 + Math.random() * 1.6,
        color: color,
        // پارامترهای انیمیشن
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.8,
        grow: 0.6 + Math.random() * 0.4
      });
    }
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    const t = now * 0.001;

    for (let i = 0; i < rays.length; i++) {
      const ray = rays[i];
      // ضربان طول: خطوط نرم بلند و کوتاه می‌شوند
      const pulse = 0.75 + 0.25 * Math.sin(t * ray.speed + ray.phase);
      const len = ray.length * ray.grow * pulse;
      const ex = origin.x + Math.cos(ray.angle) * len;
      const ey = origin.y + Math.sin(ray.angle) * len;

      // گرادیانت روشنایی در طول خط
      const grad = ctx.createLinearGradient(origin.x, origin.y, ex, ey);
      grad.addColorStop(0, lerpColor(ray.color, 0.15));
      grad.addColorStop(1, lerpColor(ray.color, 0.65));

      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = grad;
      ctx.lineWidth = ray.width;
      ctx.globalAlpha = 0.55 * pulse;
      ctx.stroke();

      // نقطه سر خط
      ctx.beginPath();
      ctx.arc(ex, ey, ray.width * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = lerpColor(ray.color, 0.4);
      ctx.globalAlpha = 0.8 * pulse;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (!reduceMotion) requestAnimationFrame(draw);
  }

  window.addEventListener('resize', function () {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    resize();
    if (reduceMotion) draw(0);
  });

  resize();
  if (reduceMotion) {
    draw(0); // یک فریم ثابت
  } else {
    requestAnimationFrame(draw);
  }
})();

// ------- موج تعاملی (ripple) روی دکمه‌ها -------
(function () {
  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.btn');
    if (!btn || btn.classList.contains('is-loading')) return;

    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', function () { ripple.remove(); });
  });
})();
