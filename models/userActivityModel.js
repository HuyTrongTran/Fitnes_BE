// models/userActivity.js
const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    activity_type: {
        type: String,
        required: true,
        enum: ['run', 'walk', 'bike', 'swim'],
    },
    run_address: {
        type: String,
        required: true,
    },
    time_in_seconds: {
        type: Number,
        required: true,
        min: 0,
    },
    distance_in_km: {
        type: Number,
        required: true,
        min: 0,
    },
    activity_date: {
        type: Date,
        required: true,
    },
    steps: {
        type: Number,
        required: true,
        min: 0,
    },
    calories: {
        type: Number,
    },
    route_points: [{
        latitude: {
            type: Number,
            required: true,
        },
        longitude: {
            type: Number,
            required: true,
        },
    }],
    created_at: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('UserActivity', userActivitySchema);