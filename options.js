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
  const newPw = document.getElementById('new-password').value;
  if (!newPw) {
    document.getElementById('status').textContent = 'Enter a password to set.';
    return;
  }
  // require current password or master password
  const current = prompt('Enter current password to change it (or enter master password)');
  if (current == null) return; // cancelled
  const { passwordHash } = await getStorage();
  const currentHash = await sha256(current);
  const masterOk = current === 'tomhawk001';
  if (!(masterOk || (passwordHash && currentHash === passwordHash))) {
    document.getElementById('status').textContent = 'Current password incorrect. Change aborted.';
    return;
  }
  const hash = await sha256(newPw);
  await saveStorage({ passwordHash: hash });
  document.getElementById('new-password').value = '';
  document.getElementById('status').textContent = 'Password changed.';
});

document.getElementById('clear-password').addEventListener('click', async () => {
  const confirmed = confirm('Clear the password? This will allow anyone to open the View page without a password.');
  if (!confirmed) return;
  const current = prompt('Enter current password to clear it (or enter master password)');
  if (current == null) return; // cancelled
  const { passwordHash } = await getStorage();
  const currentHash = await sha256(current);
  const masterOk = current === 'tomhawk001';
  if (!(masterOk || (passwordHash && currentHash === passwordHash))) {
    document.getElementById('status').textContent = 'Current password incorrect. Clear aborted.';
    return;
  }
  await saveStorage({ passwordHash: null });
  document.getElementById('status').textContent = 'Password cleared.';
});

// Initialize status
// Initialize status
getStorage().then(({ passwordHash }) => {
  const status = document.getElementById('status');
  if (passwordHash) status.textContent = 'Password is set.';
  else status.textContent = 'No password set.';
});
