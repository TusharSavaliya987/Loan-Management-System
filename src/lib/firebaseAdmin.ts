"server-only";

import admin from "firebase-admin";
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';

let db: Firestore | undefined = undefined;
let auth: Auth | undefined = undefined;

const firebaseAdminKeyEnv = process.env.FIREBASE_ADMIN_KEY;

if (!firebaseAdminKeyEnv) {
  console.error(
    "Firebase Admin SDK Critical Error: The FIREBASE_ADMIN_KEY environment variable is not set. This is required for all server-side Firebase operations. Please check your .env.local or server environment configuration."
  );
} else {
  try {
    const serviceAccount = JSON.parse(firebaseAdminKeyEnv);

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin SDK initialized successfully.");
    } else {
      // Default app is already initialized
      console.log("Firebase Admin SDK already initialized.");
    }

    db = admin.firestore();
    auth = admin.auth();

  } catch (error: any) {
    console.error(
      "Firebase Admin SDK Initialization Critical Error: Failed to initialize or parse FIREBASE_ADMIN_KEY.",
      error.message || error,
      error.stack ? `\nStack: ${error.stack}` : ''
    );
    // db and auth will remain undefined. Consuming modules must check for this.
  }
}

export { db, auth };
