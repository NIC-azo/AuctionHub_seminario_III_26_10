import multer from 'multer';
import { HttpError } from '../utils/http-error.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const uploadProductImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(
        new HttpError(400, 'INVALID_IMAGE_TYPE', 'Image must be JPEG, PNG, or WebP.'),
      );
      return;
    }
    callback(null, true);
  },
});
