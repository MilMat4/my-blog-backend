import bcrypt from 'bcryptjs'
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { sendSignupOtp } from '../services/mailtrapSmtp.js'

const cookieName = 'blog_token'
const tokenLifetime = 7 * 24 * 60 * 60
const verificationCodeLifetime = 10 * 60 * 1000
const verificationResendCooldown = 60 * 1000
const verificationMaxAttempts = 5
const isProduction = process.env.NODE_ENV === 'production'

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

function createToken(user) {
  return jwt.sign({}, process.env.JWT_SECRET, {
    subject: user.id,
    expiresIn: tokenLifetime,
  })
}

function setAuthCookie(response, user) {
  response.cookie(cookieName, createToken(user), {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: tokenLifetime * 1000,
    path: '/',
  })
}

function clearAuthCookie(response) {
  response.clearCookie(cookieName, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  })
}

function createVerificationCode() {
  return String(randomInt(100000, 1000000))
}

function hashVerificationCode(email, code) {
  return createHmac('sha256', process.env.JWT_SECRET)
    .update(`${email}:${code}`)
    .digest('hex')
}

function clearVerificationCode(user) {
  user.emailVerificationCodeHash = undefined
  user.emailVerificationExpiresAt = undefined
  user.emailVerificationAttempts = 0
}

async function issueVerificationCode(user) {
  const code = createVerificationCode()
  user.emailVerificationCodeHash = hashVerificationCode(user.email, code)
  user.emailVerificationExpiresAt = new Date(Date.now() + verificationCodeLifetime)
  user.emailVerificationSentAt = new Date()
  user.emailVerificationAttempts = 0
  await user.save()
  await sendSignupOtp({ email: user.email, name: user.name, code })
}

export async function register(request, response) {
  const { name, email, password } = request.body ?? {}
  const normalizedName = typeof name === 'string' ? name.trim() : ''
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (!normalizedName || normalizedName.length > 80) {
    return response.status(400).json({ error: 'Name is required and must be 80 characters or fewer.' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return response.status(400).json({ error: 'Enter a valid email address.' })
  }

  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return response.status(400).json({ error: 'Password must be at least 8 characters and no more than 72 bytes.' })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    passwordHash,
    emailVerified: false,
  })

  try {
    await issueVerificationCode(user)
  } catch (error) {
    await user.deleteOne()
    throw error
  }

  return response.status(201).json({ verificationRequired: true, email: user.email })
}

export async function verifySignup(request, response) {
  const { email, code } = request.body ?? {}
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return response.status(400).json({ error: 'Enter the email address and six-digit code from your verification email.' })
  }

  const user = await User.findOne({ email: normalizedEmail })
    .select('+emailVerificationCodeHash +emailVerificationExpiresAt +emailVerificationAttempts')
  if (!user || user.emailVerified || !user.emailVerificationCodeHash) {
    return response.status(400).json({ error: 'That verification code is invalid or has expired.' })
  }

  if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt.getTime() <= Date.now()) {
    clearVerificationCode(user)
    await user.save()
    return response.status(400).json({ error: 'That verification code has expired. Request a new code and try again.' })
  }

  const expectedHash = Buffer.from(user.emailVerificationCodeHash, 'hex')
  const providedHash = Buffer.from(hashVerificationCode(normalizedEmail, code), 'hex')
  if (expectedHash.length !== providedHash.length || !timingSafeEqual(expectedHash, providedHash)) {
    user.emailVerificationAttempts += 1
    if (user.emailVerificationAttempts >= verificationMaxAttempts) {
      clearVerificationCode(user)
      await user.save()
      return response.status(429).json({ error: 'Too many incorrect codes. Request a new code to continue.' })
    }
    await user.save()
    return response.status(400).json({ error: 'That verification code is incorrect.' })
  }

  user.emailVerified = true
  clearVerificationCode(user)
  user.emailVerificationSentAt = undefined
  await user.save()
  setAuthCookie(response, user)
  return response.json({ user: publicUser(user) })
}

export async function resendSignupCode(request, response) {
  const { email } = request.body ?? {}
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return response.status(400).json({ error: 'Enter a valid email address.' })
  }

  const user = await User.findOne({ email: normalizedEmail, emailVerified: false })
    .select('+emailVerificationSentAt')
  if (!user) {
    return response.json({ message: 'If an unverified sign-up exists for this address, a new code will be sent.' })
  }

  const lastSentAt = user.emailVerificationSentAt?.getTime() || 0
  const waitMilliseconds = lastSentAt + verificationResendCooldown - Date.now()
  if (waitMilliseconds > 0) {
    return response.status(429).json({
      error: `Please wait ${Math.ceil(waitMilliseconds / 1000)} seconds before requesting another code.`,
    })
  }

  await issueVerificationCode(user)
  return response.json({ message: 'If an unverified sign-up exists for this address, a new code will be sent.' })
}

export async function login(request, response) {
  const { email, password } = request.body ?? {}
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (!normalizedEmail || typeof password !== 'string') {
    return response.status(400).json({ error: 'Email and password are required.' })
  }

  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash')
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return response.status(401).json({ error: 'Email or password is incorrect.' })
  }

  if (!user.emailVerified) {
    return response.status(403).json({ error: 'Verify your email with the code sent during sign-up before logging in.' })
  }

  setAuthCookie(response, user)
  return response.json({ user: publicUser(user) })
}

export function logout(_request, response) {
  clearAuthCookie(response)
  response.status(204).end()
}
