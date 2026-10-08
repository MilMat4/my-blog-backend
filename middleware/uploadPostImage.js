import crypto from 'node:crypto'
import path from 'node:path'
import { fileTypeFromFile } from 'file-type'
import multer from 'multer'
import { ensureUploadDirectory, removePostImage, uploadDirectory } from '../services/postImageStorage.js'

const allowedMimeTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
])

const storage = multer.diskStorage({
  destination: async (_request, _file, callback) => {
    try {
      await ensureUploadDirectory()
      callback(null, uploadDirectory)
    } catch (error) {
      callback(error)
    }
  },
  filename: (_request, file, callback) => {
    const extension = allowedMimeTypes.get(file.mimetype)
    callback(null, `${crypto.randomUUID()}${extension}`)
  },
})

function fileFilter(_request, file, callback) {
  if (!allowedMimeTypes.has(file.mimetype)) {
    callback(new Error('Post images must be JPEG, PNG, WebP, or GIF files.'))
    return
  }

  callback(null, true)
}

const parsePostImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 3,
    fieldSize: 20000,
  },
}).single('image')

export function uploadPostImage(request, response, next) {
  parsePostImage(request, response, async (uploadError) => {
    if (uploadError) {
      return next(uploadError)
    }
    if (!request.file) {
      return next()
    }

    try {
      const detectedType = await fileTypeFromFile(request.file.path)
      const expectedExtension = allowedMimeTypes.get(detectedType?.mime)
      if (!expectedExtension || path.extname(request.file.filename) !== expectedExtension) {
        await removePostImage(`/uploads/${request.file.filename}`)
        return response.status(400).json({ error: 'The uploaded file is not a supported image.' })
      }

      return next()
    } catch (error) {
      await removePostImage(`/uploads/${request.file.filename}`)
      return next(error)
    }
  })
}
