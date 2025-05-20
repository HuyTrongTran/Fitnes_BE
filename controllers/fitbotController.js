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
                    message: 'Missing required fields: user_id, question, or response'
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
                // Create new conversation with formatted timestamp for GMT+7
                const newConversation = {
                    question,
                    response,
                    timestamp: new Date().toLocaleString('en-US', { 
                        timeZone: 'Asia/Bangkok' // GMT+7 timezone (Indochina Time)
                    })
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
                        timestamp: new Date().toLocaleString('en-US', { 
                            timeZone: 'Asia/Bangkok' // GMT+7 timezone (Indochina Time)
                        })
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

            // return latest question
            const latestLogs = userLogs.length > 0 ? {
                log_id: userLogs[0].log_id,
                created_date: userLogs[0].created_date,
                latest_question: userLogs[0].log_data[userLogs[0].log_data.length - 1]?.question || null,
                latest_response: userLogs[0].log_data[userLogs[0].log_data.length - 1]?.response || null
            } : null;

            latestConversation = userLogs.length > 0 ? userLogs[0].log_data : null;
            
            
            res.status(200).json({
                success: true,
                data: userLogs,
                latestConversation: latestConversation,
                latestQuestion: latestLogs.latest_question,
                latestResponse: latestLogs.latest_response  
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching user logs',
                error: error.message
            });
        }
    },

    getTodayLogs: async (req, res) => {
        try {
            const user_id = req.user_id; // Get from authenticated user
            
            // Get today's date in UTC
            const today = new Date();
            const startOfDay = new Date(today);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(today);
            endOfDay.setUTCHours(23, 59, 59, 999);

            const userLogs = await FitbotLog.find({
                user_id,
                created_date: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            }).sort({ created_date: -1 });

            // If logs exist for today, get the conversations
            let todayConversations = null;
            if (userLogs.length > 0) {
                todayConversations = userLogs[0].log_data;
            }

            res.status(200).json({
                success: true,
                data: userLogs,
                todayConversations: todayConversations
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching today\'s logs',
                error: error.message
            });
        }
    }
};

module.exports = fitbotController;