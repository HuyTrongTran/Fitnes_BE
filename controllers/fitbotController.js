const FitbotLog = require('../models/fitbotModel');

const fitbotController = {
    // Create new log entry
    createLog: async (req, res) => {
        try {
            const user_id = req.user_id;
            const { question, response } = req.body;

            // Validate required fields
            if (!user_id || !question || !response) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID, question and response are required'
                });
            }

            // Get start and end of current day in UTC
            const startOfDay = new Date();
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setUTCHours(23, 59, 59, 999);

            // Try to find existing log for today
            let existingLog = await FitbotLog.findOne({
                user_id,
                created_date: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            });

            let savedLog;

            if (existingLog) {
                // Create new conversation
                const newConversation = {
                    question,
                    response,
                    timestamp: new Date()
                };

                // Initialize log_data as array if it doesn't exist
                if (!existingLog.log_data) {
                    existingLog.log_data = [];
                }

                // Convert existing log_data to array if it's an object
                if (!Array.isArray(existingLog.log_data)) {
                    const oldData = existingLog.log_data;
                    existingLog.log_data = [];
                    if (oldData && oldData.question) {
                        existingLog.log_data.push(oldData);
                    }
                }

                // Add new conversation
                existingLog.log_data.push(newConversation);
                
                // Use updateOne to ensure log_data is treated as array
                savedLog = await FitbotLog.findByIdAndUpdate(
                    existingLog._id,
                    { 
                        $set: { log_data: existingLog.log_data }
                    },
                    { new: true }
                );
            } else {
                // Create new log for today
                const newLog = new FitbotLog({
                    user_id,
                    log_data: [{
                        question,
                        response,
                        timestamp: new Date()
                    }],
                    created_date: new Date()
                });
                savedLog = await newLog.save();
            }

            res.status(201).json({
                success: true,
                message: existingLog ? 'Added to existing log' : 'Created new log',
                data: savedLog
            });

        } catch (error) {
            console.error('Error in createLog:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating chat log',
                error: error.message
            });
        }
    },

    // Get logs by user_id
    getUserLogs: async (req, res) => {
        try {
            const user_id = req.user_id; // Get from authenticated user
            const userLogs = await FitbotLog.find({ user_id }).sort({ created_date: -1 });
            
            res.status(200).json({
                success: true,
                data: userLogs
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching user logs',
                error: error.message
            });
        }
    },

    getUserlogsByDate: async (req, res) => {
        try {
            const user_id = req.user_id; // Get from authenticated user
            const { date } = req.params;

            // Validate date format (YYYY-MM-DD)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date format. Use YYYY-MM-DD.'
                });
            }

            // Parse date and get start and end of the day
            const startOfDay = new Date(date);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setUTCHours(23, 59, 59, 999);

            const userLogs = await FitbotLog.find({
                user_id,
                created_date: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            }).sort({ created_date: -1 });

            res.status(200).json({
                success: true,
                data: userLogs
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching user logs by date',
                error: error.message
            });
        }
    }
};

module.exports = fitbotController;