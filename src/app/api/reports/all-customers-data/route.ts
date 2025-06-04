import { NextRequest, NextResponse } from 'next/server';
import { db, auth as firebaseAdminAuth } from '@/lib/firebaseAdmin';
import { cookies } from 'next/headers';
import { CustomerInfo } from '@/types/loan';

export async function GET(request: NextRequest) {
  if (!firebaseAdminAuth || !db) {
    console.error("API Error: Firebase Admin SDK not initialized for GET /api/reports/all-customers-data. Check server logs.");
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

    const customersSnapshot = await db.collection('users').doc(userId).collection('customers').get();
    const customersData: CustomerInfo[] = [];
    customersSnapshot.forEach(doc => {
      customersData.push({ id: doc.id, ...doc.data() } as CustomerInfo);
    });

    console.log(`[API /api/reports/all-customers-data]`);
    console.log('[API /api/reports/all-customers-data] Data being sent:');

    return NextResponse.json(customersData);

  } catch (error: any) {
    console.error('Error fetching all customers data for report:', error);
    if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/session-cookie-revoked' || error.code === 'auth/argument-error') {
      const response = NextResponse.json({ message: 'Authentication error: ' + error.message, requiresReauth: true }, { status: 401 });
      response.cookies.set({ name: 'auth-session', value: '', maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      return response;
    }
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: 'Failed to fetch customer data', error: errorMessage }, { status: 500 });
  }
} 