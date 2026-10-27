import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

declare global {
  var __auctionHubPrisma: PrismaClient | undefined;
  var __auctionHubPgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL must be set to initialize the Prisma client.');
}

const pool = globalThis.__auctionHubPgPool ?? new Pool({ connectionString });
const prisma =
  globalThis.__auctionHubPrisma ??
  new PrismaClient({ adapter: new PrismaPg(pool) });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__auctionHubPgPool = pool;
  globalThis.__auctionHubPrisma = prisma;
}

export { prisma };