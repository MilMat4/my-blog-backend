import cookieParser from 'cookie-parser'
import express from 'express'
import mongoose from 'mongoose'
import { uploadDirectory } from './services/postImageStorage.js'
import authRoutes from './routes/authRoutes.js'
import postRoutes from './routes/postRoutes.js'
import userRoutes from './routes/userRoutes.js'

const app = express()

app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())
app.use('/uploads', express.static(uploadDirectory, {
  dotfiles: 'deny',
  index: false,
  maxAge: '1d',
  setHeaders(response) {
    response.setHeader('X-Content-Type-Options', 'nosniff')
  },
}))

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })
})

app.use('/api/auth', authRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/users', userRoutes)

app.use((error, _request, response, _next) => {
  if (response.headersSent) {
    return
  }

  if (error.code === 11000) {
    return response.status(409).json({ error: 'An account with this email already exists.' })
  }

  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({ error: 'Request body must contain valid JSON.' })
  }

  if (error.name === 'MulterError') {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Post images must be 5 MB or smaller.'
      : 'The post image upload could not be processed.'
    return response.status(400).json({ error: message })
  }

  if (error.message === 'Post images must be JPEG, PNG, WebP, or GIF files.') {
    return response.status(400).json({ error: error.message })
  }

  console.error('API request failed:', error)
  response.status(500).json({ error: 'An unexpected server error occurred.' })
})

export default app
