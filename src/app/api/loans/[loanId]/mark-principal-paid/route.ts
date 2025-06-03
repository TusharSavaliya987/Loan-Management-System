import { NextRequest, NextResponse } from 'next/server';
import { db, auth as firebaseAdminAuth } from '@/lib/firebaseAdmin'; 
import { Loan } from '@/types/loan';
import { cookies } from 'next/headers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { loanId: string } }
) {
  if (!firebaseAdminAuth || !db) {
    console.error("API Error: Firebase Admin SDK not initialized for PATCH /api/loans/[loanId]/mark-principal-paid. Check server logs.");
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

    if (loanData.userId !== userId) { 
      return NextResponse.json({ error: 'Forbidden: You are not authorized to modify this loan.' }, { status: 403 });
    }

    if (loanData.principalPaid && loanData.status === 'closed') {
      return NextResponse.json({ message: 'Loan already closed and principal marked as paid.', loan: loanData }, { status: 200 });
    }

    const updates: Partial<Loan> = {
      principalPaid: true,
      status: 'closed',
      updatedAt: new Date().toISOString(), // Add/update timestamp
    };

    await loanRef.update(updates);

    const updatedLoanDoc = await loanRef.get();
    const updatedLoan = { id: updatedLoanDoc.id, ...updatedLoanDoc.data() } as Loan;

    return NextResponse.json(updatedLoan, { status: 200 });

  } catch (error: any) {
    console.error('Error marking principal paid:', error);
    if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/session-cookie-revoked' || error.code === 'auth/argument-error') {
      const response = NextResponse.json({ message: 'Authentication error: ' + error.message }, { status: 401 });
      response.cookies.set({ name: 'auth-session', value: '', maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      return response;
    }
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
} 