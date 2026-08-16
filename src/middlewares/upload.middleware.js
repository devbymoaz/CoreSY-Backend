const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const multer = require('multer');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'public', 'uploads');

const IMAGE_EXTENSIONS = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

const DOCUMENT_EXTENSIONS = new Map([...IMAGE_EXTENSIONS, ['application/pdf', '.pdf']]);

const ALLOWED_FOLDERS = new Set([
  'branches',
  'businesses',
  'cashiers',
  'driver-documents',
  'driver-profiles',
  'driver-vehicles',
  'product-categories',
  'products',
  'reviews',
  'services',
  'users',
]);

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDir(UPLOAD_ROOT);

const storage = multer.diskStorage({
  destination: (req, _file, callback) => {
    const folder = String(req.uploadFolder || 'misc').replace(/[^a-z0-9_-]/gi, '');
    const entityId = String(req.params.id || req.driver?.id || req.user?.id || 'general').replace(
      /[^a-z0-9_-]/gi,
      '',
    );
    if (!ALLOWED_FOLDERS.has(folder) || !entityId) {
      return callback(new AppError('Invalid upload destination.', HTTP_STATUS.BAD_REQUEST));
    }
    const destination = path.join(UPLOAD_ROOT, folder, entityId);
    ensureDir(destination);
    callback(null, destination);
  },
  filename: (req, file, callback) => {
    const extensions = req.uploadKind === 'document' ? DOCUMENT_EXTENSIONS : IMAGE_EXTENSIONS;
    const extension = extensions.get(file.mimetype);
    const safeName = `${Date.now()}-${randomUUID()}${extension}`;
    callback(null, safeName);
  },
});

const fileFilter = (req, file, callback) => {
  const allowedTypes = req.uploadKind === 'document' ? DOCUMENT_EXTENSIONS : IMAGE_EXTENSIONS;
  if (!allowedTypes.has(file.mimetype)) {
    const allowedDescription =
      req.uploadKind === 'document' ? 'jpeg, png, webp, gif, pdf' : 'jpeg, png, webp, gif';
    return callback(
      new AppError(
        `Unsupported file type. Allowed types: ${allowedDescription}.`,
        HTTP_STATUS.BAD_REQUEST,
      ),
    );
  }
  return callback(null, true);
};

const createUploader = (fileSize) =>
  multer({
    storage,
    fileFilter,
    limits: {
      fileSize,
      files: 10,
    },
  });

const upload = createUploader(5 * 1024 * 1024);
const documentUpload = createUploader(10 * 1024 * 1024);

/**
 * Set upload subfolder before multer runs.
 * @param {string} folder
 */
const setUploadFolder = (folder) => (req, _res, next) => {
  req.uploadFolder = folder;
  next();
};

const setUploadKind = (kind) => (req, _res, next) => {
  req.uploadKind = kind;
  next();
};

/**
 * Build a public URL for a stored upload file.
 * @param {import('express').Request} req
 * @param {Express.Multer.File} file
 */
const buildPublicFileUrl = (req, file) => {
  const relativePath = path
    .relative(path.join(__dirname, '..', '..', 'public'), file.path)
    .split(path.sep)
    .join('/');

  const configuredBase = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '');
  const requestBase = `${req.protocol}://${req.get('host')}`;
  const baseUrl = configuredBase || requestBase;

  return `${baseUrl}/${relativePath}`;
};

const buildPublicFileUrls = (req, files = []) => files.map((file) => buildPublicFileUrl(req, file));

const removeUploadedFile = async (file) => {
  if (!file?.path) return;
  try {
    await fs.promises.unlink(file.path);
  } catch {
    // Cleanup must not hide the original request outcome.
  }
};

const removeUploadedFiles = async (files = []) => {
  await Promise.all(files.map((file) => removeUploadedFile(file)));
};

const removePublicUpload = async (fileUrl) => {
  if (!fileUrl) return;

  let pathname;
  try {
    pathname = new URL(fileUrl, 'http://local').pathname;
  } catch {
    return;
  }

  const marker = '/uploads/';
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex === -1) return;

  const relativePath = decodeURIComponent(pathname.slice(markerIndex + marker.length));
  const resolvedPath = path.resolve(UPLOAD_ROOT, relativePath);
  const rootWithSeparator = `${path.resolve(UPLOAD_ROOT)}${path.sep}`;
  if (!resolvedPath.startsWith(rootWithSeparator)) return;

  try {
    await fs.promises.unlink(resolvedPath);
  } catch {
    // Old files are best-effort cleanup after a successful DB update.
  }
};

/**
 * Require a single uploaded file named `file`.
 */
const requireUploadedFile = (req, _res, next) => {
  if (!req.file) {
    return next(
      new AppError('Image file is required (field name: file).', HTTP_STATUS.BAD_REQUEST),
    );
  }
  return next();
};

const requireUploadedFiles = (req, _res, next) => {
  if (!Array.isArray(req.files) || req.files.length === 0) {
    return next(
      new AppError('At least one file is required (field name: files).', HTTP_STATUS.BAD_REQUEST),
    );
  }
  return next();
};

const requireAnyUploadedFile = (req, _res, next) => {
  const files =
    req.files && !Array.isArray(req.files) ? Object.values(req.files).flat() : req.files;
  if (!Array.isArray(files) || files.length === 0) {
    return next(new AppError('At least one file is required.', HTTP_STATUS.BAD_REQUEST));
  }
  return next();
};

const hasValidSignature = (mimeType, bytes) => {
  switch (mimeType) {
    case 'image/jpeg':
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'image/png':
      return bytes
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/gif':
      return ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii'));
    case 'image/webp':
      return (
        bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
        bytes.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    case 'application/pdf':
      return bytes.subarray(0, 5).toString('ascii') === '%PDF-';
    default:
      return false;
  }
};

const validateUploadedFileSignatures = async (req, _res, next) => {
  const fieldFiles =
    req.files && !Array.isArray(req.files) ? Object.values(req.files).flat() : req.files;
  const files = req.file ? [req.file] : fieldFiles || [];

  try {
    for (const file of files) {
      const handle = await fs.promises.open(file.path, 'r');
      const bytes = Buffer.alloc(12);
      await handle.read(bytes, 0, bytes.length, 0);
      await handle.close();
      if (!hasValidSignature(file.mimetype, bytes)) {
        await removeUploadedFiles(files);
        return next(
          new AppError('File content does not match its declared type.', HTTP_STATUS.BAD_REQUEST),
        );
      }
    }
    return next();
  } catch {
    await removeUploadedFiles(files);
    return next(new AppError('Unable to validate uploaded file.', HTTP_STATUS.BAD_REQUEST));
  }
};

module.exports = {
  upload,
  documentUpload,
  setUploadFolder,
  setUploadKind,
  buildPublicFileUrl,
  buildPublicFileUrls,
  requireUploadedFile,
  requireUploadedFiles,
  requireAnyUploadedFile,
  validateUploadedFileSignatures,
  removeUploadedFile,
  removeUploadedFiles,
  removePublicUpload,
  UPLOAD_ROOT,
};
