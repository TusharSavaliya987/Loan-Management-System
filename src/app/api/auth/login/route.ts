import { NextResponse } from 'next/server';

// This route is currently not the primary login method as client-side handles Firebase auth.
// If a server-side login action (e.g., setting httpOnly cookies after client auth) is needed,
// this route should be refactored to use Firebase Admin SDK to verify an ID token from the client.

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // TODO: If this route is intended for server-side session management,
    // it should expect an ID token from the client, verify it with Firebase Admin SDK,
    // and then create a session cookie or perform other server-side actions.
    // For now, it returns a message indicating client-side login is preferred.

    console.warn("/api/auth/login was called, but client-side login via authStore is the primary method. This route may be deprecated or needs refactoring for server-side session management.");

    return NextResponse.json({
      message: 'Server-side login endpoint. Client-side login is primary. This route needs refactoring if server sessions are required.',
      // No user data is returned here as client handles actual Firebase login.
    }, { status: 200 }); // Returning 200 to not break if something still calls it, but with a clear message.

  } catch (error: any) {
    console.error('Error in /api/auth/login (placeholder):', error);
    return NextResponse.json(
      { message: error.message || 'An error occurred' },
      { status: 500 } // General server error if parsing request fails
    );
  }
}