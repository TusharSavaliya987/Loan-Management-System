import { NextRequest, NextResponse } from 'next/server';
import { db, auth as firebaseAdminAuth } from '@/lib/firebaseAdmin';
import { cookies } from 'next/headers';
import { Loan, CustomerInfo } from '@/types/loan';
import { FieldPath } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  if (!firebaseAdminAuth || !db) {
    console.error("API Error: Firebase Admin SDK not initialized for GET /api/reports/all-loans-data. Check server logs.");
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let loansQuery = db.collection('loans').where('userId', '==', userId);

    if (status && status !== 'all') {
      loansQuery = loansQuery.where('status', '==', status);
    }

    const loansSnapshot = await loansQuery.get();
    const loansData: Loan[] = [];
    loansSnapshot.forEach(doc => {
      loansData.push({ id: doc.id, ...doc.data() } as Loan);
    });

    if (loansData.length === 0) {
      return NextResponse.json([]); // Return empty array if no loans
    }

    const customerIds = Array.from(new Set(loansData.map(loan => loan.customerId)));
    const customersMap = new Map<string, CustomerInfo>();

    if (customerIds.length > 0) {
      const customerChunks = [];
      for (let i = 0; i < customerIds.length; i += 30) { // Firestore 'in' query limit
        customerChunks.push(customerIds.slice(i, i + 30));
      }

      for (const chunk of customerChunks) {
        if (chunk.length > 0) {
          const customersSnapshot = await db.collection('users').doc(userId)
                                        .collection('customers')
                                        .where(FieldPath.documentId(), 'in', chunk)
                                        .get();
          customersSnapshot.forEach(doc => {
            customersMap.set(doc.id, { id: doc.id, ...doc.data() } as CustomerInfo);
          });
        }
      }
    }
    
    const reportData = loansData.map(loan => ({
      loan,
      customer: customersMap.get(loan.customerId) || null // Ensure customer can be null if not found
    })).filter(item => item.customer !== null); // Filter out loans with no matching customer for safety

    console.log(`[API /api/reports/all-loans-data] Prepared ${userId}`);
    return NextResponse.json(reportData);

  } catch (error: any) {
    console.error('Error fetching all loans data for report:', error);
    if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/session-cookie-revoked' || error.code === 'auth/argument-error') {
      const response = NextResponse.json({ message: 'Authentication error: ' + error.message, requiresReauth: true }, { status: 401 });
      response.cookies.set({ name: 'auth-session', value: '', maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      return response;
    }
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Failed to fetch loan data', error: errorMessage }, { status: 500 });
  }
} 