const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;
const pointer = { x: -9999, y: -9999, active: false };
let party = false;

// ---------- chat assistant ----------
(function () {
  const body = document.getElementById('terminalBody');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const button = form.querySelector('button');
  const chips = document.querySelectorAll('.chip');

  const history = [];

  function addMessage(role, text) {
    const el = document.createElement('div');
    el.className = 'msg msg-' + role;
    el.textContent = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  function setBusy(busy) {
    input.disabled = busy;
    button.disabled = busy;
    chips.forEach((chip) => { chip.disabled = busy; });
  }

  async function sendMessage(text) {
    addMessage('user', text);
    history.push({ role: 'user', content: text });

    input.value = '';
    setBusy(true);
    const pending = addMessage('assistant', 'Thinking');
    pending.classList.add('msg-pending');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();

      if (!res.ok) {
        pending.className = 'msg msg-error';
        pending.textContent = data.error || 'Something went wrong.';
        return;
      }

      pending.className = 'msg msg-assistant';
      pending.textContent = data.reply;
      history.push({ role: 'assistant', content: data.reply });
    } catch (err) {
      pending.className = 'msg msg-error';
      pending.textContent = 'Could not reach the assistant. Try again in a moment.';
    } finally {
      setBusy(false);
      body.scrollTop = body.scrollHeight;
      input.focus();
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    sendMessage(text);
  });
  chips.forEach((chip) => chip.addEventListener('click', () => sendMessage(chip.textContent)));
})();

// ---------- pointer tracking, cursor glow, scroll progress ----------
(function () {
  const glow = document.getElementById('cursorGlow');
  const bar = document.getElementById('scrollBar');
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
    if (finePointer && !reduceMotion) {
      document.body.classList.add('has-pointer');
      glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    }
  }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.active = false; pointer.x = pointer.y = -9999; });
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ---------- interactive particle network ----------
(function () {
  const canvas = document.getElementById('field');
  const ctx = canvas.getContext('2d');
  const colors = ['94,234,212', '167,139,250', '56,189,248', '244,114,182'];
  let w, h, dpr, nodes = [], frame = 0, running = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(110, Math.round((w * h) / (w < 760 ? 16000 : 13000)));
    nodes = Array.from({ length: count }, (_, i) => nodes[i] || {
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.7, c: colors[i % colors.length],
    });
    if (!running) draw();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const link = w < 760 ? 100 : 135;
    const speed = party ? 3 : 1;
    for (const n of nodes) {
      if (!reduceMotion) {
        const dx = n.x - pointer.x, dy = n.y - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < 22000 && d2 > 1) { const f = (22000 - d2) / 22000 * 0.9; const d = Math.sqrt(d2); n.vx += dx / d * f; n.vy += dy / d * f; }
        n.vx *= 0.96; n.vy *= 0.96;
        n.vx += (Math.random() - 0.5) * 0.02; n.vy += (Math.random() - 0.5) * 0.02;
        n.x += n.vx * speed + Math.sign(n.vx) * 0.12; n.y += n.vy * speed + Math.sign(n.vy) * 0.12;
        if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;
      }
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < link) {
          ctx.strokeStyle = `rgba(${party ? colors[(i + frame / 6 | 0) % 4] : a.c},${(1 - d / link) * 0.22})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      const pd = Math.hypot(a.x - pointer.x, a.y - pointer.y);
      if (pd < 190) {
        ctx.strokeStyle = `rgba(${a.c},${(1 - pd / 190) * 0.5})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
      }
      ctx.fillStyle = `rgba(${a.c},${party ? 1 : 0.75})`;
      ctx.beginPath(); ctx.arc(a.x, a.y, party ? a.r * 1.8 : a.r, 0, Math.PI * 2); ctx.fill();
    }
    frame++;
  }

  function loop() {
    if (!running) return;
    draw();
    requestAnimationFrame(loop);
  }
  function setRunning(on) {
    if (reduceMotion || on === running) return;
    running = on;
    if (on) requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => setRunning(!document.hidden));
  resize();
  setRunning(true);
})();

