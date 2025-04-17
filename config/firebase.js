const admin = require('firebase-admin');

const getServiceAccount = () => {
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    console.log('Using Firebase credentials from environment variables');
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }
  console.log('Using Firebase credentials from serviceAccountKey.json');
  try {
    return require('./serviceAccountKey.json');
  } catch (error) {
    console.error('Error loading serviceAccountKey.json:', error);
    throw new Error('Firebase credentials not found');
  }
};

admin.initializeApp({
  credential: admin.credential.cert(getServiceAccount()),
  storageBucket: 'fitness-tracking-ccf2a.firebasestorage.app',
});

const bucket = admin.storage().bucket();

const checkStorageConnection = async () => {
  try {
    console.log('Attempting to connect to bucket:', bucket.name);
    const [files] = await bucket.getFiles({ maxResults: 1 });
    console.log('Firebase Storage connected successfully');
    return true;
  } catch (error) {
    console.error('Firebase Storage connection error:', error);
    console.error('Bucket name being used:', bucket.name);
    return false;
  }
};

module.exports = { admin, bucket, checkStorageConnection };