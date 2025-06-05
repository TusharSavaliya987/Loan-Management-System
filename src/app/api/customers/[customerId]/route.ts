import { NextResponse } from 'next/server';
import { db, auth as firebaseAdminAuth } from '@/lib/firebaseAdmin';
import { cookies } from 'next/headers';

export async function DELETE(
  request: Request,
  { params }: { params: { customerId: string } }
) {
  console.log(`Entering DELETE /api/customers/[customerId] with params:`, params);

  if (!firebaseAdminAuth || !db) {
    console.error("API Error: Firebase Admin SDK not initialized for DELETE /api/customers/[customerId]. Check server logs.");
    return NextResponse.json({ message: "Server configuration error." }, { status: 500 });
  }

  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('auth-session')?.value;

  if (!sessionCookie) {
    console.log("No session cookie found.");
    return NextResponse.json({ message: 'Authentication required. No session cookie found.' }, { status: 401 });
  }

  try {
    const decodedClaims = await firebaseAdminAuth.verifySessionCookie(sessionCookie, true /* checkRevoked */);
    const userId = decodedClaims.uid;
    const customerId = params.customerId;

    if (!customerId) {
      console.log("Customer ID is missing in params.");
      return NextResponse.json({ message: 'Customer ID is required.' }, { status: 400 });
    }

    const customerRef = db.collection('users').doc(userId).collection('customers').doc(customerId);
    console.log(`Fetching customer document from Firestore`);
    const customerDoc = await customerRef.get();

    if (!customerDoc.exists) {
      console.log(`Customer document users does not exist.`);
      return NextResponse.json({ message: 'Customer not found.' }, { status: 404 });
    }

    const customerData = customerDoc.data();
    console.log(`Customer data retrieved:`);

    console.log(`Checking for active loans for customerId`);
    const loansSnapshot = await db.collection('loans')
      .where('customerId', '==', customerId)
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!loansSnapshot.empty) {
      console.log(`Customer ${customerId} has active loans. Deletion prevented.`);
      return NextResponse.json({ message: 'Cannot delete customer. They have active loans.'}, { status: 400 });
    }
    
    console.log(`Proceeding to delete customer document: users/${userId}/customers/${customerId}`);
    await customerRef.delete();
    console.log(`Customer document users/${userId}/customers/${customerId} deleted successfully.`);

    return NextResponse.json({ message: 'Customer permanently deleted successfully.' });

  } catch (error: any) {
    console.error('Error in DELETE /api/customers/[customerId]:', error);
    if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/session-cookie-revoked' || error.code === 'auth/argument-error') {
      const response = NextResponse.json({ message: 'Authentication error: ' + error.message }, { status: 401 });
      response.cookies.set({ name: 'auth-session', value: '', maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      return response;
    }
    return NextResponse.json(
      { message: error.message || 'Internal server error while deleting customer.' },
      { status: 500 }
    );
  }
} 