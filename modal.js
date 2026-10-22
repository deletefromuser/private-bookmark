// Simple in-page modal helpers returning Promises
(function () {
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
    return new Promise((res) => {
      const modal = createModal();
      modal.querySelector('.modal-content').textContent = message;
      const actions = modal.querySelector('.modal-actions');
      const ok = document.createElement('button');
      ok.textContent = 'OK';
      const cancel = document.createElement('button');
      cancel.textContent = 'Cancel';
      actions.appendChild(ok);
      actions.appendChild(cancel);
      ok.focus();
      ok.addEventListener('click', () => {
        cleanup(modal);
        res(true);
      });
      cancel.addEventListener('click', () => {
        cleanup(modal);
        res(false);
      });
    });
  }

  function showTextPrompt(message, defaultValue = '') {
    return new Promise((res) => {
      const modal = createModal();
      const content = modal.querySelector('.modal-content');
      content.innerHTML = `<div class="modal-msg">${message}</div>`;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = defaultValue;
      input.style.width = '100%';
      content.appendChild(input);
      const actions = modal.querySelector('.modal-actions');
      const ok = document.createElement('button');
      ok.textContent = 'OK';
      const cancel = document.createElement('button');
      cancel.textContent = 'Cancel';
      actions.appendChild(ok);
      actions.appendChild(cancel);
      input.focus();
      input.select();
      ok.addEventListener('click', () => {
        cleanup(modal);
        res(input.value);
      });
      cancel.addEventListener('click', () => {
        cleanup(modal);
        res(null);
      });
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') ok.click();
        if (ev.key === 'Escape') cancel.click();
      });
    });
  }

  window._modal = { showConfirm, showTextPrompt };
})();
