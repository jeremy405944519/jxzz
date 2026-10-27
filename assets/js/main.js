/* =========================================================
   JXZZ · 交互
   ========================================================= */
(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 导航：滚动状态 + 进度条 ---------- */
  const nav = document.getElementById('nav');
  const progress = document.getElementById('progress');
  let lastY = -1;

  function onScroll() {
    const y = window.scrollY;
    if (y === lastY) return;
    lastY = y;
    nav.classList.toggle('scrolled', y > 24);

    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(y / max, 1) : 0;
      progress.style.transform = 'scaleX(' + p + ')';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---------- 移动端菜单 ---------- */
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');

  function closeMenu() {
    links.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });

  links.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- 滚动揭示（同级错峰） ---------- */
  const revealEls = Array.from(document.querySelectorAll('.reveal'));

  if (prefersReduced || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('show'));
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const siblings = Array.from(el.parentElement.children).filter((n) =>
          n.classList.contains('reveal')
        );
        const idx = Math.max(0, siblings.indexOf(el));
        el.style.transitionDelay = Math.min(idx * 90, 540) + 'ms';
        el.classList.add('show');
        obs.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- 数字滚动 ---------- */
  function animateCount(el) {
    const target = parseFloat(el.dataset.count || '0');
    const suffix = el.dataset.suffix || '';
    if (!target) { el.textContent = '0' + suffix; return; }

    if (prefersReduced) { el.textContent = target + suffix; return; }

    const dur = 1500;
    const start = performance.now();

    function frame(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  const counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => cio.observe(el));
  } else {
    counters.forEach(animateCount);
  }

  /* ---------- 导航高亮当前板块 ---------- */
  const sections = Array.from(document.querySelectorAll('section[id]'));
  const navMap = new Map();
  links.querySelectorAll('a[href^="#"]').forEach((a) => {
    navMap.set(a.getAttribute('href').slice(1), a);
  });

  function setActive(id) {
    navMap.forEach((a, key) => {
      a.classList.toggle('is-active', key === id);
    });
  }

  if ('IntersectionObserver' in window) {
    const sio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => sio.observe(s));
  }

  /* ---------- 联系表单：校验 + 写入云数据库 ---------- */
  const form = document.getElementById('contactForm');
  const hint = document.getElementById('formHint');

  if (form) {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const nameEl = document.getElementById('name');
    const companyEl = document.getElementById('company');
    const emailEl = document.getElementById('email');
    const messageEl = document.getElementById('message');
    const submitBtn = form.querySelector('button[type="submit"]');
    let submitLabel = submitBtn ? submitBtn.textContent : '';
    const COOLDOWN_MS = 30000;
    let sending = false;

    // 云服务按 Origin 校验，镜像站（GitHub Pages 等）无法写库，
    // 此时表单降级为邮件发送，同一份代码两处都能用
    const canSubmit = !(window.JXZZ && window.JXZZ.canSubmit === false);

    function setHint(msg, type) {
      hint.textContent = msg;
      hint.className = 'form__hint' + (type ? ' ' + type : '');
    }

    function setSending(on) {
      sending = on;
      if (!submitBtn) return;
      submitBtn.disabled = on;
      submitBtn.textContent = on ? '提交中…' : submitLabel;
    }

    function fallbackTip() {
      const mail = window.JXZZ && window.JXZZ.fallbackEmail;
      return mail ? '或直接邮件联系 ' + mail + '。' : '请稍后再试。';
    }

    function describeError(err) {
      const code = (err && (err.code || err.status)) || '';
      if (code === '23514' || code === '22001') return '内容长度超出限制，请精简后再提交。';
      if (code === '23505') return '该留言已提交过，请勿重复提交。';
      if (code === '42501') return '当前环境不允许提交，请稍后再试，' + fallbackTip();
      if (code === '42P01') return '留言服务暂未就绪，请稍后再试，' + fallbackTip();
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return '网络连接已断开，请检查网络后重试。';
      }
      return '提交失败，请稍后重试，' + fallbackTip();
    }

    function cooldownLeft() {
      try {
        const last = Number(window.localStorage.getItem('jxzz_contact_last') || 0);
        return Math.max(0, COOLDOWN_MS - (Date.now() - last));
      } catch (e) {
        return 0;
      }
    }

    function markSent() {
      try {
        window.localStorage.setItem('jxzz_contact_last', String(Date.now()));
      } catch (e) {
        /* 隐私模式下不可写，忽略 */
      }
    }

    /* 镜像站兜底：把表单内容拼成邮件，交给客户端发送 */
    function submitByMail() {
      const mail = (window.JXZZ && window.JXZZ.fallbackEmail) || '';
      const name = nameEl.value.trim();
      const company = companyEl.value.trim();
      const email = emailEl.value.trim();
      const message = messageEl.value.trim();

      const subject = '官网留言 · ' + name;
      const lines = [
        '姓名：' + name,
        company ? '公司：' + company : '',
        '邮箱：' + email,
        message ? '需求：' + message : ''
      ].filter(Boolean);

      const href =
        'mailto:' + mail +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(lines.join('\n'));

      window.location.href = href;
      setHint('已为你打开邮件客户端，发送后我们会在 1 个工作日内回复。', 'ok');
    }

    async function submitMessage() {
      if (!canSubmit) {
        submitByMail();
        return;
      }

      const cloud = window.JXZZ && window.JXZZ.cloud;
      if (!cloud) {
        setHint('云端服务未加载成功，请刷新页面后重试，' + fallbackTip(), 'err');
        return;
      }

      const wait = cooldownLeft();
      if (wait > 0) {
        setHint('已提交过，请 ' + Math.ceil(wait / 1000) + ' 秒后再试。', 'err');
        return;
      }

      setSending(true);
      setHint('正在提交…', '');

      // 不发送 owner_id / created_at：由数据库默认值接管
      const payload = {
        name: nameEl.value.trim(),
        email: emailEl.value.trim(),
        source: 'website'
      };
      const company = companyEl.value.trim();
      const message = messageEl.value.trim();
      if (company) payload.company = company;
      if (message) payload.message = message;

      let error = null;
      try {
        const res = await cloud.database.from('contact_messages').insert(payload);
        error = res && res.error ? res.error : null;
      } catch (err) {
        error = err || { message: 'unknown' };
      }

      setSending(false);

      if (error) {
        setHint(describeError(error), 'err');
        return;
      }

      markSent();
      setHint('提交成功，我们会在 1 个工作日内与您联系。', 'ok');
      form.reset();
    }

    // 镜像站：提示留言走邮件，按钮文案同步调整
    if (!canSubmit) {
      const note = document.getElementById('formNote');
      if (note) note.hidden = false;
      if (submitBtn) {
        submitLabel = '通过邮件发送';
        submitBtn.textContent = submitLabel;
      }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (sending) return;

      nameEl.classList.remove('invalid');
      emailEl.classList.remove('invalid');

      if (!nameEl.value.trim()) {
        nameEl.classList.add('invalid');
        nameEl.focus();
        setHint('请填写您的姓名', 'err');
        return;
      }

      if (!emailRe.test(emailEl.value.trim())) {
        emailEl.classList.add('invalid');
        emailEl.focus();
        setHint('请填写有效的邮箱地址', 'err');
        return;
      }

      submitMessage();
    });

    form.querySelectorAll('input, textarea').forEach((el) => {
      el.addEventListener('input', () => {
        el.classList.remove('invalid');
        if (hint.textContent) setHint('', '');
      });
    });
  }
})();
