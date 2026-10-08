import 'dotenv/config'
import mongoose from 'mongoose'
import app from './app.js'

const isProduction = process.env.NODE_ENV === 'production'
const port = Number(process.env.API_PORT || (isProduction ? process.env.PORT : undefined)) || 3000

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required. Set the MongoDB connection string in .env.')
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.')
}

try {
  await mongoose.connect(process.env.MONGODB_URI)
  app.listen(port, () => {
    console.log(`API server listening on http://localhost:${port}`)
  })
} catch (error) {
  console.error('Could not connect to MongoDB:', error.message)
  process.exitCode = 1
}
