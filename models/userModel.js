// models/userModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/config');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    userName: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    profileImage: { type: String, required: false },
    profile: {
        gender: { type: String, enum: ['male', 'female'], required: false },
        height: { type: Number, required: false },
        weight: { type: Number, required: false },
        goal: { type: String, enum: ['weight_loss', 'muscle_gain', 'maintenance'], required: false },
        activityLevel: { type: String, enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'], required: false },
        age: { type: Number, required: false },
        bmi: { type: Number, required: false },
        activities: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'UserActivity',
            },
        ],
    },
    hasCompletedOnboarding: { type: Boolean, default: false },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    verificationTokenExpires: Date
}, { collection: 'user_infor' });

userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        console.log('Hashing password for user:', this.email);
        this.password = await bcrypt.hash(this.password, config.SALT_ROUNDS || 10);
    }
    next();
});

const User = mongoose.model('User', userSchema);

class UserModel {
    static async createUser(userData) {
        try {
            // Ensure all required fields are present
            const requiredFields = ['email', 'firstName', 'lastName', 'userName', 'password'];
            for (const field of requiredFields) {
                if (!userData[field]) {
                    throw new Error(`Field '${field}' is required`);
                }
            }

            // Create a new User instance (NOT using 'this')
            const newUser = new User({
                ...userData
            });
            
            // Only hash password if not already hashed and not handled by pre-save hook
            if (userData.password && !userData.password.startsWith('$2a$') && !userSchema.pre) {
                newUser.password = await bcrypt.hash(userData.password, 10);
            }
            
            // Save and return the user
            await newUser.save();
            return newUser;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    static async findByEmail(email) {
        return await User.findOne({ email });
    }

    static async findByUserName(userName) {
        return await User.findOne({ userName });
    }

    static async verifyPassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    static async updateOnboardingStatus(email) {
        return await User.findOneAndUpdate(
            { email },
            { hasCompletedOnboarding: true },
            { new: true }
        );
    }

    static async updateProfile(email, profileData) {
        const updateFields = {};
        
        // Xử lý các trường trong profile
        if (profileData.gender) updateFields['profile.gender'] = profileData.gender;
        if (profileData.height) updateFields['profile.height'] = profileData.height;
        if (profileData.weight) updateFields['profile.weight'] = profileData.weight;
        if (profileData.age) updateFields['profile.age'] = profileData.age;
        if (profileData.goal) updateFields['profile.goal'] = profileData.goal;
        if (profileData.activityLevel) updateFields['profile.activityLevel'] = profileData.activityLevel;
        if (profileData.bmi) updateFields['profile.bmi'] = profileData.bmi;
        if (profileData.activities) updateFields['profile.activities'] = profileData.activities;

        // Xử lý các trường ngoài profile
        if (profileData.userName) updateFields['userName'] = profileData.userName;
        if (profileData.profileImage) updateFields['profileImage'] = profileData.profileImage;
        if (profileData.email) updateFields['email'] = profileData.email;

        return await User.findOneAndUpdate(
            { email },
            { $set: updateFields },
            { new: true }
        );
    }
    static async updateUserInfo(email, userData) {
        return await User.findOneAndUpdate(
            { email },
            { $set: userData },
            { new: true }
        );
    }
}

module.exports = { User, UserModel };