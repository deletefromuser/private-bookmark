async function sha256(text) {
  if (!text) return '';
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function getStorage() {
  return new Promise(res => chrome.storage.local.get(['passwordHash'], r => res(r)));
}

function saveStorage(obj) {
  return new Promise(res => chrome.storage.local.set(obj, res));
}

document.getElementById('set-password').addEventListener('click', async () => {
  const pw = document.getElementById('new-password').value;
  if (!pw) return document.getElementById('status').textContent = 'Enter a password to set.';
  const hash = await sha256(pw);
  await saveStorage({ passwordHash: hash });
  document.getElementById('new-password').value = '';
  document.getElementById('status').textContent = 'Password set.';
});

document.getElementById('clear-password').addEventListener('click', async () => {
  const confirmed = confirm('Clear the password? This will allow anyone to open the View page without a password.');
  if (!confirmed) return;
  await saveStorage({ passwordHash: null });
  document.getElementById('status').textContent = 'Password cleared.';
});

// Initialize status
(async function(){
  const { passwordHash } = await getStorage();
  const status = document.getElementById('status');
  if (!passwordHash) status.textContent = 'No password set.';
  else status.textContent = 'Password is set.';
})();
