import { NextResponse } from 'next/server';
import { db, auth as firebaseAdminAuth } from '@/lib/firebaseAdmin';
import { cookies } from 'next/headers';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  if (!firebaseAdminAuth || !db) {
    console.error("API Error: Firebase Admin SDK not initialized for PUT /api/loans/update/[id]. Check server logs.");
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
    const updates = await request.json();

    if (!loanId) {
      return NextResponse.json({ message: 'Loan ID is required.' }, { status: 400 });
    }

    const loanRef = db.collection('loans').doc(loanId);
    const loanDoc = await loanRef.get();

    if (!loanDoc.exists) {
      return NextResponse.json({ message: 'Loan not found.' }, { status: 404 });
    }

    if (loanDoc.data()?.userId !== userId) {
      return NextResponse.json({ message: 'Unauthorized to update this loan.' }, { status: 403 });
    }
    
    // If remarks are sent as an empty string, remove them to avoid storing null
    if (updates.remarks === '') {
      delete updates.remarks;
    }

    updates.updatedAt = new Date().toISOString();

    await loanRef.update(updates);
    const updatedLoan = await loanRef.get();

    return NextResponse.json({
      id: updatedLoan.id,
      ...updatedLoan.data()
    });

  } catch (error: any) {
    console.error('Error in PUT /api/loans/update/[id]:', error);
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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!firebaseAdminAuth || !db) {
    console.error("API Error: Firebase Admin SDK not initialized for PATCH /api/loans/update/[id]. Check server logs.");
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
    const updates = await request.json();

    if (!loanId) {
      return NextResponse.json({ message: 'Loan ID is required.' }, { status: 400 });
    }

    const loanRef = db.collection('loans').doc(loanId);
    const loanDoc = await loanRef.get();

    if (!loanDoc.exists) {
      return NextResponse.json({ message: 'Loan not found.' }, { status: 404 });
    }

    if (loanDoc.data()?.userId !== userId) {
      return NextResponse.json({ message: 'Unauthorized to update this loan.' }, { status: 403 });
    }
    
    // If remarks are sent as an empty string, remove them to avoid storing null
    if (updates.remarks === '') {
      delete updates.remarks;
    }

    updates.updatedAt = new Date().toISOString();

    await loanRef.update(updates);
    const updatedLoan = await loanRef.get();

    return NextResponse.json({
      id: updatedLoan.id,
      ...updatedLoan.data()
    });

  } catch (error: any) {
    console.error('Error in PATCH /api/loans/update/[id]:', error);
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