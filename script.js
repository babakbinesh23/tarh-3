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

// SIDE RAYS ? vanilla WebGL adaptation of supplied ReactBits config
(function(){
  const canvas=document.getElementById('side-rays-bg'),hero=document.querySelector('.hero');if(!canvas||!hero)return;
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true});if(!gl)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vert='attribute vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}';
  const frag='precision highp float;uniform float iTime;uniform vec2 iResolution;uniform float iSpeed;uniform vec3 iRayColor1;uniform vec3 iRayColor2;uniform float iIntensity;uniform float iSpread;uniform float iFlipX;uniform float iFlipY;uniform float iTilt;uniform float iSaturation;uniform float iBlend;uniform float iFalloff;uniform float iOpacity;float rayStrength(vec2 raySource,vec2 rayRefDirection,vec2 coord,float seedA,float seedB,float speed){vec2 sourceToCoord=coord-raySource;float cosAngle=dot(normalize(sourceToCoord),rayRefDirection);return clamp((0.45+0.15*sin(cosAngle*seedA+iTime*speed))+(0.3+0.2*cos(-cosAngle*seedB+iTime*speed)),0.0,1.0)*clamp((iResolution.x-length(sourceToCoord))/iResolution.x,0.5,1.0);}void main(){vec2 fragCoord=gl_FragCoord.xy;if(iFlipX>0.5)fragCoord.x=iResolution.x-fragCoord.x;if(iFlipY>0.5)fragCoord.y=iResolution.y-fragCoord.y;vec2 coord=vec2(fragCoord.x,iResolution.y-fragCoord.y);vec2 rayPos=vec2(iResolution.x*1.1,-0.5*iResolution.y);float tiltRad=iTilt*3.14159265/180.0;float cs=cos(tiltRad),sn=sin(tiltRad);vec2 rel=coord-rayPos;vec2 tiltedCoord=vec2(rel.x*cs-rel.y*sn,rel.x*sn+rel.y*cs)+rayPos;float halfSpread=iSpread*0.275;vec2 rayRefDir1=normalize(vec2(cos(0.785398+halfSpread),sin(0.785398+halfSpread)));vec2 rayRefDir2=normalize(vec2(cos(0.785398-halfSpread),sin(0.785398-halfSpread)));vec4 rays1=vec4(iRayColor1,1.0)*rayStrength(rayPos,rayRefDir1,tiltedCoord,36.2214,21.11349,iSpeed);vec4 rays2=vec4(iRayColor2,1.0)*rayStrength(rayPos,rayRefDir2,tiltedCoord,22.3991,18.0234,iSpeed*0.2);vec4 color=rays1*(1.0-iBlend)*0.9+rays2*iBlend*0.9;float distanceToLight=length(fragCoord.xy-vec2(rayPos.x,iResolution.y-rayPos.y))/iResolution.y;float brightness=iIntensity*0.4/pow(max(distanceToLight,0.001),iFalloff);color.rgb*=brightness;float gray=dot(color.rgb,vec3(0.299,0.587,0.114));color.rgb=mix(vec3(gray),color.rgb,iSaturation);color.a=max(color.r,max(color.g,color.b))*iOpacity;gl_FragColor=color;}';
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.error('Side Rays shader:',gl.getShaderInfoLog(s));return null}return s}
  const vs=shader(gl.VERTEX_SHADER,vert),fs=shader(gl.FRAGMENT_SHADER,frag);if(!vs||!fs)return;const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS)){console.error('Side Rays program:',gl.getProgramInfoLog(program));return}gl.useProgram(program);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const u={};['iTime','iResolution','iSpeed','iRayColor1','iRayColor2','iIntensity','iSpread','iFlipX','iFlipY','iTilt','iSaturation','iBlend','iFalloff','iOpacity'].forEach(n=>u[n]=gl.getUniformLocation(program,n));
  gl.uniform1f(u.iSpeed,2.5);gl.uniform3f(u.iRayColor1,234/255,179/255,8/255);gl.uniform3f(u.iRayColor2,150/255,200/255,1);gl.uniform1f(u.iIntensity,2);gl.uniform1f(u.iSpread,2);gl.uniform1f(u.iFlipX,0);gl.uniform1f(u.iFlipY,0);gl.uniform1f(u.iTilt,0);gl.uniform1f(u.iSaturation,1.5);gl.uniform1f(u.iBlend,.75);gl.uniform1f(u.iFalloff,1.6);gl.uniform1f(u.iOpacity,1);
  let dpr=1,w=1,h=1,raf=0,visible=true,start=performance.now();function resize(){const r=hero.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);w=Math.max(1,Math.round(r.width));h=Math.max(1,Math.round(r.height));canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(program);gl.uniform2f(u.iResolution,canvas.width,canvas.height)}
  function draw(now){if(!visible)return;gl.useProgram(program);gl.uniform1f(u.iTime,(now-start)*.001);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);if(!reduced)raf=requestAnimationFrame(draw)}
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible&&!reduced&&!raf)raf=requestAnimationFrame(draw);if(!visible&&raf){cancelAnimationFrame(raf);raf=0}},{threshold:.1});observer.observe(hero);addEventListener('resize',()=>{resize();if(reduced)draw(start)});resize();reduced?draw(start):raf=requestAnimationFrame(draw);
})();
