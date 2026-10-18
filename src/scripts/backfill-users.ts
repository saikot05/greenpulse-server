import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { prisma } from '../lib/prisma.js';
import { safeParseUserRole } from '../utils/prisma-helpers.js';

async function backfill() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined in environment variables.');
  }

  console.log('[Backfill]: Connecting to MongoDB...');
  const client = new MongoClient(mongoUri);
  await client.connect();

  const db = client.db();
  console.log(`[Backfill]: Connected to MongoDB database: "${db.databaseName}".`);

  const users = await db.collection('user').find().toArray();
  console.log(`[Backfill]: Found ${users.length} users in MongoDB.`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const u of users) {
    const email = u.email?.toLowerCase().trim();
    if (!email) {
      skippedCount++;
      continue;
    }

    const id = u._id ? String(u._id) : String(u.id);
    const name = u.name || 'User';
    const avatarUrl = u.avatarUrl || u.image || null;
    const role = safeParseUserRole(u.role);
    const organization = u.organization || null;
    const isEmailVerified = Boolean(u.emailVerified);

    try {
      let linkedUser = null;
      if (isEmailVerified) {
        linkedUser = await prisma.user.findUnique({
          where: { email },
        });
      }

      if (linkedUser) {
        await prisma.user.update({
          where: { email },
          data: {
            name,
            avatarUrl: avatarUrl ?? linkedUser.avatarUrl,
            role,
            organization: organization ?? linkedUser.organization,
          },
        });
        console.log(`[Backfill]: Linked verified user by email: ${email} (Neon ID: ${linkedUser.id})`);
        updatedCount++;
      } else {
        await prisma.user.upsert({
          where: { id },
          update: {
            email,
            name,
            avatarUrl,
            role,
            organization,
          },
          create: {
            id,
            email,
            name,
            avatarUrl,
            role,
            organization,
          },
        });
        console.log(`[Backfill]: Upserted user by id: ${email} (Neon ID: ${id})`);
        createdCount++;
      }
    } catch (err: unknown) {
      console.error(`[Backfill]: Failed to sync user ${email}:`, err instanceof Error ? err.message : err);
    }
  }

  await client.close();
  await prisma.$disconnect();
  console.log(`[Backfill]: Summary - Created/Upserted: ${createdCount}, Linked/Updated: ${updatedCount}, Skipped: ${skippedCount}.`);
}

backfill().catch((err) => {
  console.error('[Backfill Error]:', err instanceof Error ? err.message : err);
  process.exit(1);
});
