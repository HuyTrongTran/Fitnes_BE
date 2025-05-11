// controllers/userActivityController.js
const { User, UserModel } = require('../models/userModel');
const UserActivity = require('../models/userActivityModel');
const ObjectId = require('mongoose').Types.ObjectId;

// Debug: Log để kiểm tra User và UserModel
console.log('User model:', User);
console.log('UserModel:', UserModel);

const submitRunSession = async (req, res, next) => {
    try {
        // Kiểm tra xem User có được import đúng không
        if (!User) {
            throw new Error('User model is undefined. Check the import from userModel.js');
        }

        // Lấy user_id từ token (được set bởi middleware checkBlacklist)
        const user_id = req.user.id;

        const { run_address, time_in_seconds, distance_in_km, route_points, activity_date, steps, calories } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!time_in_seconds || !distance_in_km) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Kiểm tra time_in_seconds và distance_in_km phải là số dương
        if (time_in_seconds <= 0 || distance_in_km <= 0) {
            return res.status(400).json({ error: 'Time and distance must be positive numbers' });
        }

        // Kiểm tra xem user có tồn tại không
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Tạo một document UserActivity mới
        const newActivity = new UserActivity({
            user_id,
            activity_type: 'run',
            run_address: run_address,
            time_in_seconds,
            distance_in_km,
            activity_date: activity_date || new Date().toISOString().split('T')[0],
            route_points: route_points || [],
            steps: steps || Math.floor(distance_in_km * 1250), // Sử dụng steps từ request hoặc tính toán
            calories: calories || distance_in_km * 60, // Sử dụng calories từ request hoặc tính toán
        });

        // Lưu activity vào collection user_activity
        const savedActivity = await newActivity.save();

        // Cập nhật mảng profile.activities của user
        await UserModel.updateProfile(user.email, {
            activities: [...(user.profile.activities || []), savedActivity._id],
        });

        // Trả về kết quả
        res.status(201).json({
            message: 'Saved your session successfully',
            data: savedActivity,
        });
    } catch (error) {
        console.error('Error submitting run session:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

const getRunHistory = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { startDate, endDate } = req.query;

        // Tạo điều kiện tìm kiếm
        let query = {
            user_id,
            activity_type: 'run'
        };

        // Nếu có startDate và endDate thì thêm vào query
        if (startDate && endDate) {
            query.activity_date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Lấy danh sách hoạt động chạy bộ
        const activities = await UserActivity.find(query)
            .sort({ activity_date: -1 }); // Sắp xếp theo ngày mới nhất

        // Format lại dữ liệu trước khi trả về
        const formattedActivities = activities.map(activity => ({
            id: activity._id,
            date: activity.activity_date,
            run_address: activity.run_address,
            time_in_seconds: activity.time_in_seconds,
            distance_in_km: activity.distance_in_km,
            calories: activity.calories,
            steps: activity.steps,
            route_points: activity.route_points || []
        }));

        res.status(200).json({
            success: true,
            data: formattedActivities
        });

    } catch (error) {
        console.error('Error fetching run history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getTodayActivity = async (req, res) => {
    try {
        const user_id = req.user.id;
       // Lấy ngày hôm nay ở múi giờ UTC+7

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        
        // Tìm tất cả các hoạt động của ngày hôm nay
        const activities = await UserActivity.find({
            user_id: user_id,
            activity_date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });
        
        // Tính tổng các giá trị
        const totals = activities.reduce((acc, activity) => {
            return {
                distance_in_km: acc.distance_in_km + (activity.distance_in_km || 0),
                calories: acc.calories + (activity.calories || 0),
                steps: acc.steps + (activity.steps || 0)
            };
        }, { distance_in_km: 0, calories: 0, steps: 0 });

        // Farse data
        const formattedActivities = activities.map(activity => ({
            id: activity._id,
            date: activity.activity_date || null,
            run_address: activity.run_address || null,
            time_in_seconds: activity.time_in_seconds|| null,
            distance_in_km: activity.distance_in_km || null,
            calories: activity.calories|| null,
            steps: activity.steps|| null,
            route_points: activity.route_points || []
        }));

        res.json({
            success: true,
            data: formattedActivities,
            totals: totals
        });
    } catch (error) {
        console.error('Error in getTodayActivity:', error);
        res.status(500).json({
            success: false,
            message: 'Error in getTodayActivity'
        });
    }
}
const get7daysActivity = async (req, res) => {
    try {
        const user_id = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const currentDay = new Date(today);
        const startOfWeek = new Date(currentDay);
        startOfWeek.setDate(currentDay.getDate() - currentDay.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Set to end of week (Sunday)
        endOfWeek.setHours(23, 59, 59, 999);
        const userObjectId = new ObjectId(user_id); 

        const activities = await UserActivity.aggregate([
            {
            $match: {
                user_id: userObjectId,
                activity_date: {
                $gte: startOfWeek,
                $lt: new Date(endOfWeek.getTime() + 24 * 60 * 60 * 1000) // Include Sunday
                }
            }
            },
            {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$activity_date" } },
                totalDistance: { $sum: "$distance_in_km" },
                totalCalories: { $sum: "$calories" },
                totalSteps: { $sum: "$steps" },
                activities: { $push: "$$ROOT" }
            }
            },
            {
            $sort: { _id: 1 }
            }
        ]);

        // Create array for all days of the week (Monday to Sunday)
        const weekData = [];
        for (let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            weekData.push({
                date: dateStr,
                totalDistance: 0,
                totalCalories: 0,
                totalSteps: 0,
                activities: []
            });
        }

        // Merge existing activities with empty days
        activities.forEach(activity => {
            const index = weekData.findIndex(day => day.date === activity._id);
            if (index !== -1) {
                weekData[index] = {
                    date: activity._id,
                    totalDistance: activity.totalDistance,
                    totalCalories: activity.totalCalories,
                    totalSteps: activity.totalSteps,
                    activities: activity.activities
                };
            }
        });

        res.json({
            success: true,
            data: weekData
        });
    } catch (error) {
        console.error('Error in get7daysActivity:', error);
        res.status(500).json({
            success: false,
            message: 'Error in get7daysActivity'
        });
    }
}

    const getSelectdayActivity = async (req, res) => {
        try {
            const user_id = req.user.id;
            const dateParam = req.params.date; // Changed from req.query to req.params

            // Validate date format (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(dateParam)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date format. Please use YYYY-MM-DD format (e.g., 2025-05-11)'
                });
            }

            const selectedDate = new Date(dateParam);
            
            if (isNaN(selectedDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date'
                });
            }

            // Set the time to start of the selected day (UTC)
            selectedDate.setUTCHours(0, 0, 0, 0);
            
            // Find all activities for the selected date
            const activities = await UserActivity.find({
                user_id: user_id,
                activity_date: {
                    $gte: selectedDate,
                    $lt: new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)
                }
            });
            
            // Calculate totals
            const totals = activities.reduce((acc, activity) => {
                return {
                    distance_in_km: Number((acc.distance_in_km + (activity.distance_in_km || 0)).toFixed(2)),
                    calories: Math.round(acc.calories + (activity.calories || 0)),
                    steps: Math.round(acc.steps + (activity.steps || 0))
                };
            }, { distance_in_km: 0, calories: 0, steps: 0 });

            // Format activities
            const formattedActivities = activities.map(activity => ({
                id: activity._id,
                date: activity.activity_date,
                run_address: activity.run_address || null,
                time_in_seconds: activity.time_in_seconds || 0,
                distance_in_km: activity.distance_in_km || 0,
                calories: activity.calories || 0,
                steps: activity.steps || 0,
                route_points: activity.route_points || []
            }));

            res.json({
                success: true,
                data: {
                    activities: formattedActivities,
                    totals: totals,
                    // selectedDate: dateParam
                }
            });
        } catch (error) {
            console.error('Error in getSelectdayActivity:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    };

module.exports = { submitRunSession, getRunHistory, getTodayActivity, get7daysActivity, getSelectdayActivity };