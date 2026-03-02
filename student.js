const s = window.SmartMessDemo.requireSession('student');
if (!s) throw new Error('No session');

const who = document.getElementById('who');
const btnLogout = document.getElementById('btnLogout');
const menuDate = document.getElementById('menuDate');
const menuTableBody = document.querySelector('#menuTable tbody');
const msg = document.getElementById('msg');

const feedbackMeal = document.getElementById('feedbackMeal');
const rating = document.getElementById('rating');
const comment = document.getElementById('comment');
const btnSubmitFeedback = document.getElementById('btnSubmitFeedback');
const msgFb = document.getElementById('msgFb');

who.textContent = `${s.name} • ${s.cardId}`;

btnLogout.addEventListener('click', () => window.SmartMessDemo.logout());

function setMsg(el, text, kind) {
  el.textContent = text || '';
  el.classList.remove('error', 'ok', 'warn');
  if (kind) el.classList.add(kind);
}

function cancellationDeadline(dateIso) {
  // previous day 22:00
  const d = new Date(`${dateIso}T00:00:00`);
  d.setDate(d.getDate() - 1);
  d.setHours(22, 0, 0, 0);
  return d;
}

function render() {
  const db = window.SmartMessDemo.seedIfNeeded();
  const dateIso = window.SmartMessDemo.tomorrowIso();
  menuDate.textContent = dateIso;

  const meals = window.SmartMessDemo.getMealsForDate(db, dateIso).sort((a, b) =>
    a.mealType.localeCompare(b.mealType)
  );

  menuTableBody.innerHTML = '';
  meals.forEach((meal) => {
    const booking = window.SmartMessDemo.getBooking(db, meal.id, s.cardId);
    const status = booking ? booking.status : 'not-booked';

    const tr = document.createElement('tr');
    const dishOptions = meal.dishes
      .map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`)
      .join('');

    const bookingText =
      status === 'booked'
        ? `Booked (${booking.selectedDishName || '—'})`
        : status === 'cancelled'
          ? 'Cancelled'
          : status === 'attended'
            ? 'Attended'
            : status === 'no-show'
              ? 'No-show'
              : 'Not booked';

    const canCancel = status === 'booked' && new Date() <= cancellationDeadline(meal.date);
    const canBook = !booking || status === 'cancelled';

    tr.innerHTML = `
      <td><strong>${capitalize(meal.mealType)}</strong></td>
      <td>${meal.dishes.map(escapeHtml).join('<br/>')}</td>
      <td>${bookingText}</td>
      <td>
        ${
          canBook
            ? `
            <div class="split">
              <select data-meal="${meal.id}" class="dishSelect">
                ${dishOptions}
              </select>
              <button class="btn primary btnBook" data-meal="${meal.id}">Book</button>
            </div>
          `
            : ''
        }
        ${
          canCancel
            ? `<button class="btn danger btnCancel" data-meal="${meal.id}">Cancel</button>`
            : ''
        }
        ${
          status === 'booked' && !canCancel
            ? `<span class="pill warn">Cancel deadline passed</span>`
            : ''
        }
      </td>
    `;

    menuTableBody.appendChild(tr);
  });

  // Feedback meal dropdown (use tomorrow meals for demo)
  feedbackMeal.innerHTML = meals
    .map((m) => `<option value="${m.id}">${capitalize(m.mealType)} (${m.date})</option>`)
    .join('');
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

menuTableBody.addEventListener('click', (e) => {
  const btnBook = e.target.closest('.btnBook');
  const btnCancel = e.target.closest('.btnCancel');
  const db = window.SmartMessDemo.loadDb() || window.SmartMessDemo.seedIfNeeded();

  if (btnBook) {
    const mealId = btnBook.dataset.meal;
    const sel = menuTableBody.querySelector(`select.dishSelect[data-meal="${mealId}"]`);
    const selectedDishName = sel ? sel.value : null;

    window.SmartMessDemo.upsertBooking(db, {
      mealId,
      cardId: s.cardId,
      selectedDishName,
      status: 'booked',
      bookedAt: window.SmartMessDemo.nowIso()
    });
    window.SmartMessDemo.saveDb(db);
    setMsg(msg, 'Meal booked successfully (demand signal recorded).', 'ok');
    render();
    return;
  }

  if (btnCancel) {
    const mealId = btnCancel.dataset.meal;
    const meal = db.meals.find((m) => m.id === mealId);
    const deadline = cancellationDeadline(meal.date);
    if (new Date() > deadline) {
      setMsg(msg, 'Cancellation deadline has passed for this meal.', 'error');
      render();
      return;
    }

    const existing = window.SmartMessDemo.getBooking(db, mealId, s.cardId);
    if (!existing || existing.status !== 'booked') {
      setMsg(msg, 'No active booking to cancel.', 'error');
      render();
      return;
    }

    window.SmartMessDemo.upsertBooking(db, {
      mealId,
      cardId: s.cardId,
      status: 'cancelled',
      cancelledAt: window.SmartMessDemo.nowIso()
    });
    window.SmartMessDemo.saveDb(db);
    setMsg(msg, 'Booking cancelled successfully.', 'ok');
    render();
  }
});

btnSubmitFeedback.addEventListener('click', () => {
  const db = window.SmartMessDemo.loadDb() || window.SmartMessDemo.seedIfNeeded();
  const mealId = feedbackMeal.value;
  const r = Number(rating.value);

  if (!mealId || !r) {
    setMsg(msgFb, 'Select a meal and rating.', 'error');
    return;
  }

  window.SmartMessDemo.setFeedback(db, {
    mealId,
    cardId: s.cardId,
    rating: r,
    comment: comment.value.trim(),
    createdAt: window.SmartMessDemo.nowIso()
  });
  window.SmartMessDemo.saveDb(db);
  setMsg(msgFb, 'Feedback saved. Thank you!', 'ok');
});

render();

