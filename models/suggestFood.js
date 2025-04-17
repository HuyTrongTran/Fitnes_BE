const mongoose = require('mongoose');

const suggestFoodSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'Title is required'],
        trim: true 
    },
    description: { 
        type: String, 
        required: [true, 'Description is required'],
        trim: true 
    },
    image: { 
        type: String, 
        required: [true, 'Image URL is required'] 
    },
    support_for: { 
        type: String, 
        required: [true, 'Support for field is required'],
        trim: true 
    },
    steps: [{ 
        step_number: {
            type: Number,
            required: true
        },
        instruction: {
            type: String,
            required: true,
            trim: true
        }
    }],
});

// Middleware để tự động cập nhật updated_at
suggestFoodSchema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
});

// Tạo index cho support_for để tối ưu tìm kiếm
suggestFoodSchema.index({ support_for: 1 });

const SuggestFood = mongoose.model('SuggestFood', suggestFoodSchema);

class SuggestFoodModel {
    static async createSuggestFood(suggestFoodData) {
        return await SuggestFood.create(suggestFoodData);
    }

    static async findAll() {
        return await SuggestFood.find();
    }

    static async findById(id) {
        return await SuggestFood.findById(id);
    }

    static async findBySupport(support_for) {
        return await SuggestFood.find({ support_for });
    }

    static async updateSuggestFood(id, updateData) {
        return await SuggestFood.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    }

    static async deleteSuggestFood(id) {
        return await SuggestFood.findByIdAndDelete(id);
    }
}

module.exports = { SuggestFood, SuggestFoodModel };
