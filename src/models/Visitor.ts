import mongoose from 'mongoose';

const VisitorSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    lastSeen: { type: Date, default: Date.now, expires: 60 } // TTL index: auto-delete after 60 seconds
}, { timestamps: true });

export default mongoose.models.Visitor || mongoose.model('Visitor', VisitorSchema);
