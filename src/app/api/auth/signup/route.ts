import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    return NextResponse.json({
      message: 'Signup successful',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      }
    });

  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { message: error.message || 'Signup failed' },
      { status: 400 }
    );
  }
}