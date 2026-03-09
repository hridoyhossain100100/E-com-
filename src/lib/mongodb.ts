import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        // @database-optimizer: Connection pooling & performance tuning
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,           // Max concurrent connections (default 5 is too low for production)
            minPoolSize: 2,            // Keep minimum connections warm
            serverSelectionTimeoutMS: 5000,  // Fail fast if DB unreachable
            socketTimeoutMS: 45000,    // Close sockets after 45s of inactivity
            maxIdleTimeMS: 30000,      // Release idle connections after 30s
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default connectToDatabase;