// ---------- typing headline ----------
(function () {
  const el = document.getElementById('typed');
  if (reduceMotion) return;
  const words = ['machine learning systems', 'AI agents that do research', 'fast Rust inference', 'data pipelines that scale', 'things people actually use'];
  let w = 0, i = words[0].length, deleting = true;
  function tick() {
    const word = words[w];
    if (deleting) {
      i--;
      el.textContent = word.slice(0, i);
      if (i === 0) { deleting = false; w = (w + 1) % words.length; }
      setTimeout(tick, 32);
    } else {
      const next = words[w];
      i++;
      el.textContent = next.slice(0, i);
      if (i === next.length) { deleting = true; setTimeout(tick, 2200); } else setTimeout(tick, 55 + Math.random() * 45);
    }
  }
  setTimeout(tick, 2600);
})();

// ---------- tilt, spotlight, magnetic buttons ----------
(function () {
  if (!finePointer || reduceMotion) return;
  document.querySelectorAll('.tilt').forEach((card) => {
    const max = card.classList.contains('terminal') ? 3 : card.classList.contains('project-flagship') ? 2.5 : 6;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.classList.add('is-tilting');
      card.style.setProperty('--mx', px * 100 + '%');
      card.style.setProperty('--my', py * 100 + '%');
      card.style.setProperty('--ry', (px - 0.5) * 2 * max + 'deg');
      card.style.setProperty('--rx', (0.5 - py) * 2 * max + 'deg');
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
  document.querySelectorAll('.magnetic').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  });
})();

// ---------- reveals, counters, active nav ----------
(function () {
  const sections = document.querySelectorAll('.page-section, .stats, .flagships .project');
  const counters = document.querySelectorAll('[data-count]');
  function count(el) {
    const target = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0);
    const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    const start = performance.now(), dur = 1600;
    (function step(now) {
      const t = Math.min(1, (now - start) / dur), eased = 1 - Math.pow(1 - t, 4);
      el.textContent = pre + (target * eased).toFixed(dec) + suf;
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }
  if (!('IntersectionObserver' in window) || reduceMotion) {
    document.body.classList.add('no-motion');
    return;
  }
  document.querySelectorAll('.project-grid, .edu-list, .principles, .stats').forEach((group) => {
    [...group.children].forEach((child, i) => { child.classList.add('reveal-child'); child.style.setProperty('--d', i * 0.08 + 's'); });
  });
  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      entry.target.querySelectorAll('[data-count]').forEach(count);
      reveal.unobserve(entry.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -60px 0px' });
  sections.forEach((section) => {
    if (!section.classList.contains('stats')) section.classList.add('reveal');
    reveal.observe(section);
  });
  counters.forEach((el) => { el.textContent = (el.dataset.prefix || '') + (0).toFixed(+(el.dataset.decimals || 0)) + (el.dataset.suffix || ''); });

  const nav = document.querySelectorAll('.masthead-nav a');
  const active = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      nav.forEach((link) => {
        if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-10% 0px -65% 0px' });
  document.querySelectorAll('.page-section, .hero').forEach((section) => active.observe(section));
})();

// ---------- easter egg: Konami code, or tap the SL. logo five times ----------
(function () {
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  const toast = document.getElementById('toast');
  let pos = 0, taps = 0, tapTimer;
  function toggleParty() {
    party = !party;
    document.body.classList.toggle('party', party);
    toast.textContent = party ? '🎉 Party mode! Do it again to stop.' : 'Party mode off.';
    toast.classList.add('show');
    clearTimeout(toast.hideTimer);
    toast.hideTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = key === code[pos] ? pos + 1 : key === code[0] ? 1 : 0;
    if (pos === code.length) { pos = 0; toggleParty(); }
  });
  document.getElementById('mark').addEventListener('click', () => {
    taps++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { taps = 0; }, 1200);
    if (taps >= 5) { taps = 0; toggleParty(); }
  });
})();
