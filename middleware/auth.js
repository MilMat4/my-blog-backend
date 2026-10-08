import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const cookieName = 'blog_token'
const isProduction = process.env.NODE_ENV === 'production'

function clearAuthCookie(response) {
  response.clearCookie(cookieName, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  })
}

export async function authenticate(request, response, next) {
  const token = request.cookies[cookieName]
  if (!token) {
    return response.status(401).json({ error: 'Not signed in.' })
  }

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      clearAuthCookie(response)
      return response.status(401).json({ error: 'Not signed in.' })
    }

    return next(error)
  }

  const user = await User.findById(payload.sub)
  if (!user) {
    clearAuthCookie(response)
    return response.status(401).json({ error: 'Not signed in.' })
  }

  request.user = user
  return next()
}

export function requireSuperadmin(request, response, next) {
  if (request.user.role !== 'superadmin') {
    return response.status(403).json({ error: 'Superadmin access is required.' })
  }

  return next()
}
