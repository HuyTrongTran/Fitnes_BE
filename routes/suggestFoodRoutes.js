const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const SuggestFoodController = require('../controllers/suggestFoodController');
const upload = require('../utils/multerConfig');

// Tạo suggest food mới
router.post('/create-suggest-food', AuthController.checkBlacklist, upload.single('image'), SuggestFoodController.createSuggestFood);

// Lấy suggest foods theo loại hỗ trợ
router.get('/get-suggest-foods-by-support/:support_for', AuthController.checkBlacklist, SuggestFoodController.getSuggestFoodsBySupport);

module.exports = router;
