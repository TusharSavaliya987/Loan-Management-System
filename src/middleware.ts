import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Only protect specific routes, not the root
const protectedPaths = ['/', '/loans', '/customers', '/dashboard'];
const authPaths = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const authSession = request.cookies.get('auth-session');
  const { pathname } = request.nextUrl;

  console.log('Middleware:', { pathname, hasAuth: !!authSession });

  // Skip middleware for API routes, static files, and _next internal routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.') // Catches .ico, .png, .js, .css etc. in public folder
  ) {
    return NextResponse.next();
  }

  const isAuthPath = authPaths.includes(pathname);

  // Handle authentication pages (e.g., /login, /signup)
  if (isAuthPath) {
    if (authSession) {
      // If user is authenticated, redirect them from auth pages to the main page (e.g., '/' or '/dashboard')
      console.log(`Redirecting to /: Authenticated user accessing auth path ${pathname}`);
      return NextResponse.redirect(new URL('/', request.url)); // Or '/dashboard' if preferred
    }
    // If user is not authenticated, allow access to auth pages
    console.log(`Allowing access to auth path: ${pathname}`);
    return NextResponse.next();
  }

  // Handle protected paths (all other paths covered by the matcher that are not authPaths)
  // This includes '/' as per protectedPaths array
  const isProtectedPath = protectedPaths.some(p => pathname.startsWith(p));

  if (isProtectedPath) {
    if (!authSession) {
      // If user is not authenticated, redirect them to the login page
      console.log(`Redirecting to /login: Unauthenticated user accessing protected path ${pathname}`);
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // If user is authenticated, allow access to the protected path
    console.log(`Allowing access to protected path: ${pathname}`);
    return NextResponse.next();
  }
  
  // Fallback for any routes not explicitly handled (though matcher should limit this)
  console.log(`Allowing by default (should be rare with specific matcher): ${pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/', // Matches the root
    '/loans/:path*',
    '/customers/:path*',
    '/dashboard/:path*', // Example: if /dashboard is a protected route
    '/login',
    '/signup',
  ],
};