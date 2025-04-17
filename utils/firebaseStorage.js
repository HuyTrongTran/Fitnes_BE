const { bucket } = require('../config/firebase');

exports.uploadImageToStorage = async (file) => {
  try {
    const dateTime = Date.now();
    const fileName = `suggest-foods/${dateTime}-${file.originalname}`;
    const blob = bucket.file(fileName);
    
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype
      }
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        reject(new Error('Unable to upload image, something went wrong'));
      });

      blobStream.on('finish', async () => {
        // Make the file public
        await blob.makePublic();
        
        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        resolve(publicUrl);
      });

      blobStream.end(file.buffer);
    });
  } catch (error) {
    throw new Error('Error uploading image to storage');
  }
}; 