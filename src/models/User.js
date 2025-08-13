import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true, trim: true },
    passwordHash: { type: String, required: true },
    userType: { type: String, enum: ['admin', 'staff'], default: 'staff' }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
