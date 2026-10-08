import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'

async function promoteSuperadmin() {
  const email = process.argv[2]?.trim().toLowerCase()
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required. Set the MongoDB connection string in .env.')
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Provide the email address of an existing user: npm run promote:superadmin -- admin@example.com')
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI)
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { role: 'superadmin' } },
      { returnDocument: 'after', runValidators: true },
    )
    if (!user) {
      throw new Error(`No account exists for ${email}. Register that account before promoting it.`)
    }

    console.log(`${user.email} is now a superadmin.`)
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }
  }
}

promoteSuperadmin().catch((error) => {
  console.error('Could not promote superadmin:', error.message)
  process.exitCode = 1
})
