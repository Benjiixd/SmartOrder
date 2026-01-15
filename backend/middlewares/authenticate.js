const jwt = require('jsonwebtoken');
const { loadKey } = require('../runtime/jwtKeys');
require('dotenv').config();

const jwtPublicKey = loadKey('JWT_PUBLIC_KEY', 'JWT_PUBLIC_KEY_PATH', 'JWT public key');
const jwtAlgorithm = process.env.JWT_ALGORITHM || 'RS256';

/**
 * Middleware to authenticate the user using it's JWT token
 * @param {Request} req 
 * @param {Response} res 
 * @param {NextFunction} next 
 */
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        jwt.verify(token, jwtPublicKey, { algorithms: [jwtAlgorithm] }, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

module.exports = authenticate;
