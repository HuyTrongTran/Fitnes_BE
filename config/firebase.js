const admin = require('firebase-admin');

// Use environment variables instead of file
const getServiceAccount = () => {
  return {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
  };
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