import { NextResponse } from 'next/server';
import { db, auth as firebaseAdminAuth } from '@/lib/firebaseAdmin';
import { cookies } from 'next/headers';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!firebaseAdminAuth || !db) {
    console.error("API Error: Firebase Admin SDK not initialized for DELETE /api/loans/delete/[id]. Check server logs.");
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

    const loanId = params.id;

    if (!loanId) {
      return NextResponse.json({ message: 'Loan ID is required.' }, { status: 400 });
    }

    const loanRef = db.collection('loans').doc(loanId);
    const loanDoc = await loanRef.get();

    if (!loanDoc.exists) {
      return NextResponse.json({ message: 'Loan not found.' }, { status: 404 });
    }

    if (loanDoc.data()?.userId !== userId) {
      return NextResponse.json({ message: 'Unauthorized to delete this loan.' }, { status: 403 });
    }

    await loanRef.update({
      status: 'deleted',
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ message: 'Loan moved to trash.' });
  } catch (error: any) {
    console.error('Error in DELETE /api/loans/delete/[id]:', error);
    if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/session-cookie-revoked' || error.code === 'auth/argument-error') {
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