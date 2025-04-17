const express = require('express');
const AuthController = require('../controllers/authController');
const jwt = require('jsonwebtoken');
const getActivityCalendar = require('../controllers/getActivityCalendar');

const router = express.Router();

router.post('/login', AuthController.login);

router.post('/register', AuthController.register);

router.post('/logout', AuthController.logout);
router.post('/complete-onboarding', AuthController.checkBlacklist, AuthController.completeOnboarding);
router.get('/activity-data', AuthController.checkBlacklist, getActivityCalendar.getActivityData);


module.exports = router;