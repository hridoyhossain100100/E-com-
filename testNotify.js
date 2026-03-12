const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Manually parse .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  let val = match ? match[1] : undefined;
  return val ? val.trim().replace(/^"|"$/g, '').trim() : undefined;
};

const stripQuotes = (str) => str ? str.trim().replace(/^"|"$/g, '').trim() : undefined;

const formatPrivateKey = (key) => {
  if (!key) return undefined;
  const stripped = stripQuotes(key);
  return stripped.replace(/\\n/g, '\n');
};

const projectId = stripQuotes(getEnvVar('FIREBASE_PROJECT_ID'));
const clientEmail = stripQuotes(getEnvVar('FIREBASE_CLIENT_EMAIL'));
const privateKeyRaw = getEnvVar('FIREBASE_PRIVATE_KEY');
const privateKey = formatPrivateKey(privateKeyRaw);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}

async function sendTestNotification() {
    const message = {
        notification: {
            title: 'Test Notification',
            body: 'Firebase setup is working!',
        },
        topic: 'admin_orders',
        android: {
            notification: {
                sound: 'default',
                priority: 'high',
            },
        },
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent push notification:', response);
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
}

sendTestNotification();
