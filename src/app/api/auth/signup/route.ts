import { NextResponse } from 'next/server';
import { auth as firebaseAdminAuth, db } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  if (!firebaseAdminAuth) {
    console.error("API Error: Firebase Admin SDK not initialized for signup. Check server logs for FIREBASE_ADMIN_KEY issues.");
    return NextResponse.json({ message: "Server configuration error." }, { status: 500 });
  }
  try {
    const { email, password, displayName } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Consider adding password strength validation here

    const userRecord = await firebaseAdminAuth.createUser({
      email: email,
      password: password,
      displayName: displayName,
      // emailVerified: false, // Optional: set email verification status
      // disabled: false, // Optional: set user disabled status
    });

    // You might want to create a corresponding user profile in Firestore here
    // e.g., await db.collection('users').doc(userRecord.uid).set({ ... });

    return NextResponse.json({
      message: 'Signup successful',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      }
    });

  } catch (error: any) {
    console.error('Signup error:', error);
    let errorMessage = 'Signup failed. Please try again.';
    let statusCode = 500; // Default to 500

    if (error.code) {
      switch (error.code) {
        case 'auth/email-already-exists':
          errorMessage = 'This email address is already in use.';
          statusCode = 409; // Conflict
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address is not valid.';
          statusCode = 400;
          break;
        case 'auth/invalid-password':
           // Firebase Admin SDK createUser password requirements are:
           // - at least 6 characters long
           // This error might also surface from other password policy violations if you set them up in Firebase console
          errorMessage = 'Password must be at least 6 characters long.';
          statusCode = 400;
          break;
        // Add other Firebase Admin SDK specific error codes if needed
        default:
          errorMessage = error.message || 'An unknown error occurred during signup.';
      }
    }
    return NextResponse.json(
      { message: errorMessage },
      { status: statusCode } // Use dynamic status code
    );
  }
}