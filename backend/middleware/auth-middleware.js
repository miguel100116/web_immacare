// middleware/auth.middleware.js
function ensureAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    if (req.accepts('html')) {
        return res.status(401).redirect('/login.html?message=Please login to continue');
    }
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
}

function ensureAdmin(req, res, next) {
    if (req.session.user && req.session.user.isAdmin) {
        return next();
    }
    if (req.accepts('html')) {
        return res.status(403).send('<h2>403 Forbidden</h2><p>You do not have permission to access this resource.</p><a href="/main.html">Go to Main Page</a>');
    }
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
}

function ensureDoctor(req, res, next) {
  // First, check if they are logged in at all.
  if (!req.session.user) {
    return res.redirect('/login.html?message=Please_login_to_continue');
  }
  // Then, check if they are a doctor (or an admin, since admins should have access to everything).
  if (req.session.user.isDoctor || req.session.user.isAdmin) {
    return next(); // They are authorized, continue to the route.
  }
  
  // If they are logged in but not a doctor, send them to the main page.
  res.status(403).redirect('/main.html?message=Doctor_access_required');
}

module.exports = {
    ensureAuthenticated,
    ensureAdmin,
    ensureDoctor
};