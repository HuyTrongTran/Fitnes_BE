// controllers/UserProfile.js
const fs = require('fs').promises;
const path = require('path');
const { UserModel } = require("../models/userModel");
const config = require("../config/config");
const { bucket } = require("../config/firebase");
const bcrypt = require('bcryptjs');
const { BlacklistToken } = require("../models/blacklistToken");

// Debug: Log để kiểm tra UserModel
console.log("UserModel in UserProfile:", UserModel);

class UserProfile {
  static async getProfile(req, res, next) {
    try {
      // Kiểm tra xem UserModel có được import đúng không
      if (!UserModel) {
        throw new Error(
          "UserModel is undefined. Check the import from userModel.js"
        );
      }

      // Kiểm tra xem req.user có tồn tại không
      if (!req.user || !req.user.email) {
        return res.status(401).json({
          success: false,
          message: "User authentication failed. Please check your token.",
        });
      }

      // console.log('Get Profile:', req.user.email);
      const user = await UserModel.findByEmail(req.user.email);
      if (!user) {
        // console.log('User not found with email:', req.user.email);
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // console.log('User found:', user.email);
      res.status(200).json({
        success: true,
        data: {
          profile: user.profile || {},
          username: user.userName,
          email: user.email,
          profileImage: user.profileImage,
          activities: user.profile.activities || [],
        },
      });
    } catch (error) {
      console.error("Failed to getProfile:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
  static async updateProfile(req, res, next) {
    try {
      const {
        gender,
        height,
        weight,
        age,
        goal,
        activityLevel,
        bmi,
        userName,
        profileImage,
        email,
      } = req.body;

      // Kiểm tra ít nhất một trường phải được cung cấp
      if (
        !gender &&
        !height &&
        !weight &&
        !age &&
        !goal &&
        !activityLevel &&
        !bmi &&
        !userName &&
        !profileImage &&
        !email
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Please provide at least one profile information field",
          });
      }

      // Tạo object chỉ chứa các trường được cung cấp
      const profileData = {};
      if (gender) profileData.gender = gender;
      if (height) profileData.height = height;
      if (weight) profileData.weight = weight;
      if (age) profileData.age = age;
      if (goal) profileData.goal = goal;
      if (activityLevel) profileData.activityLevel = activityLevel;
      if (bmi) profileData.bmi = bmi;
      if (userName) profileData.userName = userName;
      if (email) profileData.email = email;
      if (profileImage) profileData.profileImage = profileImage;

      const user = await UserModel.updateProfile(req.user.email, profileData);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      res.status(200).json({
        success: true,
        data: {
          profile: user.profile,
          userName: user.userName,
          email: user.email,
          profileImage: user.profileImage,
        },
        message: "Update profile successfully",
      });
    } catch (error) {
      console.error("Error in updateProfile:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  static async uploadProfileImage(req, res, next) {
    try {
      // Kiểm tra file upload
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file uploaded"
        });
      }

      const file = req.file;
      console.log("Full file object:", file);

      // Kiểm tra định dạng file
      const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedMimes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: "Invalid file format. Only JPG, JPEG and PNG are allowed"
        });
      }

      // Đọc file từ disk
      const fileContent = await fs.readFile(file.path);

      // Tạo tên file unique
      const fileExtension = file.originalname.split(".").pop().toLowerCase();
      const fileName = `${Date.now()}.${fileExtension}`;
      const filePath = `profile_images/${fileName}`;

      // Tạo reference đến file trong Firebase Storage
      const fileUpload = bucket.file(filePath);

      // Debug bucket name và file info
      console.log("Using bucket:", bucket.name);
      console.log("File path:", filePath);

      // Upload file lên Firebase Storage
      await fileUpload.save(fileContent, {
        metadata: {
          contentType: file.mimetype,
        },
        public: true,
        resumable: false,
      });

      // Xóa file tạm sau khi upload
      await fs.unlink(file.path);

      // Lấy public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      console.log("File uploaded successfully");
      console.log("Public URL:", publicUrl);

      // Cập nhật URL vào database
      const user = await UserModel.updateProfile(req.user.email, {
        profileImage: publicUrl,
      });

      if (!user) {
        throw new Error("User not found");
      }

      return res.status(200).json({
        success: true,
        data: {
          profileImage: publicUrl,
        },
        message: "Profile image uploaded successfully",
      });
    } catch (error) {
      console.error("Error in uploadProfileImage:", error);
      // Xóa file tạm nếu có lỗi
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error("Error deleting temp file:", unlinkError);
        }
      }
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: error.message || "Internal server error",
        });
      }
    }
  }
  static async updateUserInfo(req, res, next) {
    try {
      const { userName } = req.body;
      const user = await UserModel.updateUserInfo(req.user.email, {
        userName,
      });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          userName: user.userName,
        },
      });
    } catch (error) {
      console.error("Error in updateUserInfo:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  static async updatePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userEmail = req.user.email;
      const token = req.headers.authorization?.split(' ')[1]; // Lấy token từ header

      // Tìm user và kiểm tra mật khẩu cũ
      const user = await UserModel.findByEmail(userEmail);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Kiểm tra mật khẩu cũ
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Old password is incorrect'
        });
      }

      // Mã hóa mật khẩu mới
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Cập nhật mật khẩu mới
      const updatedUser = await UserModel.updateUserInfo(userEmail, { password: hashedPassword });
      if (!updatedUser) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update password'
        });
      }

      // Kiểm tra token đã tồn tại trong blacklist chưa
      if (token) {
        const existingToken = await BlacklistToken.findOne({ token });
        if (!existingToken) {
          await BlacklistToken.create({ token });
        }
      }

      res.json({
        success: true,
        message: 'Password updated successfully. Please login again.'
      });
    } catch (error) {
      console.error('Error in updatePassword:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating password'
      });
    }
  }
}

module.exports = UserProfile;

