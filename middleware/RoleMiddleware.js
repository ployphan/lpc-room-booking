module.exports = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            if (req.path.startsWith('/api/')) {
                return res.status(401).json({ status: 401, message: 'Unauthenticated.' });
            }
            return res.redirect('/login');
        }

        const userRole = req.session.user.role_name;
        if (allowedRoles.includes(userRole)) {
            return next();
        }

        // Access forbidden
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ status: 403, message: 'Unauthorized. Role not permitted.' });
        }
        
        return res.status(403).send('Forbidden: คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
    };
};
