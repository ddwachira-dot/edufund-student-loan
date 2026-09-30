const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const stored = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, stored);
  },
});

const ALLOWED = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function fileFilter(req, file, cb) {
  if (ALLOWED.has(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Unsupported file type (PDF, JPG, PNG, DOC, DOCX only)');
    err.status = 400;
    cb(err);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function imageFilter(req, file, cb) {
  if (IMAGE_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Profile photo must be a JPG, PNG, WEBP or GIF image');
    err.status = 400;
    cb(err);
  }
}

const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = { upload, uploadImage, UPLOAD_DIR };