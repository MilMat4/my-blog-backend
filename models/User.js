import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'superadmin'], default: 'user', required: true },
    emailVerified: { type: Boolean, default: true, required: true },
    emailVerificationCodeHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    emailVerificationSentAt: { type: Date, select: false },
    emailVerificationAttempts: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
)

const User = mongoose.model('User', userSchema)

export default User
