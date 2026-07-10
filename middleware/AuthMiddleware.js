module.exports = (req, res, next) => {
    if (req.session && req.session.userId) {
        // User is authenticated
        res.locals.user = req.session.user; // Expose user to views
        return next();
    }

    // For API requests, return 401. For regular requests, redirect to login.
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ status: 401, message: 'Unauthenticated.' });
    }
    
    return res.redirect('/login');
};
