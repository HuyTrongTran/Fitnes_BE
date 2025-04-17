const jwt = require('jsonwebtoken');
const config = require('../config/config');

class AuthMiddleware {
    static async checkBlacklist(req, res, next) {
        try {
            const token = req.header('Authorization')?.replace('Bearer ', '');

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'No authentication token, access denied'
                });
            }

            // Verify token
            const decoded = jwt.verify(token, config.JWT_SECRET);
            
            // Add user data to request
            req.user = decoded;
            req.user_id = decoded.id;
            next();
        } catch (error) {
            res.status(401).json({
                success: false,
                message: 'Token is not valid',
                error: error.message
            });
        }
    }
}

module.exports = { AuthMiddleware };