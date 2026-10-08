import mongoose from 'mongoose'
import Post from '../models/Post.js'

export default async function requirePostOwner(request, response, next) {
  if (!mongoose.isValidObjectId(request.params.postId)) {
    return response.status(404).json({ error: 'Post not found.' })
  }

  try {
    const post = await Post.findById(request.params.postId)
    if (!post) {
      return response.status(404).json({ error: 'Post not found.' })
    }
    if (post.author.toString() !== request.user.id && request.user.role !== 'superadmin') {
      return response.status(403).json({ error: 'You can only edit or delete your own posts.' })
    }

    request.post = post
    return next()
  } catch (error) {
    return next(error)
  }
}
