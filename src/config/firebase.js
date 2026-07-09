const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using service account credentials from env vars.
// See docs/SETUP_GUIDE.md for how to obtain these values.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

module.exports = admin;
