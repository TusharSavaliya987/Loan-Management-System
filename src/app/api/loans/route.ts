import { NextResponse } from 'next/server';
import { db, auth as firebaseAdminAuth } from '@/lib/firebaseAdmin';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  if (!firebaseAdminAuth || !db) {
    console.error("API Error: Firebase Admin SDK not initialized for /api/loans. Check server logs.");
    return NextResponse.json({ message: "Server configuration error." }, { status: 500 });
  }

  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('auth-session')?.value;

  if (!sessionCookie) {
    return NextResponse.json({ message: 'Authentication required. No session cookie found.' }, { status: 401 });
  }
  
  try {
    const decodedClaims = await firebaseAdminAuth.verifySessionCookie(sessionCookie, true /* checkRevoked */);
    const userId = decodedClaims.uid;

    // Get all loans for the user where status is not 'permanently_deleted'
    const loansSnapshot = await db
      .collection('loans')
      .where('userId', '==', userId)
      .where('status', '!=', 'permanently_deleted')
      .get();

    const loans = loansSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(loans);
  } catch (error: any) {
    console.error('Error in GET /api/loans:', error);
    if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/session-cookie-revoked' || error.code === 'auth/argument-error') {
      // Clear the invalid cookie from the client
      const response = NextResponse.json({ message: 'Authentication error: ' + error.message }, { status: 401 });
      response.cookies.set({ name: 'auth-session', value: '', maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      return response;
    }
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!firebaseAdminAuth || !db) {
    console.error("API Error: Firebase Admin SDK not initialized for /api/loans. Check server logs.");
    return NextResponse.json({ message: "Server configuration error." }, { status: 500 });
  }
  
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('auth-session')?.value;

  if (!sessionCookie) {
    return NextResponse.json({ message: 'Authentication required. No session cookie found.' }, { status: 401 });
  }

  try {
    const decodedClaims = await firebaseAdminAuth.verifySessionCookie(sessionCookie, true /* checkRevoked */);
    const userId = decodedClaims.uid;

    // Get the loan data from the request body
    const loanData = await request.json();

    // Add userId and creation timestamp to the loan data
    const loanWithMetadata = {
      ...loanData,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    };

    // Add the loan to Firestore
    const loanRef = await db.collection('loans').add(loanWithMetadata);
    
    // Get the created loan
    const newLoan = await loanRef.get();
    
    // Return the new loan with its ID
    return NextResponse.json({
      id: newLoan.id,
      ...newLoan.data()
    });
  } catch (error: any) {
    console.error('Error in POST /api/loans:', error);
    if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/session-cookie-revoked' || error.code === 'auth/argument-error') {
      // Clear the invalid cookie from the client
      const response = NextResponse.json({ message: 'Authentication error: ' + error.message }, { status: 401 });
      response.cookies.set({ name: 'auth-session', value: '', maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      return response;
    }
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 