import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCif_V4eDrKHuICu48mBXnzvM_BxUSMYaY",
  authDomain: "usfunded-org.firebaseapp.com",
  projectId: "usfunded-org",
  storageBucket: "usfunded-org.firebasestorage.app",
  messagingSenderId: "39541735158",
  appId: "1:39541735158:web:3144da7ab4b8bdf662b6d7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
