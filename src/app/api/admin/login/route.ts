import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

// @security-audit [broken-authentication]: Rate limiting map for brute-force protection
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function getClientIP(req: Request): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: Request) {
    try {
        const clientIP = getClientIP(req);

        // @security-audit [broken-authentication]: Check rate limit
        const attempts = loginAttempts.get(clientIP);
        if (attempts && attempts.count >= MAX_ATTEMPTS) {
            const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
            if (timeSinceLastAttempt < LOCKOUT_DURATION) {
                const remainingMinutes = Math.ceil((LOCKOUT_DURATION - timeSinceLastAttempt) / 60000);
                return NextResponse.json(
                    { message: `Too many login attempts. Try again in ${remainingMinutes} minutes.` },
                    { status: 429 }
                );
            }
            // Reset after lockout period
            loginAttempts.delete(clientIP);
        }

        const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || 'admin123').trim();
        const JWT_SECRET = (process.env.JWT_SECRET || 'fallback_secret').trim();

        // @security-audit [security-misconfiguration]: Warn if using default credentials
        if (JWT_SECRET === 'fallback_secret' && process.env.NODE_ENV === 'production') {
            console.error('⚠️ SECURITY WARNING: Using fallback JWT secret in production!');
        }

        const body = await req.json();
        const { password } = body;


        // @security-audit [xss-html-injection]: Validate input type
        if (!password || typeof password !== 'string' || password.length > 128) {
            return NextResponse.json({ message: 'Invalid password format' }, { status: 400 });
        }

        if (password === ADMIN_PASSWORD) {
            // @security-audit: Reset attempts on successful login
            loginAttempts.delete(clientIP);

            const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });

            const cookieStore = await cookies();

            cookieStore.set('admin_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict', // @security-audit: Upgraded from 'lax' to 'strict' for CSRF protection
                maxAge: 24 * 60 * 60,
                path: '/'
            });

            return NextResponse.json({ message: 'Login successful' });
        }

        // @security-audit [broken-authentication]: Track failed attempts
        const currentAttempts = loginAttempts.get(clientIP) || { count: 0, lastAttempt: 0 };
        loginAttempts.set(clientIP, {
            count: currentAttempts.count + 1,
            lastAttempt: Date.now()
        });

        const remaining = MAX_ATTEMPTS - (currentAttempts.count + 1);

        // @security-audit: Generic error message (don't reveal if account exists)
        return NextResponse.json(
            { message: 'Invalid credentials', attemptsRemaining: Math.max(0, remaining) },
            { status: 401 }
        );
    } catch (error: any) {
        console.error('Login error:', error);
        // @security-audit: Don't leak error details to client
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
