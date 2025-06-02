import { NextResponse } from 'next/server';
import { db, auth as firebaseAdminAuth } from '@/lib/firebaseAdmin';
import { cookies } from 'next/headers';
import { Loan, InterestPayment } from '@/types/loan'; // Assuming these types are correctly defined

interface MarkInterestPaidRequestBody {
  paymentId: string;
  paidOn: string; // ISO date string
  remarks?: string;
  amount?: number; // Optional: manually entered paid amount
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!firebaseAdminAuth || !db) {
    console.error("API Error: Firebase Admin SDK not initialized for PATCH /api/loans/[id]/mark-interest-paid. Check server logs.");
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

    const body: MarkInterestPaidRequestBody = await request.json();
    const { paymentId, paidOn, remarks, amount: manualAmount } = body;

    if (!paymentId || !paidOn) {
      return NextResponse.json({ message: 'Payment ID and Paid On date are required.' }, { status: 400 });
    }

    // Validate paidOn date format (basic validation, more robust can be added)
    try {
      new Date(paidOn).toISOString();
    } catch (e) {
      return NextResponse.json({ message: 'Invalid Paid On date format. Please use ISO format.' }, { status: 400 });
    }
    
    if (manualAmount !== undefined && (typeof manualAmount !== 'number' || manualAmount < 0)) {
        return NextResponse.json({ message: 'Invalid manual amount. Must be a non-negative number.' }, { status: 400 });
    }

    const loanRef = db.collection('loans').doc(loanId);
    const loanDoc = await loanRef.get();

    if (!loanDoc.exists) {
      return NextResponse.json({ message: 'Loan not found.' }, { status: 404 });
    }

    const loanData = loanDoc.data() as Loan;

    if (loanData.userId !== userId) {
      return NextResponse.json({ message: 'Unauthorized to update this loan.' }, { status: 403 });
    }

    const interestPayments = loanData.interestPayments ? [...loanData.interestPayments] : [];
    const paymentIndex = interestPayments.findIndex(p => p.id === paymentId);

    if (paymentIndex === -1) {
      return NextResponse.json({ message: 'Interest payment not found within the loan.' }, { status: 404 });
    }
    
    const paymentToUpdate = interestPayments[paymentIndex];

    // Determine the amount paid
    // If manualAmount is provided and valid, use it. Otherwise, use the scheduled payment amount.
    const amountEffectivelyPaid = (typeof manualAmount === 'number' && manualAmount >= 0)
                                  ? manualAmount
                                  : paymentToUpdate.amount;

    // Update the specific payment
    interestPayments[paymentIndex] = {
      ...paymentToUpdate,
      status: 'paid',
      paidOn: new Date(paidOn).toISOString(), 
      remarks: remarks || paymentToUpdate.remarks || null, 
      amountPaid: amountEffectivelyPaid, // Store the actual amount paid
    };

    const updates = {
      interestPayments: interestPayments,
      updatedAt: new Date().toISOString(),
    };

    await loanRef.update(updates);
    const updatedLoanDoc = await loanRef.get();
    const updatedLoanData = { id: updatedLoanDoc.id, ...updatedLoanDoc.data() };

    return NextResponse.json(updatedLoanData);

  } catch (error: any) {
    console.error('Error in PATCH /api/loans/[id]/mark-interest-paid:', error);
    if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/session-cookie-revoked' || error.code === 'auth/argument-error') {
      const response = NextResponse.json({ message: 'Authentication error: ' + error.message }, { status: 401 });
      // Clear the invalid session cookie
      response.cookies.set({ name: 'auth-session', value: '', maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      return response;
    }
    if (error instanceof SyntaxError) { // Handle JSON parsing errors
        return NextResponse.json({ message: 'Invalid request body: Malformed JSON.' }, { status: 400 });
    }
    return NextResponse.json(
      { message: error.message || 'Internal server error during mark interest paid.' },
      { status: 500 }
    );
  }
} 