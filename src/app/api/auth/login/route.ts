import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app'; // Corrected import for app functions
import { signInWithEmailAndPassword, getAuth as getClientAuthModule } from 'firebase/auth'; // Client SDK auth functions
import { auth as firebaseAdminAuth } from '@/lib/firebaseAdmin'; // Renamed and aliased adminAuth
import type { FirebaseError } from 'firebase/app';

// This configuration will be used by the client SDK *on the server*
// Ensure these environment variables are available in your server environment
const firebaseClientConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  // Add other client config variables if signInWithEmailAndPassword requires them,
  // though usually apiKey and authDomain are sufficient for auth.
};

// Initialize a temporary client Firebase app instance on the server
const getClientApp = () => {
  if (getApps().find(app => app.name === 'client-auth-app')) {
    return getApp('client-auth-app');
  }
  return initializeApp(firebaseClientConfig, 'client-auth-app');
};

export async function POST(request: Request) {
  if (!firebaseAdminAuth) {
    console.error("API Error: Firebase Admin SDK not initialized for login. Check server logs for FIREBASE_ADMIN_KEY issues.");
    return NextResponse.json({ message: "Server configuration error." }, { status: 500 });
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const clientApp = getClientApp();
    const clientAuth = getClientAuthModule(clientApp); // Use the aliased import

    // Step 1: Sign in with client SDK to verify credentials and get ID token
    const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();

    // Step 2: Create session cookie with Admin SDK
    // Set session expiration. 5 days in this case.
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds
    const sessionCookie = await firebaseAdminAuth.createSessionCookie(idToken, { expiresIn });

    // Step 3: Set cookie on response
    const response = NextResponse.json({
      message: 'Login successful',
      user: { // Send back some user info, but not sensitive data
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      }
    }, { status: 200 });

    response.cookies.set({
      name: 'auth-session', // Name of your session cookie
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use 'secure: true' in production
      path: '/',
      maxAge: expiresIn / 1000, // maxAge is in seconds
      sameSite: 'lax', // Or 'strict'
    });

    return response;

  } catch (error: any) {
    console.error('Login API error:', error);
    let errorMessage = 'Login failed. Please check your credentials.';
    let statusCode = 401; // Unauthorized

    // Handle Firebase client SDK auth errors
    const firebaseError = error as FirebaseError;
    if (firebaseError.code) {
      switch (firebaseError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential': // Covers both wrong password and user not found in newer SDK versions
          errorMessage = 'Invalid email or password.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email format.';
          statusCode = 400; // Bad Request
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
          statusCode = 429; // Too Many Requests
          break;
        default:
          errorMessage = firebaseError.message || 'An unknown error occurred during login.';
          statusCode = 500; // Internal Server Error for unhandled cases
      }
    } else if (error.message) {
        // Non-Firebase errors
        errorMessage = error.message;
        statusCode = 500;
    }

    return NextResponse.json(
      { message: errorMessage },
      { status: statusCode }
    );
  }
}