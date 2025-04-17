const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.message);
    
    const statusCode = err.message === 'Invalid credentials' ? 401 : 400;
    
    res.status(statusCode).json({
      success: false,
      message: err.message
    });
  };
  
  module.exports = errorHandler;