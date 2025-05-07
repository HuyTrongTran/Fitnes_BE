const express = require('express');
const router = express.Router();
const exerciseController = require('../controllers/exerciseController');
const { AuthMiddleware } = require('../middleware/authMiddleware');

// Add exercise to workout plan
router.post('/add-to-plan', AuthMiddleware.checkBlacklist, exerciseController.addToWorkoutPlan);

// Get user's workout plan
router.get('/workout-plan', AuthMiddleware.checkBlacklist, exerciseController.getUserWorkoutPlan);

// Delete exercise (changed from POST to DELETE)
router.delete('/exercise/:id', AuthMiddleware.checkBlacklist, exerciseController.deleteExercise);

module.exports = router;