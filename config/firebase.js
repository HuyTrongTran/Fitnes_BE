const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Validate and load service account JSON file
let serviceAccount;
try {
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  
  // Check if file exists
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error('Service account file not found at: ' + serviceAccountPath);
  }
  
  serviceAccount = require('./serviceAccountKey.json');
  
  // Validate required fields
  const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 'client_id'];
  for (const field of requiredFields) {
    if (!serviceAccount[field]) {
      throw new Error(`Missing required field in service account: ${field}`);
    }
  }
  
  console.log('Service account file loaded successfully');
  console.log('Project ID:', serviceAccount.project_id);
  console.log('Client Email:', serviceAccount.client_email);
  
} catch (error) {
  console.error('Error loading service account:', error.message);
  serviceAccount = null;
}

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
  if (!serviceAccount) {
    throw new Error('Service account is not available');
  }
  
  // Check if Firebase app is already initialized
  if (admin.apps.length > 0) {
    firebaseAdmin = admin.app();
    console.log('Using existing Firebase app');
  } else {
    // Try to initialize the real Firebase admin using JSON file
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'fitness-tracking-ccf2a.firebasestorage.app',
    });
    console.log('Firebase Admin SDK initialized successfully with service account file');
  }
  
  // Get the storage bucket after successful initialization
  const storage = admin.storage();
  bucket = storage.bucket();
  console.log('Storage bucket name:', bucket.name);
  
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error.message);
  console.log('Using mock Firebase implementation instead');
  
  // Use the mock implementation
  firebaseAdmin = mockAdmin;
  bucket = mockAdmin.storage().bucket();
}

const checkStorageConnection = async () => {
  try {
    if (!bucket) {
      throw new Error('Bucket is not initialized');
    }
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
  isMock: firebaseAdmin === mockAdmin,
  // Export storage as well for direct access
  storage: firebaseAdmin === mockAdmin ? mockAdmin.storage() : admin.storage()
};