const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');
const fs = require('fs');

let app;
if (getApps().length === 0) {
  let credential;
  const keyEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (keyEnv) {
    try {
      let serviceAccount;
      if (keyEnv.trim().startsWith('{')) {
        serviceAccount = JSON.parse(keyEnv);
      } else if (fs.existsSync(keyEnv)) {
        serviceAccount = require(path.resolve(keyEnv));
      }
      if (serviceAccount) {
        credential = cert(serviceAccount);
      }
    } catch (err) {
      console.warn('[firebase-admin] Warning: could not load service account key, falling back:', err.message);
    }
  }

  app = initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'usfunded-org',
    ...(credential ? { credential } : {}),
  });
} else {
  app = getApps()[0];
}

const auth = getAuth(app);

module.exports = { app, auth };
