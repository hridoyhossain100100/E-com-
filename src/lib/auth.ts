import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

const JWT_SECRET = (process.env.JWT_SECRET || 'fallback_secret').trim();

export async function verifyAdmin(): Promise<boolean> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('admin_token')?.value;
        if (!token) return false;

        const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
        return decoded.role === 'admin';
    } catch {
        return false;
    }
}

export function unauthorizedResponse() {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}
