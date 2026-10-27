import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

const publicUserSelect = {
  id: true,
  username: true,
  email: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      ...publicUserSelect,
      password: true,
    },
  });
}

export function createUser(data: {
  username: string;
  email: string;
  password: string;
}) {
  return prisma.user.create({
    data,
    select: publicUserSelect,
  });
}
