import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let adminApp;
let adminAuth;
let adminDb;

const firebaseAdminKeyEnv = process.env.FIREBASE_ADMIN_KEY;

if (!firebaseAdminKeyEnv) {
  console.error("Firebase Admin SDK Error: FIREBASE_ADMIN_KEY environment variable is not set.");
} else {
  try {
    const serviceAccount = JSON.parse(firebaseAdminKeyEnv);
    if (!getApps().length) {
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("Firebase Admin SDK Initialized successfully.");
    } else {
      adminApp = getApps()[0];
      console.log("Firebase Admin SDK already initialized.");
    }
    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK or parsing FIREBASE_ADMIN_KEY:", error);
  }
}

export { adminDb, adminAuth };
