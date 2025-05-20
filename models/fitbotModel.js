const mongoose = require("mongoose");

const chatLogSchema = new mongoose.Schema({
    log_id: {
        type: Number,
        unique: true,
    },
    user_id: {
        type: String,
        required: true,
        maxLength: 50,
    },
    log_data: [{
        question: {
            type: String,
            required: false,
        },
        response: {
            type: String,
            required: false,
        },
        timestamp: {
            type: String, // Change to String to store ISO format directly
            default: () => new Date().toISOString(), // Use ISO string
        }
    }],
    created_date: {
        type: Date,
        default: Date.now,
    }
});

// Auto-increment log_id
chatLogSchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      const lastLog = await this.constructor.findOne(
        {},
        {},
        { sort: { log_id: -1 } }
      );
      this.log_id = lastLog ? lastLog.log_id + 1 : 1;
    }
    next();
  } catch (error) {
    next(error);
  }
});

const ChatLog = mongoose.model("ChatLog", chatLogSchema);

module.exports = ChatLog;
