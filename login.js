let html5QrCode = null;
let scanning = false;

const barcodeInput = document.getElementById('barcodeInput');
const btnLogin = document.getElementById('btnLogin');
const btnToggleScan = document.getElementById('btnToggleScan');
const btnReset = document.getElementById('btnReset');
const msg = document.getElementById('msg');

function setMsg(text, kind) {
  msg.textContent = text || '';
  msg.classList.remove('error', 'ok', 'warn');
  if (kind) msg.classList.add(kind);
}

function ensureSeed() {
  return window.SmartMessDemo.seedIfNeeded();
}

function doLogin(cardId) {
  const db = ensureSeed();
  const v = (cardId || '').trim();
  if (!v) return setMsg('Please scan or type a Card ID.', 'error');

  const user = window.SmartMessDemo.findUserByCard(db, v);
  if (!user) return setMsg('Invalid card. User not found in demo DB.', 'error');

  window.SmartMessDemo.setSession({
    cardId: user.cardId,
    role: user.role,
    name: user.name,
    studentId: user.studentId
  });

  setMsg('Login success. Redirecting...', 'ok');
  window.location.href = user.role === 'admin' ? './admin.html' : './student.html';
}

btnLogin.addEventListener('click', () => doLogin(barcodeInput.value));
barcodeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin(barcodeInput.value);
});

async function startScanner() {
  if (scanning) return;
  scanning = true;
  btnToggleScan.textContent = 'Stop Camera Scan';
  setMsg('', null);

  if (!html5QrCode) html5QrCode = new Html5Qrcode('reader');

  try {
    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (decodedText) => {
        barcodeInput.value = decodedText;
        doLogin(decodedText);
      }
    );
    setMsg('Scanner started. Scan your card.', 'ok');
  } catch (err) {
    scanning = false;
    btnToggleScan.textContent = 'Start Camera Scan';
    setMsg('Camera scan failed. Allow camera permission or type the code.', 'error');
  }
}

async function stopScanner() {
  if (!html5QrCode || !scanning) return;
  try {
    await html5QrCode.stop();
    await html5QrCode.clear();
  } catch (_) {
    // ignore
  } finally {
    scanning = false;
    btnToggleScan.textContent = 'Start Camera Scan';
  }
}

btnToggleScan.addEventListener('click', () => {
  if (scanning) stopScanner();
  else startScanner();
});

btnReset.addEventListener('click', () => {
  localStorage.removeItem(window.SmartMessDemo.DB_KEY);
  localStorage.removeItem(window.SmartMessDemo.SESSION_KEY);
  setMsg('Demo DB reset. Login again.', 'warn');
});

// Seed on load so meals exist
ensureSeed();

