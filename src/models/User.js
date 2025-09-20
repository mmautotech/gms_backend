import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true   // ✅ always store as lowercase
    },
    passwordHash: {
        type: String,
        required: true
    },
    userType: {
        type: String,
        enum: ['admin', 'sales', 'customer_service', 'parts', 'accounts'], // ✅ new roles
        default: 'sales' // default role can be 'sales' or whatever fits your app
    }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
