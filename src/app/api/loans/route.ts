import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify the token
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get all loans for the user where status is not 'permanently_deleted'
    const loansSnapshot = await adminDb
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
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify the token
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

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
    const loanRef = await adminDb.collection('loans').add(loanWithMetadata);
    
    // Get the created loan
    const newLoan = await loanRef.get();
    
    // Return the new loan with its ID
    return NextResponse.json({
      id: newLoan.id,
      ...newLoan.data()
    });
  } catch (error: any) {
    console.error('Error in POST /api/loans:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 