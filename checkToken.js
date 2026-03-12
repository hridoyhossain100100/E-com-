const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  let val = match ? match[1] : undefined;
  return val ? val.trim().replace(/^"|"$/g, '').trim() : undefined;
};

const MONGO_URI = getEnvVar('MONGODB_URI');

const settingsSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);

async function checkToken() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        const tokenSetting = await Settings.findOne({ key: 'FCM_ADMIN_TOKEN' });
        if (tokenSetting) {
            console.log('FCM Token Found:', tokenSetting.value);
            return tokenSetting.value;
        } else {
            console.log('FCM Token NOT found in database.');
            return null;
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

checkToken();
