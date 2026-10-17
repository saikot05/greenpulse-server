import { PrismaClient, Prisma } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not defined.');
}

const pool = new pg.Pool({
  connectionString,
  max: 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: pg.Pool | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}

// Graceful disconnection handlers
const handleGracefulShutdown = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    await pool.end();
  } catch (error) {
    console.error('Error during Prisma / pg disconnect:', error);
  }
};

process.on('beforeExit', handleGracefulShutdown);
process.on('SIGINT', async () => {
  await handleGracefulShutdown();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await handleGracefulShutdown();
  process.exit(0);
});

export { Prisma };
export default prisma;
