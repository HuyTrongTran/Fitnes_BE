// controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { UserModel } = require('../models/userModel');
const config = require('../config/config');
const fs = require('fs').promises;

// Debug: Log để kiểm tra UserModel
// console.log('UserModel in authController:', UserModel);

class AuthController {
    static async login(req, res, next) {
        try {
            // Kiểm tra xem UserModel có được import đúng không
            if (!UserModel) {
                throw new Error('UserModel is undefined. Check the import from userModel.js');
            }

            const { email, password } = req.body;
                console.log('Logged in with email:', email);
            const user = await UserModel.findByEmail(email);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid password or email' });
            }

            const isValid = await UserModel.verifyPassword(password, user.password);
            if (!isValid) {
                return res.status(401).json({ success: false, message: 'Invalid password or email' });
            }

            const token = jwt.sign(
                { email: user.email, id: user._id },
                config.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.status(200).json({
                success: true,
                data: {
                    token,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    userName: user.userName,
                    email: user.email,
                    profile: user.profile,
                    hasCompletedOnboarding: user.hasCompletedOnboarding,
                },
            });
        } catch (error) {
            console.error('Login error:', error);
            next(error);
        }
    }

    static async register(req, res, next) {
        try {
            // Check if UserModel is imported correctly
            if (!UserModel) {
                throw new Error('UserModel is undefined. Check the import from userModel.js');
            }

            const { firstName, lastName, userName, email, password } = req.body;
            console.log('Đăng ký với email:', email);

            // Kiểm tra email đã tồn tại chưa
            const existingEmail = await UserModel.findByEmail(email);
            if (existingEmail) {
                return res.status(400).json({ success: false, message: 'Email already exists' });
            }

            // Kiểm tra userName đã tồn tại chưa
            const existingUserName = await UserModel.findByUserName(userName);
            if (existingUserName) {
                return res.status(400).json({ success: false, message: 'Username already exists' });
            }

            // Tạo người dùng mới
            const user = await UserModel.createUser({
                firstName,
                lastName,
                userName,
                email,
                password
            });

            console.log('User created:', user.email);
            const token = jwt.sign(
                { id: user._id },
                process.env.JWT_SECRET || 'your_jwt_secret',
                { expiresIn: '1h' }
            );

            res.status(201).json({
                success: true,
                data: {
                    token,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    userName: user.userName,
                    email: user.email,
                    hasCompletedOnboarding: user.hasCompletedOnboarding,
                },
            });
        } catch (error) {
            console.error('Registration error:', error);
            next(error);
        }
    }

    static async logout(req, res, next) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(400).json({ success: false, message: 'No token provided' });
            }

            const blacklistPath = './blacklist.txt';
            await fs.appendFile(blacklistPath, `${token}\n`);

            res.status(200).json({ success: true, message: 'Logout successful' });
        } catch (error) {
            console.error('Error in /logout:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Internal server error',
            });
        }
    }

    static async checkBlacklist(req, res, next) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(400).json({ success: false, message: 'No token provided' });
            }

            const blacklistPath = './blacklist.txt';
            const blacklist = await fs.readFile(blacklistPath, 'utf-8');
            const blacklistedTokens = blacklist.split('\n').filter(t => t.trim() !== '');

            if (blacklistedTokens.includes(token)) {
                return res.status(401).json({ success: false, message: 'Token has been added to the blacklist' });
            }

            const decoded = jwt.verify(token, config.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            console.error('Error in checkBlacklist:', error);
            res.status(401).json({
                success: false,
                message: 'Invalid token',
            });
        }
    }

    static async completeOnboarding(req, res, next) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ success: false, message: 'No token provided' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await UserModel.updateOnboardingStatus(decoded.email);

            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            res.status(200).json({ success: true, message: 'Completed onboarding' });
        } catch (error) {
            console.error('Error in completeOnboarding:', error);
            next(error);
        }
    }
}

module.exports = AuthController;