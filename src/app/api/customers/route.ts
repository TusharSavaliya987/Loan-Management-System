import { NextRequest, NextResponse } from "next/server";
import { db, auth as firebaseAdminAuth } from "@/lib/firebaseAdmin";
import type { CustomerInfo } from '@/types/loan'; // Ensure this path is correct
import { cookies } from 'next/headers'; // Import cookies

// Handle GET request - fetch customers for the authenticated user
export async function GET(request: NextRequest) {
  if (!firebaseAdminAuth || !db) {
    console.error("API Error: Firebase Admin SDK not initialized. Check server logs for FIREBASE_ADMIN_KEY issues.");
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

    const customersSnapshot = await db.collection('users').doc(userId).collection('customers').orderBy('name').get();
    
    const customers: CustomerInfo[] = customersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<CustomerInfo, 'id' | 'userId'>),
    }));
    
    return NextResponse.json(customers, { status: 200 });
  } catch (error: any) {
    console.error("Error in GET /api/customers:", error);
    if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/session-cookie-revoked' || error.code === 'auth/argument-error') {
      // Clear the invalid cookie from the client
      const response = NextResponse.json({ message: 'Authentication error: ' + error.message }, { status: 401 });
      response.cookies.set({ name: 'auth-session', value: '', maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      return response;
    }
    return NextResponse.json({ message: error.message || "Failed to fetch customers" }, { status: 500 });
  }
}

// Handle POST request - add a customer for the authenticated user
export async function POST(request: NextRequest) {
  if (!firebaseAdminAuth || !db) {
    console.error("API Error: Firebase Admin SDK not initialized. Check server logs for FIREBASE_ADMIN_KEY issues.");
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

    const body: Omit<CustomerInfo, 'id' | 'userId'> = await request.json();

    if (!body.name || !body.email || !body.mobile) {
      return NextResponse.json(
        { message: "Missing required fields: name, email, mobile" },
        { status: 400 }
      );
    }

    const customerData = {
      ...body,
      userId, // Associate customer with the authenticated user
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('users').doc(userId).collection('customers').add(customerData);
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...body 
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/customers:", error);
    if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/session-cookie-revoked' || error.code === 'auth/argument-error') {
      // Clear the invalid cookie from the client
      const response = NextResponse.json({ message: 'Authentication error: ' + error.message }, { status: 401 });
      response.cookies.set({ name: 'auth-session', value: '', maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      return response;
    }
    return NextResponse.json({ message: error.message || "Failed to add customer" }, { status: 500 });
  }
}
