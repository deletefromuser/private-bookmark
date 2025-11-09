// Simple in-page modal helpers returning Promises
(function(){
  function createModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">
      <div class="modal-content"></div>
      <div class="modal-actions"></div>
    </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  function cleanup(modal) {
    modal.remove();
  }

  function showConfirm(message) {
    return new Promise(res => {
      const modal = createModal();
      modal.querySelector('.modal-content').textContent = message;
      const actions = modal.querySelector('.modal-actions');
      const ok = document.createElement('button'); ok.textContent = 'OK';
      const cancel = document.createElement('button'); cancel.textContent = 'Cancel';
      actions.appendChild(ok); actions.appendChild(cancel);
      ok.focus();
      ok.addEventListener('click', () => { cleanup(modal); res(true); });
      cancel.addEventListener('click', () => { cleanup(modal); res(false); });
    });
  }

  function showTextPrompt(message, defaultValue='') {
    return new Promise(res => {
      const modal = createModal();
      const content = modal.querySelector('.modal-content');
      content.innerHTML = `<div class="modal-msg">${message}</div>`;
      const input = document.createElement('input'); input.type='text'; input.value = defaultValue; input.style.width = '100%';
      content.appendChild(input);
      const actions = modal.querySelector('.modal-actions');
      const ok = document.createElement('button'); ok.textContent = 'OK';
      const cancel = document.createElement('button'); cancel.textContent = 'Cancel';
      actions.appendChild(ok); actions.appendChild(cancel);
      input.focus(); input.select();
      ok.addEventListener('click', () => { cleanup(modal); res(input.value); });
      cancel.addEventListener('click', () => { cleanup(modal); res(null); });
      input.addEventListener('keydown', (ev) => { if (ev.key==='Enter') ok.click(); if (ev.key==='Escape') cancel.click(); });
    });
  }

  function showForm(fields) {
    // fields: [{name,label,value,placeholder}]
    return new Promise(res => {
      const modal = createModal();
      const content = modal.querySelector('.modal-content');
      fields.forEach(f => {
        const label = document.createElement('div'); label.textContent = f.label; content.appendChild(label);
        const input = document.createElement('input'); input.type='text'; input.name = f.name; input.value = f.value || ''; input.placeholder = f.placeholder || '';
        input.style.width='100%'; content.appendChild(input);
      });
      const inputs = content.querySelectorAll('input'); if (inputs[0]) inputs[0].focus();
      const actions = modal.querySelector('.modal-actions');
      const ok = document.createElement('button'); ok.textContent = 'OK';
      const cancel = document.createElement('button'); cancel.textContent = 'Cancel';
      actions.appendChild(ok); actions.appendChild(cancel);
      ok.addEventListener('click', () => {
        const out = {}; inputs.forEach(i => out[i.name] = i.value);
        cleanup(modal); res(out);
      });
      cancel.addEventListener('click', () => { cleanup(modal); res(null); });
      modal.addEventListener('keydown', (ev) => { if (ev.key==='Escape') cancel.click(); });
      inputs.forEach(i => i.addEventListener('keydown', (ev) => { if (ev.key==='Enter') ok.click(); }));
    });
  }

  window._modal = { showConfirm, showTextPrompt, showForm };
})();
