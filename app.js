// Smart Mess demo-full
// This is a standalone (no-server) version of the full flow.
// It uses localStorage as a mock database so you can open the HTML files directly.

const DB_KEY = 'smartMessDemoFull:db:v1';
const SESSION_KEY = 'smartMessDemoFull:session:v1';

function todayAtMidnight(d = new Date()) {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
}

function isoDate(d) {
  // YYYY-MM-DD
  return new Date(d).toISOString().slice(0, 10);
}

function tomorrowIso() {
  const t = todayAtMidnight();
  t.setDate(t.getDate() + 1);
  return isoDate(t);
}

function nowIso() {
  return new Date().toISOString();
}

function loadDb() {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) return JSON.parse(raw);
  return null;
}

function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function seedIfNeeded() {
  const existing = loadDb();
  if (existing) return existing;

  const tmr = tomorrowIso();
  const db = {
    users: [
      { cardId: 'ADMIN123', role: 'admin', name: 'Mess Admin', studentId: null },
      { cardId: 'STU1001', role: 'student', name: 'Alice Student', studentId: 'S1001' },
      { cardId: 'STU1002', role: 'student', name: 'Bob Student', studentId: 'S1002' }
    ],
    meals: [
      {
        id: `${tmr}:breakfast`,
        date: tmr,
        mealType: 'breakfast',
        dishes: ['Idli & Sambar', 'Poha'],
        ingredientPlan: [
          { ingredientName: 'Rice', unit: 'kg', quantityPerServing: 0.12 },
          { ingredientName: 'Lentils', unit: 'kg', quantityPerServing: 0.05 }
        ]
      },
      {
        id: `${tmr}:lunch`,
        date: tmr,
        mealType: 'lunch',
        dishes: ['Rice & Curry', 'Curd Rice'],
        ingredientPlan: [
          { ingredientName: 'Rice', unit: 'kg', quantityPerServing: 0.18 },
          { ingredientName: 'Vegetables', unit: 'kg', quantityPerServing: 0.1 }
        ]
      },
      {
        id: `${tmr}:dinner`,
        date: tmr,
        mealType: 'dinner',
        dishes: ['Chapati & Dal', 'Pulao'],
        ingredientPlan: [
          { ingredientName: 'Wheat Flour', unit: 'kg', quantityPerServing: 0.12 },
          { ingredientName: 'Vegetables', unit: 'kg', quantityPerServing: 0.08 }
        ]
      }
    ],
    bookings: [
      // { mealId, cardId, selectedDishName, status, bookedAt, attendedAt, noShowReason }
    ],
    feedback: [
      // { mealId, cardId, rating, comment, createdAt }
    ],
    history: [
      // Aggregated snapshots for trend demo
    ]
  };

  saveDb(db);
  return db;
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function findUserByCard(db, cardId) {
  return db.users.find((u) => u.cardId === cardId) || null;
}

function upsertUser(db, user) {
  const idx = db.users.findIndex((u) => u.cardId === user.cardId);
  if (idx >= 0) db.users[idx] = { ...db.users[idx], ...user };
  else db.users.push(user);
}

function getMealsForDate(db, dateIso) {
  return db.meals.filter((m) => m.date === dateIso);
}

function getBooking(db, mealId, cardId) {
  return db.bookings.find((b) => b.mealId === mealId && b.cardId === cardId) || null;
}

function upsertBooking(db, booking) {
  const idx = db.bookings.findIndex((b) => b.mealId === booking.mealId && b.cardId === booking.cardId);
  if (idx >= 0) db.bookings[idx] = { ...db.bookings[idx], ...booking };
  else db.bookings.push(booking);
}

function setFeedback(db, fb) {
  const idx = db.feedback.findIndex((f) => f.mealId === fb.mealId && f.cardId === fb.cardId);
  if (idx >= 0) db.feedback[idx] = { ...db.feedback[idx], ...fb };
  else db.feedback.push(fb);
}

function aggregatesForDate(db, dateIso) {
  const meals = getMealsForDate(db, dateIso);
  const map = {};
  meals.forEach((m) => {
    map[m.id] = { meal: m, totalBookings: 0, attended: 0, noShow: 0, dishCounts: {} };
  });

  db.bookings.forEach((b) => {
    const row = map[b.mealId];
    if (!row) return;
    if (['booked', 'attended', 'no-show'].includes(b.status)) row.totalBookings += 1;
    if (b.status === 'attended') row.attended += 1;
    if (b.status === 'no-show') row.noShow += 1;
    if (b.selectedDishName) row.dishCounts[b.selectedDishName] = (row.dishCounts[b.selectedDishName] || 0) + 1;
  });

  return map;
}

function inventoryForMeal(meal, bookingCount) {
  return (meal.ingredientPlan || []).map((ip) => ({
    ingredientName: ip.ingredientName,
    unit: ip.unit,
    quantity: Math.round(ip.quantityPerServing * bookingCount * 100) / 100
  }));
}

function kpisForDate(db, dateIso) {
  const agg = aggregatesForDate(db, dateIso);
  const rows = Object.values(agg);
  const totalBookings = rows.reduce((s, r) => s + r.totalBookings, 0);
  const attended = rows.reduce((s, r) => s + r.attended, 0);
  const noShow = rows.reduce((s, r) => s + r.noShow, 0);
  const wastePct = totalBookings === 0 ? 0 : Math.round((noShow / totalBookings) * 10000) / 100;

  const COST_PER_MEAL_BASE = 50;
  const totalCost = totalBookings * COST_PER_MEAL_BASE;
  const costPerServed = attended === 0 ? 0 : Math.round((totalCost / attended) * 100) / 100;

  return { totalBookings, attended, noShow, wastePct, totalCost, costPerServed };
}

function popularDishes(db, limit = 5) {
  const counts = {};
  db.bookings.forEach((b) => {
    if (!b.selectedDishName) return;
    if (!['booked', 'attended'].includes(b.status)) return;
    counts[b.selectedDishName] = (counts[b.selectedDishName] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([dish, count]) => ({ dish, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function ratingAnalytics(db, limit = 5) {
  const map = {};
  db.feedback.forEach((f) => {
    if (!map[f.mealId]) map[f.mealId] = { sum: 0, count: 0 };
    map[f.mealId].sum += Number(f.rating || 0);
    map[f.mealId].count += 1;
  });
  return Object.entries(map)
    .map(([mealId, v]) => ({
      mealId,
      avg: v.count ? Math.round((v.sum / v.count) * 100) / 100 : 0,
      count: v.count
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, limit);
}

function requireSession(role) {
  const s = getSession();
  if (!s) {
    window.location.href = './index.html';
    return null;
  }
  if (role && s.role !== role) {
    window.location.href = './index.html';
    return null;
  }
  return s;
}

function logout() {
  clearSession();
  window.location.href = './index.html';
}

window.SmartMessDemo = {
  DB_KEY,
  SESSION_KEY,
  seedIfNeeded,
  loadDb,
  saveDb,
  findUserByCard,
  upsertUser,
  getMealsForDate,
  getBooking,
  upsertBooking,
  setFeedback,
  aggregatesForDate,
  inventoryForMeal,
  kpisForDate,
  popularDishes,
  ratingAnalytics,
  tomorrowIso,
  nowIso,
  getSession,
  setSession,
  requireSession,
  logout
};

