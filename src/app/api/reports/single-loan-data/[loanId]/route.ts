import { NextRequest, NextResponse } from 'next/server';
import { db, auth as firebaseAdminAuth } from '@/lib/firebaseAdmin';
import { cookies } from 'next/headers';
import { Loan, CustomerInfo } from '@/types/loan';

interface Params {
  loanId: string;
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  if (!firebaseAdminAuth || !db) {
    console.error("API Error: Firebase Admin SDK not initialized for GET /api/reports/single-loan-data. Check server logs.");
    return NextResponse.json({ message: "Server configuration error." }, { status: 500 });
  }
  
  const { loanId } = params;
  if (!loanId) {
    return NextResponse.json({ message: 'Loan ID is required.' }, { status: 400 });
  }

  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('auth-session')?.value;

  if (!sessionCookie) {
    return NextResponse.json({ message: 'Authentication required. No session cookie found.' }, { status: 401 });
  }

  try {
    const decodedClaims = await firebaseAdminAuth.verifySessionCookie(sessionCookie, true /* checkRevoked */);
    const userId = decodedClaims.uid;

    const loanDoc = await db.collection('loans').doc(loanId).get();
    if (!loanDoc.exists) {
      return NextResponse.json({ message: 'Loan not found.' }, { status: 404 });
    }
    const loanData = { id: loanDoc.id, ...loanDoc.data() } as Loan;

    if (loanData.userId !== userId) {
      return NextResponse.json({ message: 'Unauthorized to access this loan.' }, { status: 403 });
    }

    const customerDoc = await db.collection('users').doc(loanData.userId)
                              .collection('customers').doc(loanData.customerId)
                              .get();
                              
    if (!customerDoc.exists) {
      return NextResponse.json({ message: 'Associated customer not found in user subcollection.' }, { status: 404 }); 
    }
    const customerData = { id: customerDoc.id, ...customerDoc.data() } as CustomerInfo;
    
    console.log(`[API /api/reports/single-loan-data] Found loan ${loanId} and customer ${customerData.id} for userId: ${userId}`);
    return NextResponse.json({ loan: loanData, customer: customerData });

  } catch (error: any) {
    console.error(`Error fetching single loan data for report (Loan ID: ${loanId}):`, error);
    if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/session-cookie-revoked' || error.code === 'auth/argument-error') {
      const response = NextResponse.json({ message: 'Authentication error: ' + error.message, requiresReauth: true }, { status: 401 });
      response.cookies.set({ name: 'auth-session', value: '', maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      return response;
    }
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Failed to fetch loan details', error: errorMessage }, { status: 500 });
  }
} 