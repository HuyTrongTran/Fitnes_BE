// routes/activityRoutes.js
const express = require('express');
const AuthController = require('../controllers/authController');
const UserActivityController = require('../controllers/userActivityController');

const router = express.Router();

router.post('/submitRunSession',AuthController.checkBlacklist, UserActivityController.submitRunSession);
router.get('/run-history',AuthController.checkBlacklist, UserActivityController.getRunHistory);
router.get('/today-activity',AuthController.checkBlacklist, UserActivityController.getTodayActivity);
router.get('/7days-activity',AuthController.checkBlacklist, UserActivityController.get7daysActivity);
router.get('/getSelectdayActivity/:date',AuthController.checkBlacklist, UserActivityController.getSelectdayActivity);


module.exports = router;