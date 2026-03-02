let html5QrCode = null;
let scanning = false;

const screenLogin = document.getElementById('screenLogin');
const screenDetails = document.getElementById('screenDetails');
const screenDone = document.getElementById('screenDone');

const barcodeInput = document.getElementById('barcodeInput');
const btnContinue = document.getElementById('btnContinue');
const btnToggleScan = document.getElementById('btnToggleScan');
const msgLogin = document.getElementById('msgLogin');

const cardIdLabel = document.getElementById('cardIdLabel');
const role = document.getElementById('role');
const studentId = document.getElementById('studentId');
const nameEl = document.getElementById('name');
const department = document.getElementById('department');
const year = document.getElementById('year');
const hostel = document.getElementById('hostel');
const btnSave = document.getElementById('btnSave');
const btnBack = document.getElementById('btnBack');
const msgDetails = document.getElementById('msgDetails');

const savedJson = document.getElementById('savedJson');
const btnRestart = document.getElementById('btnRestart');

function show(el) {
  el.hidden = false;
}
function hide(el) {
  el.hidden = true;
}

function setMsg(el, text, kind) {
  el.textContent = text || '';
  el.classList.remove('error', 'ok');
  if (kind) el.classList.add(kind);
}

function goToDetails(cardId) {
  const v = (cardId || '').trim();
  if (!v) {
    setMsg(msgLogin, 'Please scan or type the barcode first.', 'error');
    return;
  }
  cardIdLabel.textContent = v;
  hide(screenLogin);
  show(screenDetails);
  hide(screenDone);

  // Pre-fill demo values based on common patterns
  if (v.toUpperCase().startsWith('ADMIN')) {
    role.value = 'admin';
  } else {
    role.value = 'student';
  }

  setMsg(msgDetails, '', null);
}

btnContinue.addEventListener('click', () => goToDetails(barcodeInput.value));
barcodeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') goToDetails(barcodeInput.value);
});

async function startScanner() {
  if (scanning) return;
  scanning = true;
  btnToggleScan.textContent = 'Stop Camera Scan';
  setMsg(msgLogin, '', null);

  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode('reader');
  }

  try {
    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (decodedText) => {
        barcodeInput.value = decodedText;
        goToDetails(decodedText);
      }
    );
    setMsg(msgLogin, 'Scanner started. Scan your card.', 'ok');
  } catch (err) {
    scanning = false;
    btnToggleScan.textContent = 'Start Camera Scan';
    setMsg(
      msgLogin,
      'Camera scan failed. Allow camera permission, or type the barcode manually.',
      'error'
    );
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

btnBack.addEventListener('click', () => {
  hide(screenDetails);
  show(screenLogin);
  hide(screenDone);
  setMsg(msgLogin, '', null);
});

btnSave.addEventListener('click', () => {
  const cardId = cardIdLabel.textContent.trim();
  if (!cardId) return;

  const payload = {
    cardId,
    role: role.value,
    studentId: studentId.value.trim(),
    name: nameEl.value.trim(),
    department: department.value.trim(),
    year: year.value,
    hostel: hostel.value.trim(),
    savedAt: new Date().toISOString()
  };

  if (!payload.name) {
    setMsg(msgDetails, 'Please enter your name.', 'error');
    return;
  }
  if (payload.role === 'student' && !payload.studentId) {
    setMsg(msgDetails, 'Please enter your Student ID.', 'error');
    return;
  }

  localStorage.setItem('smartMessDemo:lastProfile', JSON.stringify(payload, null, 2));
  savedJson.textContent = JSON.stringify(payload, null, 2);

  hide(screenLogin);
  hide(screenDetails);
  show(screenDone);
});

btnRestart.addEventListener('click', () => {
  barcodeInput.value = '';
  studentId.value = '';
  nameEl.value = '';
  department.value = '';
  hostel.value = '';
  role.value = 'student';
  year.value = '1';

  hide(screenDetails);
  hide(screenDone);
  show(screenLogin);
  setMsg(msgLogin, 'Ready. Scan another card.', 'ok');
});

