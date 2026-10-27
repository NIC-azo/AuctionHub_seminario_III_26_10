import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { HttpError } from '../utils/http-error.js';

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    response.status(tooLarge ? 413 : 400).json({
      error: {
        code: tooLarge ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD',
        message: tooLarge
          ? 'Image must not exceed 5 MB.'
          : 'The image upload is invalid.',
      },
    });
    return;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    response.status(409).json({
      error: { code: 'RESOURCE_CONFLICT', message: 'A record with that value already exists.' },
    });
    return;
  }

  if (
    error instanceof SyntaxError &&
    'status' in error &&
    error.status === 400
  ) {
    response.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Request body contains invalid JSON.' },
    });
    return;
  }

  console.error('Unhandled API error:', error);
  response.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected server error occurred.' },
  });
};
