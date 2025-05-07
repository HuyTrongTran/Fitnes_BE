// controllers/getActivityCalendar.js
const { UserModel } = require('../models/userModel');
const UserExercise = require('../models/userExerciseModel');

// Debug: Log để kiểm tra UserModel
console.log('UserModel in getActivityCalendar:', UserModel);

class GetActivityCalendar {
    static async getActivityData(req, res, next) {
        try {
            // Kiểm tra xem UserModel có được import đúng không
            if (!UserModel) {
                throw new Error('UserModel is undefined. Check the import from userModel.js');
            }

            // Lấy email từ token (được set bởi middleware checkBlacklist)
            const email = req.user.email;
            const { date } = req.query;

            // Kiểm tra định dạng ngày (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            const selectedDate = date && dateRegex.test(date) ? date : new Date().toISOString().split('T')[0];

            // Tìm user theo email
            const user = await UserModel.findByEmail(email);
            if (!user) {
                console.log('User not found with email:', email);
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Tìm các bài tập của user cho ngày được chọn
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            const exercises = await UserExercise.find({
                user_id: user._id,
                date_to_do: {
                    $gte: startOfDay,
                    $lte: endOfDay,
                },
            });

            // Nếu không có bài tập, trả về "Rest Day"
            if (!exercises || exercises.length === 0) {
                return res.status(200).json({
                    success: true,
                    data: {
                        date: selectedDate.split('-').reverse().join('/'),
                        type: 'Rest Day',
                        workoutNumber: 0,
                        totalWorkouts: 0,
                        nextExercise: 'None',
                    },
                });
            }

            // Tính toán thông tin bài tập
            const workoutPlan = {
                date: selectedDate.split('-').reverse().join('/'),
                type: exercises[0].exercise_name,
                workoutNumber: exercises.length,
                totalWorkouts: exercises.length,
                nextExercise: exercises[0].exercise_name,
                exercises: exercises.map(exercise => ({
                    id: exercise._id,
                    exercise_name: exercise.exercise_name,
                    exercise_sub_title: exercise.exercise_sub_title,
                    set_to_do: exercise.set_to_do,
                    kcal_to_do: exercise.kcal_to_do,
                    time_to_do: exercise.time_to_do
                }))
            };

            res.status(200).json({
                success: true,
                data: workoutPlan,
            });
        } catch (error) {
            console.error('Error when get activity data:', error);
            next(error);
        }
    }
}

module.exports = GetActivityCalendar;