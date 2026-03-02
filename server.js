require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const adminRoutes = require('./routes/admin');

const app = express();

// ----- Basic config -----
const PORT = process.env.PORT || 3000;
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-mess-management';

// ----- Mongo connection -----
mongoose
  .connect(MONGO_URI, { autoIndex: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// ----- View engine -----
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ----- Middleware -----
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-smart-mess-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      collectionName: 'sessions'
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 4 } // 4 hours
  })
);

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// ----- Expose user to views -----
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// ----- Routes -----
app.use('/', authRoutes);
app.use('/student', studentRoutes);
app.use('/admin', adminRoutes);

// Quick health check to confirm server is reachable
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'smart-mess-management-system', port: PORT });
});

// Home → redirect based on role or login
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  if (req.session.user.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  return res.redirect('/student/dashboard');
});

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Not Found' });
});

app.listen(PORT, () => {
  console.log(`Smart Mess Management System running on http://localhost:${PORT}`);
});

