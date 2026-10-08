import { Router } from 'express'
import { login, logout, register, resendSignupCode, verifySignup } from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

function asyncRoute(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response)).catch(next)
  }
}

router.post('/register', asyncRoute(register))
router.post('/verify-signup', asyncRoute(verifySignup))
router.post('/resend-signup-code', asyncRoute(resendSignupCode))
router.post('/login', asyncRoute(login))
router.get('/me', authenticate, (request, response) => {
  const { id, name, email, role } = request.user
  response.json({ user: { id, name, email, role } })
})
router.post('/logout', logout)

export default router
