const fs = require('fs');
const admin = require('firebase-admin');

function parseEnv(content) {
  const env = {};
  const lines = content.replace(/\r/g, '').split('\n');
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      env[key] = value;
    }
  });
  return env;
}

function reformatPEM(key) {
  // Remove existing headers, footers, and all whitespace/newlines
  let content = key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\\n/g, '')
    .replace(/\s/g, '');
  
  // Reconstruct with standard headers and 64-char lines
  const header = '-----BEGIN PRIVATE KEY-----\n';
  const footer = '\n-----END PRIVATE KEY-----\n';
  const lines = content.match(/.{1,64}/g).join('\n');
  
  return header + lines + footer;
}

try {
  const content = fs.readFileSync('.env.local', 'utf8');
  const env = parseEnv(content);
  
  const projectId = env['FIREBASE_PROJECT_ID'];
  const clientEmail = env['FIREBASE_CLIENT_EMAIL'];
  const rawKey = env['FIREBASE_PRIVATE_KEY'];

  if (rawKey) {
    const formattedKey = reformatPEM(rawKey);
    console.log('Formatted Key (first 100):', JSON.stringify(formattedKey.substring(0, 100)));

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedKey,
      }),
    });
    console.log('Success: Firebase Admin initialized with reformatted PEM!');
  } else {
    console.log('Error: FIREBASE_PRIVATE_KEY not found in .env.local');
  }
} catch (err) {
  console.error('Error:', err.message);
}
