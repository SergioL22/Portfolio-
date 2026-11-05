(function () {
  const body = document.getElementById('terminalBody');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const button = form.querySelector('button');

  const history = [];

  function addMessage(role, text) {
    const el = document.createElement('div');
    el.className = 'msg msg-' + role;
    el.textContent = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  async function sendMessage(text) {
    addMessage('user', text);
    history.push({ role: 'user', content: text });

    input.value = '';
    input.disabled = true;
    button.disabled = true;
    const pending = addMessage('assistant', '...');

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

      pending.textContent = data.reply;
      history.push({ role: 'assistant', content: data.reply });
    } catch (err) {
      pending.className = 'msg msg-error';
      pending.textContent = 'Could not reach the assistant. Try again in a moment.';
    } finally {
      input.disabled = false;
      button.disabled = false;
      input.focus();
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    sendMessage(text);
  });
})();

// Reveal sections as they enter the viewport; content stays visible without JS.
(function () {
  const sections = document.querySelectorAll('.page-section');
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        reveal.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px -50px 0px' });
  sections.forEach((section) => { section.classList.add('reveal'); reveal.observe(section); });
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
  sections.forEach((section) => active.observe(section));
})();
