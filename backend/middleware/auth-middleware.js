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

module.exports = {
    ensureAuthenticated,
    ensureAdmin
};