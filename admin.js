const s = window.SmartMessDemo.requireSession('admin');
if (!s) throw new Error('No session');

let html5QrCode = null;
let scanning = false;

const who = document.getElementById('who');
const btnLogout = document.getElementById('btnLogout');
const targetDate = document.getElementById('targetDate');
const kpisEl = document.getElementById('kpis');
const aggEl = document.getElementById('agg');
const invEl = document.getElementById('inv');
const popularEl = document.getElementById('popular');
const ratingsEl = document.getElementById('ratings');

const mealSelect = document.getElementById('mealSelect');
const scanCardInput = document.getElementById('scanCardInput');
const noShowReason = document.getElementById('noShowReason');
const btnMarkAttend = document.getElementById('btnMarkAttend');
const btnMarkNoShow = document.getElementById('btnMarkNoShow');
const btnToggleScan = document.getElementById('btnToggleScan');
const msg = document.getElementById('msg');

who.textContent = `${s.name} • ${s.cardId}`;
btnLogout.addEventListener('click', () => window.SmartMessDemo.logout());

function setMsg(text, kind) {
  msg.textContent = text || '';
  msg.classList.remove('error', 'ok', 'warn');
  if (kind) msg.classList.add(kind);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function capitalize(x) {
  return x ? x[0].toUpperCase() + x.slice(1) : x;
}

function render() {
  const db = window.SmartMessDemo.seedIfNeeded();
  const dateIso = window.SmartMessDemo.tomorrowIso();
  targetDate.textContent = dateIso;

  const k = window.SmartMessDemo.kpisForDate(db, dateIso);
  kpisEl.innerHTML = `
    <div class="box"><div class="label">Total bookings</div><div class="value">${k.totalBookings}</div></div>
    <div class="box"><div class="label">Attended</div><div class="value">${k.attended}</div></div>
    <div class="box"><div class="label">No-shows</div><div class="value">${k.noShow}</div></div>
    <div class="box"><div class="label">Waste %</div><div class="value">${k.wastePct}%</div></div>
  `;

  const agg = window.SmartMessDemo.aggregatesForDate(db, dateIso);
  const rows = Object.values(agg).sort((a, b) => a.meal.mealType.localeCompare(b.meal.mealType));

  // Demand aggregation
  aggEl.innerHTML = rows
    .map((r) => {
      const dishLines = Object.entries(r.dishCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([dish, count]) => `<li><strong>${escapeHtml(dish)}</strong>: ${count}</li>`)
        .join('');

      const noShows = db.bookings
        .filter((b) => b.mealId === r.meal.id && b.status === 'no-show')
        .map((b) => b.cardId)
        .join(', ');

      return `
        <div class="card" style="margin-top:12px;">
          <h3>${capitalize(r.meal.mealType)} (${r.meal.date})</h3>
          <div class="split">
            <span class="pill good">Bookings: ${r.totalBookings}</span>
            <span class="pill">Attended: ${r.attended}</span>
            <span class="pill bad">No-show: ${r.noShow}</span>
          </div>
          <p class="muted" style="margin-top:10px;">Dish-wise demand:</p>
          <ul>${dishLines || '<li class="muted">No dish selections yet.</li>'}</ul>
          <p class="muted">No-show students (card IDs): <code>${escapeHtml(noShows || '-')}</code></p>
        </div>
      `;
    })
    .join('');

  // Inventory planning (portion × bookings)
  invEl.innerHTML = rows
    .map((r) => {
      const required = window.SmartMessDemo.inventoryForMeal(r.meal, r.totalBookings);
      const list = required
        .map(
          (x) =>
            `<li><strong>${escapeHtml(x.ingredientName)}</strong>: ${x.quantity} ${escapeHtml(x.unit)}</li>`
        )
        .join('');
      return `
        <div class="card" style="margin-top:12px;">
          <h3>${capitalize(r.meal.mealType)}</h3>
          <p class="muted">Servings planned: <strong>${r.totalBookings}</strong></p>
          <ul>${list || '<li class="muted">No ingredient plan configured.</li>'}</ul>
        </div>
      `;
    })
    .join('');

  // Attendance meal dropdown
  mealSelect.innerHTML = rows
    .map((r) => `<option value="${r.meal.id}">${capitalize(r.meal.mealType)} (${r.meal.date})</option>`)
    .join('');

  // Popular dishes
  const popular = window.SmartMessDemo.popularDishes(db, 5);
  popularEl.innerHTML = popular.length
    ? `<ol>${popular.map((p) => `<li><strong>${escapeHtml(p.dish)}</strong> — ${p.count}</li>`).join('')}</ol>`
    : `<p class="muted">No dish selections yet.</p>`;

  // Ratings
  const ra = window.SmartMessDemo.ratingAnalytics(db, 5);
  const mealsById = Object.fromEntries(db.meals.map((m) => [m.id, m]));
  ratingsEl.innerHTML = ra.length
    ? `<ol>${ra
        .map((r) => {
          const m = mealsById[r.mealId];
          const label = m ? `${capitalize(m.mealType)} (${m.date})` : r.mealId;
          return `<li><strong>${escapeHtml(label)}</strong> — Avg: ${r.avg} (${r.count})</li>`;
        })
        .join('')}</ol>`
    : `<p class="muted">No feedback yet.</p>`;

  setMsg('', null);
}

function markAttendance(kind, cardIdRaw, mealId) {
  const db = window.SmartMessDemo.loadDb() || window.SmartMessDemo.seedIfNeeded();
  const cardId = (cardIdRaw || '').trim();
  if (!cardId) return setMsg('Scan or type a Card ID.', 'error');

  const user = window.SmartMessDemo.findUserByCard(db, cardId);
  if (!user || user.role !== 'student') return setMsg('Student not found for this card.', 'error');

  const booking = window.SmartMessDemo.getBooking(db, mealId, cardId);
  if (!booking || !['booked', 'attended', 'no-show'].includes(booking.status)) {
    return setMsg('No booking found for this meal (not planned).', 'error');
  }

  if (kind === 'attend') {
    window.SmartMessDemo.upsertBooking(db, {
      mealId,
      cardId,
      status: 'attended',
      attendedAt: window.SmartMessDemo.nowIso(),
      noShowReason: null
    });
    window.SmartMessDemo.saveDb(db);
    setMsg('Attendance recorded.', 'ok');
  } else {
    const reason = (noShowReason.value || '').trim();
    window.SmartMessDemo.upsertBooking(db, {
      mealId,
      cardId,
      status: 'no-show',
      attendedAt: window.SmartMessDemo.nowIso(),
      noShowReason: reason || 'Not specified'
    });
    window.SmartMessDemo.saveDb(db);
    setMsg('Marked as no-show.', 'warn');
  }

  render();
}

btnMarkAttend.addEventListener('click', () => markAttendance('attend', scanCardInput.value, mealSelect.value));
btnMarkNoShow.addEventListener('click', () => markAttendance('noshow', scanCardInput.value, mealSelect.value));

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
        scanCardInput.value = decodedText;
        // default: mark attended quickly
        markAttendance('attend', decodedText, mealSelect.value);
      }
    );
    setMsg('Scanner started. Scan student card.', 'ok');
  } catch (err) {
    scanning = false;
    btnToggleScan.textContent = 'Start Camera Scan';
    setMsg('Camera scan failed. Allow permission or type the code.', 'error');
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

render();

