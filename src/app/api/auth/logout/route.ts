import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
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
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0
    });
    
    // Optional: If you were using Firebase Admin SDK to manage sessions and wanted to revoke it:
    // const sessionCookie = request.cookies.get('auth-session')?.value;
    // if (sessionCookie) {
    //   try {
    //     const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
    //     await adminAuth.revokeRefreshTokens(decodedClaims.sub);
    //   } catch (revokeError) {
    //     console.warn("Failed to revoke session cookie during logout:", revokeError);
    //     // Still proceed to clear cookie from client
    //   }
    // }

    // Set cache control headers to prevent caching of the logout response
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