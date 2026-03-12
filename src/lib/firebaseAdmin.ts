import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!privateKey || !clientEmail || !projectId) {
      console.warn('Firebase Admin environment variables are missing. Notifications may not work.');
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n').replace(/\r/g, '').replace(/^"|"$/g, '').trim(),
        }),
      });
      console.log('Firebase Admin Initialized Successfully via Environment Variables');
    }
  } catch (error: any) {
    console.error('Firebase Admin Initialization Error:', error.message);
  }
}

export const adminDb = admin.firestore();
export const adminMessaging = admin.messaging();

export default admin;
