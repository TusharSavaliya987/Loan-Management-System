import { NextResponse } from 'next/server';
import { auth as firebaseAdminAuth } from '@/lib/firebaseAdmin';
import { cookies } from 'next/headers'; // For accessing cookies in Route Handlers

export async function GET(request: Request) {
  if (!firebaseAdminAuth) {
    console.error("API Error: Firebase Admin SDK not initialized for /api/auth/me. Check server logs.");
    return NextResponse.json({ message: "Server configuration error." }, { status: 500 });
  }

  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('auth-session')?.value;

  if (!sessionCookie) {
    return NextResponse.json({ isAuthenticated: false, user: null }, { status: 200 });
  }

  try {
    // Verify the session cookie. In this case an additional check is added to see if
    // the user's Firebase account was disabled, revoked, etc.
    const decodedClaims = await firebaseAdminAuth.verifySessionCookie(
      sessionCookie,
      true // Check if revoked
    );

    // You could fetch additional user details from Firestore here if needed
    // const userRecord = await firebaseAdminAuth.getUser(decodedClaims.uid);

    return NextResponse.json({
      isAuthenticated: true,
      user: {
        uid: decodedClaims.uid,
        email: decodedClaims.email,
        name: decodedClaims.name, // if set during token minting or from user record
        picture: decodedClaims.picture, // if set
        // Add other relevant, non-sensitive user properties from decodedClaims
      },
    }, { status: 200 });

  } catch (error: any) {
    console.warn('Error verifying session cookie in /api/auth/me:', error.code || error.message);
    // Session cookie is invalid, expired, or revoked.
    // Respond by clearing the cookie from the client to prevent it from being sent again.
    const response = NextResponse.json({ isAuthenticated: false, user: null }, { status: 200 }); // Or 401 if you prefer to indicate auth failure explicitly
    response.cookies.set({
        name: 'auth-session',
        value: '',
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0
    });
    return response;
  }
} 