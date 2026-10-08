import { mkdir, unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
export const uploadDirectory = path.resolve(currentDirectory, '../uploads')

export async function removePostImage(imageUrl) {
  if (!imageUrl?.startsWith('/uploads/')) {
    return
  }

  const fileName = path.basename(imageUrl)
  if (fileName !== imageUrl.slice('/uploads/'.length)) {
    throw new Error('Invalid stored post image path.')
  }

  const imagePath = path.join(uploadDirectory, fileName)
  try {
    await unlink(imagePath)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error
    }
  }
}

export async function ensureUploadDirectory() {
  await mkdir(uploadDirectory, { recursive: true })
}
