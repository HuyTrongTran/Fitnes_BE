const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const AuthController = require('../controllers/authController');
const UserProfile = require('../controllers/userController');

// Cấu hình multer để lưu file tạm
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Đảm bảo thư mục uploads/ tồn tại
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
    },
    fileFilter: function (req, file, cb) {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Tạo thư mục uploads nếu chưa tồn tại
const fs = require('fs');
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Routes
router.get('/getProfile', AuthController.checkBlacklist, UserProfile.getProfile);
router.post('/update-profile', AuthController.checkBlacklist, UserProfile.updateProfile);
router.post('/upload-profile-image', AuthController.checkBlacklist, upload.single('image'), UserProfile.uploadProfileImage);
router.post('/update-user-info', AuthController.checkBlacklist, UserProfile.updateUserInfo);
router.post('/update-password', AuthController.checkBlacklist, UserProfile.updatePassword);
module.exports = router;