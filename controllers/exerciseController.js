const UserExercise = require('../models/userExerciseModel');

const exerciseController = {
    // Add exercise to user's workout plan
    addToWorkoutPlan: async (req, res) => {
        try {
            const {
                exercise_name,
                exercise_sub_title,
                date_to_do,
                set_to_do,
                kcal_to_do,
                time_to_do
            } = req.body;
            const user_id = req.user_id;

            if (!user_id) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }

            // Create new exercise plan
            const newExercise = new UserExercise({
                user_id: req.user_id,
                exercise_name,
                exercise_sub_title,
                date_to_do: new Date(date_to_do),
                set_to_do,
                kcal_to_do,
                time_to_do
            });

            // Save to database
            const savedExercise = await newExercise.save();

            res.status(201).json({
                success: true,
                message: 'Exercise added to workout plan successfully',
                data: {
                    id: savedExercise._id,
                    ...savedExercise._doc
                }
            });

        } catch (error) {
            console.error('Error in addToWorkoutPlan:', error);
            res.status(500).json({
                success: false,
                message: 'Error adding exercise to workout plan',
                error: error.message
            });
        }
    },
    deleteExercise: async (req, res) => {
        try {
            const exerciseId = req.params.id;
            const userId = req.user_id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }

            // Find and delete the exercise, ensuring it belongs to the current user
            const deletedExercise = await UserExercise.findOneAndDelete({
                _id: exerciseId,
                user_id: userId
            });

            if (!deletedExercise) {
                return res.status(404).json({
                    success: false,
                    message: 'Exercise not found or unauthorized'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Exercise deleted successfully',
                data: deletedExercise
            });

        } catch (error) {
            console.error('Error in deleteExercise:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting exercise',
                error: error.message
            });
        }
    },

    getUserWorkoutPlan: async (req, res) => {
        try {
            if (!req.user_id) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }

            const workoutPlan = await UserExercise.find({ user_id: req.user_id });

            res.status(200).json({
                success: true,
                data: workoutPlan
            });

        } catch (error) {
            console.error('Error in getUserWorkoutPlan:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching workout plan',
                error: error.message
            });
        }
    }
};

module.exports = exerciseController;
