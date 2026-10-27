import type { RequestHandler } from 'express';
import { authenticateUser, registerUser } from '../services/auth.service.js';
import { HttpError } from '../utils/http-error.js';

function readString(body: unknown, key: string): string | undefined {
  if (typeof body !== 'object' || body === null || !(key in body)) {
    return undefined;
  }
  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

export const register: RequestHandler = async (request, response) => {
  const body: unknown = request.body;
  const username = readString(body, 'username');
  const email = readString(body, 'email');
  const password = readString(body, 'password');

  if (!username || !email || !password) {
    throw new HttpError(400, 'INVALID_REQUEST', 'username, email, and password are required.');
  }

  const user = await registerUser({ username, email, password });
  response.status(201).json({ data: { user } });
};

export const login: RequestHandler = async (request, response) => {
  const body: unknown = request.body;
  const email = readString(body, 'email');
  const password = readString(body, 'password');

  if (!email || !password) {
    throw new HttpError(400, 'INVALID_REQUEST', 'email and password are required.');
  }

  const result = await authenticateUser(email, password);
  response.status(200).json({ data: result });
};
