module.exports = function ensureAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    if (req.accepts('json')) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    return res.redirect('/login');
  }
  next();
};

