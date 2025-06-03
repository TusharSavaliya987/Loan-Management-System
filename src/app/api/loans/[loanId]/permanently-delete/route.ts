import { NextRequest, NextResponse } from 'next/server';
import { db, auth as firebaseAdminAuth } from '@/lib/firebaseAdmin';
import { cookies } from 'next/headers';
import { Loan } from '@/types/loan';

export async function DELETE(
  request: NextRequest, 
  { params }: { params: { loanId: string } }
) {
  if (!firebaseAdminAuth || !db) {
    console.error("API Error: Firebase Admin SDK not initialized for DELETE /api/loans/[loanId]/permanently-delete. Check server logs.");
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
    const { loanId } = params;

    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    const loanRef = db.collection('loans').doc(loanId);
    const loanDoc = await loanRef.get();

    if (!loanDoc.exists) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const loanData = loanDoc.data() as Loan;

    // Authorization check: ensure the authenticated user owns this loan
    if (loanData.userId !== userId) { 
      return NextResponse.json({ error: 'Forbidden: You are not authorized to delete this loan.' }, { status: 403 });
    }

    // Perform the permanent deletion
    await loanRef.delete();

    return NextResponse.json({ message: 'Loan permanently deleted successfully.' }, { status: 200 }); // Or 204 No Content

  } catch (error: any) {
    console.error('Error permanently deleting loan:', error);
    if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/session-cookie-revoked' || error.code === 'auth/argument-error') {
      const response = NextResponse.json({ message: 'Authentication error: ' + error.message }, { status: 401 });
      response.cookies.set({ name: 'auth-session', value: '', maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      return response;
    }
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
} 