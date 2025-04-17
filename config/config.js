module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-for-dev-only',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://user_dev:yourpassword@fitnesstracker.vcnx8.mongodb.net/fitness_tracker?retryWrites=true&w=majority&appName=FitnessTracker',
  SALT_ROUNDS: 10
};