// container/Routes/template.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  getCurrentTemplate,
  saveCurrentTemplate,
} = require('../Controllers/template.controller');
const authenticate = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

// Protect all routes
router.use(authenticate);

// Ensure uploads/template directory exists
const templateUploadDir = path.join(__dirname, '../../uploads/template');
if (!fs.existsSync(templateUploadDir)) {
  fs.mkdirSync(templateUploadDir, { recursive: true });
}

// Configure multer for logo upload with original extension
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, templateUploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'logo-' + uniqueSuffix + fileExtension);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Routes accessible to all authenticated users
router.get('/current', getCurrentTemplate);

// Admin-only routes
router.use(requireRole('admin'));

// Save current template
router.post('/', upload.single('logo'), saveCurrentTemplate);

module.exports = router;