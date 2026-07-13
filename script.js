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

  const revealEls = document.querySelectorAll('.reveal');

  // ۱) ظاهرشدن نرم عناصر هنگام ورود به دید
  if (reduceMotion) {
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

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });

  onScroll();
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


// STRIPE-INSPIRED SYSTEM ? TARH 3 MOTION
(function () {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = document.querySelector('.hero');
  const diagram = document.querySelector('.flow-diagram');
  const navbar = document.querySelector('.navbar');

  const updateNavbar = function () {
    if (navbar) navbar.classList.toggle('is-scrolled', window.scrollY > 18);
  };
  updateNavbar();
  window.addEventListener('scroll', updateNavbar, { passive: true });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add('stripe-active');
      });
    }, { threshold: 0.14 });
    document.querySelectorAll('.section-animated').forEach(function (section) { observer.observe(section); });
  }

  if (!reduce && hero && diagram && window.matchMedia('(pointer:fine)').matches) {
    let frame = 0;
    hero.addEventListener('pointermove', function (event) {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () {
        const rect = hero.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        hero.style.setProperty('--pointer-x', (x * 100).toFixed(1) + '%');
        hero.style.setProperty('--pointer-y', (y * 100).toFixed(1) + '%');
        diagram.style.setProperty('--tilt-x', ((.5 - x) * 7).toFixed(2) + 'deg');
        diagram.style.setProperty('--tilt-y', ((y - .5) * 6).toFixed(2) + 'deg');
      });
    });
    hero.addEventListener('pointerleave', function () {
      hero.style.setProperty('--pointer-x', '50%');
      hero.style.setProperty('--pointer-y', '40%');
      diagram.style.setProperty('--tilt-x', '3deg');
      diagram.style.setProperty('--tilt-y', '-2deg');
    });
  }
})();


// LETTER GLITCH HERO ? TARH 3
(function(){
  const canvas=document.getElementById('letter-glitch-bg'),hero=document.querySelector('.hero');
  if(!canvas||!hero)return;
  const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=<>?/\[]{}()-_:;';
  const colors=['#0d5b46','#117b5b','#14956c','#1ab77f','#3ed49d','#7be8bd'];
  let w=1,h=1,dpr=1,cols=1,rows=1,cells=[],last=0,frame=0;
  function randomChar(){return chars[(Math.random()*chars.length)|0]}
  function reset(){
    const r=hero.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);w=Math.max(1,r.width);h=Math.max(1,r.height);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
    cols=Math.ceil(w/15)+2;rows=Math.ceil(h/19)+2;cells=Array.from({length:cols*rows},()=>({c:randomChar(),tone:(Math.random()*colors.length)|0,phase:Math.random()*6.28}));
  }
  function mutate(amount){for(let i=0;i<amount;i++){const n=(Math.random()*cells.length)|0;cells[n].c=randomChar();cells[n].tone=(Math.random()*colors.length)|0;cells[n].phase=Math.random()*6.28}}
  function draw(time){
    if(!reduced&&time-last<42){requestAnimationFrame(draw);return}last=time;frame++;
    if(!reduced)mutate(Math.max(8,(cells.length*.035)|0));
    ctx.fillStyle='#050908';ctx.fillRect(0,0,w,h);ctx.font='600 14px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const cell=cells[y*cols+x],pulse=.58+.42*Math.sin(frame*.08+cell.phase+x*.11+y*.07);
      ctx.globalAlpha=.28+pulse*.54;ctx.fillStyle=colors[cell.tone];ctx.fillText(cell.c,x*15+7,y*19+9);
    }
    ctx.globalAlpha=1;
    const shade=ctx.createLinearGradient(0,0,w,0);shade.addColorStop(0,'rgba(5,9,8,.18)');shade.addColorStop(.23,'rgba(5,9,8,.56)');shade.addColorStop(.56,'rgba(5,9,8,.38)');shade.addColorStop(1,'rgba(5,9,8,.2)');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
    const focus=ctx.createRadialGradient(w*.57,h*.42,0,w*.57,h*.42,Math.max(w,h)*.55);focus.addColorStop(0,'rgba(2,18,13,0)');focus.addColorStop(1,'rgba(1,7,5,.52)');ctx.fillStyle=focus;ctx.fillRect(0,0,w,h);
    if(!reduced)requestAnimationFrame(draw);
  }
  addEventListener('resize',()=>{reset();if(reduced)draw(0)});reset();reduced?draw(0):requestAnimationFrame(draw);
})();

// SCROLL STACK ? TARH 3
(function(){
  const stack=document.querySelector('[data-scroll-stack]');if(!stack)return;
  const cards=Array.from(stack.querySelectorAll('.scroll-stack-card'));if(!cards.length)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let ticking=false;
  cards.forEach(function(card,index){card.style.setProperty('--stack-index',index)});
  function update(){ticking=false;if(reduced)return;cards.forEach(function(card,index){const next=cards[index+1];if(!next){card.style.setProperty('--stack-scale','1');return}const r=card.getBoundingClientRect(),n=next.getBoundingClientRect(),target=104+index*16;const overlap=Math.max(0,Math.min(1,(target+r.height-n.top)/r.height));const scale=1-overlap*(.035+index*.004);card.style.setProperty('--stack-scale',scale.toFixed(4));card.style.filter='brightness('+(1-overlap*.12).toFixed(3)+')'})}
  function queue(){if(!ticking){ticking=true;requestAnimationFrame(update)}}
  addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue,{passive:true});update();
})();
