const express = require('express');
const router = express.Router();

const User = require('../models/User');
const ensureAuth = require('../utils/ensureAuth');

// ----- Login page -----
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('auth/login', { title: 'Student / Admin Login' });
});

// ----- Handle barcode login (student/admin) -----
router.post('/login', async (req, res) => {
  try {
    const { barcodeValue } = req.body;

    if (!barcodeValue) {
      return res.status(400).json({ success: false, message: 'No barcode value provided.' });
    }

    // In this system, the barcode encodes the studentId or adminId
    const user = await User.findOne({ cardId: barcodeValue });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid card. User not found.' });
    }

    req.session.user = {
      id: user._id,
      name: user.name,
      role: user.role,
      studentId: user.studentId,
      cardId: user.cardId
    };

    return res.json({
      success: true,
      redirectUrl:
        user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// ----- Logout -----
router.post('/logout', ensureAuth, (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, redirectUrl: '/login' });
  });
});

module.exports = router;

