import mongoose from 'mongoose'
import Post from '../models/Post.js'
import User from '../models/User.js'
import { removePostImage } from '../services/postImageStorage.js'

function validatePostInput(body) {
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  const rawTags = body?.tags ?? ''
  const tags = (Array.isArray(rawTags) ? rawTags : typeof rawTags === 'string' ? rawTags.split(',') : null)
  if (!tags || tags.some((tag) => typeof tag !== 'string')) {
    return { error: 'Tags must be a comma-separated list.' }
  }
  const normalizedTags = [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))]

  if (normalizedTags.length > 8 || normalizedTags.some((tag) => tag.length > 24)) {
    return { error: 'Add up to 8 tags, each 24 characters or fewer.' }
  }

  if (!title || title.length > 120) {
    return { error: 'Title is required and must be 120 characters or fewer.' }
  }

  if (!content || content.length > 20000) {
    return { error: 'Content is required and must be 20,000 characters or fewer.' }
  }

  return { title, content, tags: normalizedTags }
}

export async function listPublicPosts(_request, response) {
  const posts = await Post.find()
    .sort({ createdAt: -1 })
    .populate('author', 'name')
  return response.json({ posts })
}

export async function recordPostView(request, response) {
  if (!mongoose.isValidObjectId(request.params.postId)) {
    return response.status(404).json({ error: 'Post not found.' })
  }

  const post = await Post.findByIdAndUpdate(
    request.params.postId,
    { $inc: { views: 1 } },
    { returnDocument: 'after', runValidators: true },
  ).populate('author', 'name')
  if (!post) {
    return response.status(404).json({ error: 'Post not found.' })
  }

  return response.json({ post })
}

export async function listOwnPosts(request, response) {
  const posts = await Post.find({ author: request.user.id }).sort({ createdAt: -1 })
  return response.json({ posts })
}

export async function createPost(request, response) {
  const input = validatePostInput(request.body)
  if (input.error) {
    if (request.file) {
      await removePostImage(`/uploads/${request.file.filename}`)
    }
    return response.status(400).json({ error: input.error })
  }

  let post
  try {
    post = await Post.create({
      ...input,
      imageUrl: request.file ? `/uploads/${request.file.filename}` : '',
      author: request.user.id,
    })
  } catch (error) {
    if (request.file) {
      await removePostImage(`/uploads/${request.file.filename}`)
    }
    throw error
  }
  return response.status(201).json({ post })
}

export async function getPost(request, response) {
  const post = await request.post.populate('author', 'name')
  return response.json({ post })
}

export async function updatePost(request, response) {
  const input = validatePostInput(request.body)
  if (input.error) {
    if (request.file) {
      await removePostImage(`/uploads/${request.file.filename}`)
    }
    return response.status(400).json({ error: input.error })
  }

  const post = request.post
  const previousImageUrl = post.imageUrl
  post.title = input.title
  post.content = input.content
  if (request.file) {
    post.imageUrl = `/uploads/${request.file.filename}`
  } else if (request.body.removeImage === 'true') {
    post.imageUrl = ''
  }
  try {
    await post.save()
  } catch (error) {
    if (request.file) {
      await removePostImage(`/uploads/${request.file.filename}`)
    }
    throw error
  }
  if (post.imageUrl !== previousImageUrl) {
    await removePostImage(previousImageUrl)
  }
  return response.json({ post })
}

export async function deletePost(request, response) {
  const post = request.post
  const imageUrl = post.imageUrl
  await post.deleteOne()
  await removePostImage(imageUrl)
  return response.status(204).end()
}

export async function listUsers(_request, response) {
  const users = await User.find({}, 'name email role createdAt').sort({ name: 1, email: 1 })
  return response.json({ users })
}

export async function listUserPosts(request, response) {
  if (!mongoose.isValidObjectId(request.params.userId)) {
    return response.status(404).json({ error: 'User not found.' })
  }

  const user = await User.findById(request.params.userId, 'name email role')
  if (!user) {
    return response.status(404).json({ error: 'User not found.' })
  }

  const posts = await Post.find({ author: user.id }).sort({ createdAt: -1 })
  return response.json({ user, posts })
}
