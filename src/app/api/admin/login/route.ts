import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
        const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

        const body = await req.json();
        const { password } = body;

        if (password === ADMIN_PASSWORD) {
            const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });

            // Using Awaitable cookies for Next.js 15
            const cookieStore = await cookies();

            cookieStore.set('admin_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 24 * 60 * 60, // 24 hours in seconds
                path: '/'
            });

            return NextResponse.json({ message: 'Login successful' });
        }

        return NextResponse.json({ message: 'Invalid password' }, { status: 401 });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
