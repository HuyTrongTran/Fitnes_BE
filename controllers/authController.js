// controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { UserModel, User } = require("../models/userModel"); // Make sure User is imported
const config = require("../config/config");
const fs = require("fs").promises;
const emailService = require("../services/emailService");

class AuthController {
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      console.log("Logged in with email:", email);
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid password or email" });
      }

      // Check if user is verified
      if (!user.isVerified) {
        return res.status(401).json({
          success: false,
          message: "Please verify your email before logging in",
          needsVerification: true,
          email: user.email,
        });
      }

      const isValid = await UserModel.verifyPassword(password, user.password);
      if (!isValid) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid password or email" });
      }

      // Include verification status in response for UI handling
      const token = jwt.sign(
        { email: user.email, id: user._id },
        config.JWT_SECRET,
        { expiresIn: "24h" }
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
          isVerified: user.isVerified, // Include verification status
          hasCompletedOnboarding: user.hasCompletedOnboarding,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      next(error);
    }
  }

  static async register(req, res, next) {
    try {
      const { firstName, lastName, userName, email, password } = req.body;
      console.log("Đăng ký với email:", email);

      // Kiểm tra email đã tồn tại chưa
      const existingEmail = await UserModel.findByEmail(email);
      if (existingEmail) {
        return res
          .status(400)
          .json({ success: false, message: "Email already exists" });
      }

      // Kiểm tra userName đã tồn tại chưa
      const existingUserName = await UserModel.findByUserName(userName);
      if (existingUserName) {
        return res
          .status(400)
          .json({ success: false, message: "Username already exists" });
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user with verification token
      const user = await UserModel.createUser({
        firstName,
        lastName,
        userName,
        email,
        password,
        isVerified: false,
        verificationToken,
        verificationTokenExpires,
      });

      // Send verification email
      const emailSent = await emailService.sendVerificationEmail(
        email,
        verificationToken
      );

      // Generate JWT token
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || "your_jwt_secret",
        { expiresIn: "1h" }
      );

      res.status(201).json({
        success: true,
        message: emailSent
          ? "Registration successful. Please check your email to verify your account."
          : "Registration successful but verification email could not be sent.",
        data: {
          token,
          firstName: user.firstName,
          lastName: user.lastName,
          userName: user.userName,
          email: user.email,
          isVerified: false, // Always false for new registrations
          hasCompletedOnboarding: user.hasCompletedOnboarding,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  }

  // Add email verification endpoint
  static async verifyEmail(req, res, next) {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Verification token is required"
        });
      }

      // Use the User model directly instead of UserModel.findOne
      const user = await User.findOne({ 
        verificationToken: token,
        verificationTokenExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired verification token"
        });
      }

      // Update user verification status
      user.isVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      await user.save();

      res.status(200).json({
        success: true,
        message: "Email verified successfully. You can now log in."
      });
    } catch (error) {
      console.error("Email verification error:", error);
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res
          .status(400)
          .json({ success: false, message: "No token provided" });
      }

      const blacklistPath = "./blacklist.txt";
      await fs.appendFile(blacklistPath, `${token}\n`);

      res.status(200).json({ success: true, message: "Logout successful" });
    } catch (error) {
      console.error("Error in /logout:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  static async checkBlacklist(req, res, next) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res
          .status(400)
          .json({ success: false, message: "No token provided" });
      }

      const blacklistPath = "./blacklist.txt";
      const blacklist = await fs.readFile(blacklistPath, "utf-8");
      const blacklistedTokens = blacklist
        .split("\n")
        .filter((t) => t.trim() !== "");

      if (blacklistedTokens.includes(token)) {
        return res.status(401).json({
          success: false,
          message: "Token has been added to the blacklist",
        });
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      console.error("Error in checkBlacklist:", error);
      res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
  }

  static async completeOnboarding(req, res, next) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res
          .status(401)
          .json({ success: false, message: "No token provided" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await UserModel.updateOnboardingStatus(decoded.email);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      res.status(200).json({ success: true, message: "Completed onboarding" });
    } catch (error) {
      console.error("Error in completeOnboarding:", error);
      next(error);
    }
  }

  // Add resend verification endpoint
  static async resendVerificationEmail(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      // Find user by email
      const user = await UserModel.findByEmail(email);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Update user with new token      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      user.verificationToken = verificationToken;
      user.verificationTokenExpires = verificationTokenExpires;
      await user.save();

      // Send verification email
      const emailSent = await emailService.sendVerificationEmail(
        email,
        verificationToken
      );

      res.status(200).json({
        success: true,
        message: emailSent
          ? "Verification email has been sent."
          : "Could not send verification email. Please try again later."
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      next(error);
    }
  }
}

module.exports = AuthController;
