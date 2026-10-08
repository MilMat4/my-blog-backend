import { Router } from 'express'
import { listUserPosts, listUsers } from '../controllers/postController.js'
import { authenticate, requireSuperadmin } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, requireSuperadmin)
router.get('/', listUsers)
router.get('/:userId/posts', listUserPosts)

export default router
