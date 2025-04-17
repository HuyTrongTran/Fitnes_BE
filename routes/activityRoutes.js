// routes/activityRoutes.js
const express = require('express');
const AuthController = require('../controllers/authController');
const UserActivityController = require('../controllers/userActivityController');

const router = express.Router();

router.post('/submitRunSession',AuthController.checkBlacklist, UserActivityController.submitRunSession);
router.get('/run-history',AuthController.checkBlacklist, UserActivityController.getRunHistory);
router.get('/today-activity',AuthController.checkBlacklist, UserActivityController.getTodayActivity);


module.exports = router;