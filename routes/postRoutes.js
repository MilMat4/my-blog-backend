import { Router } from 'express'
import {
  createPost,
  deletePost,
  getPost,
  listOwnPosts,
  listPublicPosts,
  recordPostView,
  updatePost,
} from '../controllers/postController.js'
import { authenticate } from '../middleware/auth.js'
import requirePostOwner from '../middleware/requirePostOwner.js'
import { uploadPostImage } from '../middleware/uploadPostImage.js'

const router = Router()

router.get('/public', listPublicPosts)
router.post('/:postId/view', recordPostView)
router.use(authenticate)
router.get('/', listOwnPosts)
router.post('/', uploadPostImage, createPost)
router.get('/:postId', requirePostOwner, getPost)
router.patch('/:postId', requirePostOwner, uploadPostImage, updatePost)
router.delete('/:postId', requirePostOwner, deletePost)

export default router
