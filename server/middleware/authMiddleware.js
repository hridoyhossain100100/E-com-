const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const token = req.cookies.admin_token;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized - No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden - Invalid role' });
        }

        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized - Invalid token' });
    }
};

module.exports = authMiddleware;
