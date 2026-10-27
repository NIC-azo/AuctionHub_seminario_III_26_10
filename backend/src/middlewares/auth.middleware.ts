import type { RequestHandler } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { HttpError } from '../utils/http-error.js';

export const requireAuth: RequestHandler = (request, _response, next) => {
  const authorization = request.get('authorization');
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);

  if (!match) {
    next(new HttpError(401, 'UNAUTHORIZED', 'A Bearer token is required.'));
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    next(new Error('JWT_SECRET must be configured.'));
    return;
  }

  try {
    const payload = jwt.verify(match[1], secret, { algorithms: ['HS256'] });
    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string' ||
      typeof payload.username !== 'string'
    ) {
      next(new HttpError(401, 'INVALID_TOKEN', 'The access token is invalid.'));
      return;
    }

    request.user = {
      id: payload.sub,
      username: payload.username,
    };
    next();
  } catch {
    next(new HttpError(401, 'INVALID_TOKEN', 'The access token is invalid or expired.'));
  }
};