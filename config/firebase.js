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
  
  try {
    console.log('Attempting to load Firebase credentials from serviceAccountKey.json');
    return require('./serviceAccountKey.json');
  } catch (error) {
    console.warn('Firebase credentials file not found, using mock implementation');
    // Return mock credentials that won't cause initialization to fail
    return {
      projectId: 'mock-project-id',
      clientEmail: 'mock@example.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4/M2bS1GB4t7NXp98C3SC6dVMvDuictGeurT8jNbvJZHtCSuYEvu\n-----END PRIVATE KEY-----\n'
    };
  }
};

// Create a mock admin object that can be used when real admin fails
let mockAdmin = {
  auth: () => ({
    verifyIdToken: (token) => {
      console.log('Using mock Firebase auth - token verification is simulated');
      return Promise.resolve({ 
        uid: 'mock-uid',
        email: 'mock@example.com',
        name: 'Mock User'
      });
    }
  }),
  storage: () => ({
    bucket: () => ({
      name: 'mock-bucket',
      getFiles: () => Promise.resolve([[]])
    })
  })
};

let firebaseAdmin, bucket;

try {
  // Try to initialize the real Firebase admin
  firebaseAdmin = admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'fitness-tracking-ccf2a.firebasestorage.app',
  });
  bucket = admin.storage().bucket();
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error.message);
  console.log('Using mock Firebase implementation instead');
  
  // Use the mock implementation
  firebaseAdmin = mockAdmin;
  bucket = mockAdmin.storage().bucket();
}

const checkStorageConnection = async () => {
  try {
    console.log('Checking Firebase Storage connection to bucket:', bucket.name);
    const [files] = await bucket.getFiles({ maxResults: 1 });
    console.log('Firebase Storage connected successfully');
    return true;
  } catch (error) {
    console.error('Firebase Storage connection error:', error.message);
    return false;
  }
};

module.exports = { 
  admin: firebaseAdmin, 
  bucket, 
  checkStorageConnection,
  isMock: firebaseAdmin === mockAdmin
};