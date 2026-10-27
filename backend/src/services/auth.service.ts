import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail, type PublicUser } from '../models/auth.model.js';
import { HttpError } from '../utils/http-error.js';

const bcryptRounds = 12;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be configured.');
  }
  return secret;
}

export async function registerUser(input: {
  username: string;
  email: string;
  password: string;
}): Promise<PublicUser> {
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (username.length < 3 || username.length > 40) {
    throw new HttpError(400, 'INVALID_USERNAME', 'Username must be 3 to 40 characters.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new HttpError(400, 'INVALID_EMAIL', 'A valid email address is required.');
  }
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new HttpError(400, 'INVALID_PASSWORD', 'Password must be 8 to 72 bytes long.');
  }

  const passwordHash = await bcrypt.hash(password, bcryptRounds);
  return createUser({ username, email, password: passwordHash });
}

export async function authenticateUser(
  emailInput: string,
  password: string,
): Promise<{ user: Omit<PublicUser, 'email'>; token: string }> {
  const email = emailInput.trim().toLowerCase();
  const user = await findUserByEmail(email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  const token = jwt.sign(
    { username: user.username },
    getJwtSecret(),
    { subject: user.id, expiresIn: '1h', algorithm: 'HS256' },
  );

  return {
    user: { id: user.id, username: user.username },
    token,
  };
}
