import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export async function POST() {
  try {
    // Sign out from Firebase
    await signOut(auth);

    // Create response
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );

    // Clear the auth-session cookie by setting its value to empty and maxAge to 0
    response.cookies.set({
      name: 'auth-session',
      value: '',
      path: '/',
      httpOnly: true, // If it was set as httpOnly by another server process
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0 // Effectively deletes the cookie
    });
    
    // As an alternative or for cookies not set with httpOnly from server:
    // response.cookies.delete({ name: 'auth-session', path: '/' });

    // Set cache control headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error: any) {
    console.error('Logout API error:', error);
    const errorResponse = NextResponse.json(
      { message: error.message || 'Logout failed' },
      { status: 500 }
    );
    errorResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return errorResponse;
  }
}