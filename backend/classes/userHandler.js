const jwt = require('jsonwebtoken');
const sql = require('../db/db');
const runtime = require('../runtime/runtime');
require('dotenv').config();

/**
 * UserHandler class to handle user registration and login.
 */
class UserHandler {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret';
        this.saltRounds = 10;
    }

    /**
     * Register a new user with a username and password.
     * @param {string} username - The username of the user. It must have the 'unique' constraint in the database to avoid duplicates.
     * @param {string} password - The password of the user.
     * @param {string} email - The email of the user.
     * @returns {Promise<Object>} - A promise that resolves to an object containing a JWT token.
     * @throws {Error} - If the registration fails.
     * @example
     * const token = await userHandler.registerUser('testuser', 'testpassword');
     */
    async registerUser(username, password, email) {
        const hashedPassword = await runtime.hash(password, this.saltRounds);
        const result = await sql.functions.insertRow('users', { name: username, password_hash: hashedPassword, email: email});
        if (result.affectedRows === 0) throw new Error('Failed to register user');

        const token = jwt.sign({ id: process.env.HIDE_USERID ? null : result.insertId, username }, this.jwtSecret, { expiresIn: '7d' });
        return token;
    }

    /**
     * Log in a user with a username and password.
     * @param {string} username - The username of the user.
     * @param {string} password - The password of the user.
     * @returns {Promise<Object>} - A promise that resolves to an object containing a JWT token.
     * @throws {Error} - If the login fails.
     * @example
     * const token = await userHandler.loginUser('testuser', 'testpassword');
     */
    async loginUser(username, password) {
        const user = await sql.functions.getRow('users', { name: username });
        if (!user) throw new Error('User not found');

        const isMatch = await runtime.compareHash(password, user.password_hash);
        if (!isMatch) throw new Error('Invalid credentials');

        const token = jwt.sign({ id: process.env.HIDE_USERID ? null : user.id, username: user.name }, this.jwtSecret, { expiresIn: '7d' });
        return token;
    }

    /**
     * Verify a JWT token. Does not interact with the database to make the verification faster.
     * @param {string} token - The JWT token to verify.
     * @returns {Object} - The decoded token payload.
     * @throws {Error} - If the token is invalid.
     * @example
     * const decoded = userHandler.verifyToken('your_jwt_token');
     */
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            return decoded;
        } catch (err) {
            throw new Error('Invalid token');
        }
    }
}

module.exports = new UserHandler();
