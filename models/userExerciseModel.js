const mongoose = require('mongoose');

const userExerciseSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    exercise_name: {
        type: String,
        required: true,
    },
    exercise_sub_title: {
        type: String,
        required: true,
    },
    date_to_do:{
        type: Date,
        required: true,
    },
    set_to_do: {
        type: Number,
        required: true,
    },
    kcal_to_do: {
        type: Number,
        required: true,
    },
    time_to_do: {
        type: Number,
        required: true,
    }
});
module.exports = mongoose.model('UserExercise', userExerciseSchema);
