import multer from 'multer'
import path from 'path'
import fs from 'fs'

const storageDir = process.env.STORAGE_DIR || './storage/uploads'
fs.mkdirSync(storageDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, storageDir),
  filename: (_req, file, cb) => {
    const ts = Date.now()
    const ext = path.extname(file.originalname)
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_')
    cb(null, `${base}_${ts}${ext}`)
  }
})

export const upload = multer({ storage })