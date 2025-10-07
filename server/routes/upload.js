const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configure file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = './uploads/files';

    // Select different storage directories based on file type
    if (file.fieldname === 'avatar') {
      uploadPath = './uploads/avatars';
    } else if (file.mimetype.startsWith('image/')) {
      uploadPath = './uploads/images';
    }

    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = {
    avatar: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    file: [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      // Documents
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Archives
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      // Other
      'application/json', 'text/csv'
    ]
  };

  const fieldType = file.fieldname || 'file';
  const allowed = allowedTypes[fieldType] || allowedTypes.file;

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // Default 10MB
    files: 5 // Maximum 5 files
  }
});

/**
 * Upload avatar
 * Handles avatar image upload for user profiles.
 */
router.post('/avatar', upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = `/uploads/avatars/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      fileUrl: fileUrl,
      fileInfo: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed'
    });
  }
});

/**
 * Upload chat image
 * Handles image upload for chat messages.
 */
router.post('/image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = `/uploads/images/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      fileUrl: fileUrl,
      fileInfo: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype,
        width: req.body.width || null,
        height: req.body.height || null
      }
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed'
    });
  }
});

/**
 * Upload single file
 * Handles general file upload with automatic directory selection.
 */
router.post('/file', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    let uploadSubDir = 'files';
    if (req.file.mimetype.startsWith('image/')) {
      uploadSubDir = 'images';
    }

    const fileUrl = `/uploads/${uploadSubDir}/${req.file.filename}`;

    res.json({
      success: true,
      message: 'File uploaded successfully',
      fileUrl: fileUrl,
      fileInfo: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed'
    });
  }
});

/**
 * Upload multiple files
 * Handles multiple file uploads with automatic directory selection.
 */
router.post('/files', upload.array('files', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = req.files.map(file => {
      let uploadSubDir = 'files';
      if (file.mimetype.startsWith('image/')) {
        uploadSubDir = 'images';
      }

      return {
        originalName: file.originalname,
        filename: file.filename,
        fileUrl: `/uploads/${uploadSubDir}/${file.filename}`,
        size: file.size,
        mimeType: file.mimetype
      };
    });

    res.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} files`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Multiple files upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed'
    });
  }
});

/**
 * Delete file
 * Removes a file from the server with security checks.
 */
router.delete('/file/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const { type = 'files' } = req.query;

    // Security check: prevent path traversal attacks
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    const allowedTypes = ['files', 'images', 'avatars'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type'
      });
    }

    const filePath = path.join(__dirname, '..', 'uploads', type, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Delete file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Delete failed'
    });
  }
});

/**
 * Get file information
 * Returns metadata about a specific file.
 */
router.get('/file/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const { type = 'files' } = req.query;

    // Security check
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    const allowedTypes = ['files', 'images', 'avatars'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type'
      });
    }

    const filePath = path.join(__dirname, '..', 'uploads', type, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const stats = fs.statSync(filePath);
    const ext = path.extname(filename);

    res.json({
      success: true,
      fileInfo: {
        filename: filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        extension: ext,
        type: type
      }
    });

  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get file information'
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds limit'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'File count exceeds limit'
      });
    }
  }

  res.status(400).json({
    success: false,
    message: error.message || 'Upload failed'
  });
});

module.exports = router;