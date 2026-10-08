import mongoose from 'mongoose'

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    content: { type: String, required: true, trim: true, maxlength: 20000 },
    imageUrl: { type: String, default: '' },
    tags: { type: [String], default: [], maxlength: 8 },
    views: { type: Number, default: 0, min: 0 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
)

const Post = mongoose.model('Post', postSchema)

export default Post
