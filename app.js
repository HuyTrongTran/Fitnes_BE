require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');
const AuthController = require('./controllers/authController'); // Import AuthController
const config = require('./config/config');
const activityRoutes = require('./routes/activityRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const userRoutes = require('./routes/userRoutes');
const suggestFoodRoutes = require('./routes/suggestFoodRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Kết nối MongoDB
mongoose.connect(config.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err.message));

// Middleware
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api', userRoutes);
app.use('/api', authRoutes);
app.use('/api', activityRoutes);
app.use('/api', exerciseRoutes);
app.use('/api', suggestFoodRoutes);

// Route bảo vệ sử dụng checkBlacklist
app.get('/api/protected', AuthController.checkBlacklist, (req, res) => {
  res.json({ success: true, message: 'This is a protected route', user: req.user });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;