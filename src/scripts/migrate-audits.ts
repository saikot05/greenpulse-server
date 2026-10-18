import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  safeParseFacilityType,
  safeParseScopeCategory,
  safeParseRiskRating,
  safeParseDecarbonizationPriority,
} from '../utils/audit-mapper.js';
import { safeParseUserRole } from '../utils/prisma-helpers.js';

interface AuditSkipRecord {
  id: string;
  title: string;
  reason: string;
}

interface AuditFailRecord {
  id: string;
  title: string;
  error: string;
}

interface AuditSuccessRecord {
  id: string;
  title: string;
  ownerId: string;
}

async function migrateAudits() {
  const isApply = process.argv.includes('--apply');
  const isDryRun = !isApply;

  console.log('================================================================');
  console.log(`[Audit Migration]: Starting in ${isDryRun ? 'DRY RUN' : 'APPLY'} mode`);
  if (isDryRun) {
    console.log('[Audit Migration]: No changes will be written to Neon database.');
    console.log('[Audit Migration]: To commit changes, re-run with: npm run db:migrate-audits -- --apply');
  }
  console.log('================================================================\n');

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined in environment variables.');
  }

  const sourceDbName = process.env.MONGO_SOURCE_DB || 'greenpulse';

  console.log(`[Mongo]: Connecting to source MongoDB database "${sourceDbName}"...`);
  const client = new MongoClient(mongoUri);
  await client.connect();

  const sourceDb = client.db(sourceDbName);
  console.log(`[Mongo]: Connected successfully to "${sourceDb.databaseName}".`);

  // 1. Fetch audits and users
  const rawAudits = await sourceDb.collection('esgaudits').find().toArray();
  const rawUsers = await sourceDb.collection('user').find().toArray();
  console.log(`[Mongo]: Found ${rawAudits.length} audits and ${rawUsers.length} users in "${sourceDbName}".\n`);

  // Index Mongo users by stringified _id and id
  const mongoUserById = new Map<string, any>();
  for (const u of rawUsers) {
    if (u._id) mongoUserById.set(String(u._id), u);
    if (u.id) mongoUserById.set(String(u.id), u);
  }

  // Pre-fetch all Neon users to map by email and by id
  const existingNeonUsers = await prisma.user.findMany();
  const neonUserByEmail = new Map<string, any>();
  const neonUserById = new Map<string, any>();
  for (const nu of existingNeonUsers) {
    neonUserByEmail.set(nu.email.toLowerCase().trim(), nu);
    neonUserById.set(nu.id, nu);
  }

  let usersCreatedCount = 0;
  const createdUsersList: string[] = [];
  const createdAudits: AuditSuccessRecord[] = [];
  const skippedAudits: AuditSkipRecord[] = [];
  const failedAudits: AuditFailRecord[] = [];

  for (const audit of rawAudits) {
    const auditId = String(audit._id);
    const auditTitle = String(audit.title || 'Untitled Audit');

    try {
      // ─── Step 1: Resolve Owner in Neon ─────────────────────────────────────
      const rawCreatedBy = String(audit.createdBy || '');
      if (!rawCreatedBy) {
        failedAudits.push({
          id: auditId,
          title: auditTitle,
          error: 'Audit missing "createdBy" field in MongoDB doc.',
        });
        continue;
      }

      // Check Mongo user
      let mongoUser = mongoUserById.get(rawCreatedBy);
      if (!mongoUser && ObjectId.isValid(rawCreatedBy)) {
        mongoUser = await sourceDb.collection('user').findOne({ _id: new ObjectId(rawCreatedBy) });
      }

      let targetNeonUserId: string | null = null;

      if (mongoUser?.email) {
        const ownerEmail = mongoUser.email.toLowerCase().trim();
        let neonUser = neonUserByEmail.get(ownerEmail);

        if (!neonUser) {
          // Check Neon database directly in case it was created in this run
          neonUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
        }

        if (!neonUser) {
          // Owner does not exist in Neon yet -> Create Neon user
          const newUserId = String(mongoUser._id || rawCreatedBy);
          const userName = mongoUser.name || 'User';
          const userAvatar = mongoUser.avatarUrl || mongoUser.image || null;
          const userRole = safeParseUserRole(mongoUser.role);
          const userOrg = mongoUser.organization || null;

          if (isApply) {
            neonUser = await prisma.user.create({
              data: {
                id: newUserId,
                email: ownerEmail,
                name: userName,
                avatarUrl: userAvatar,
                role: userRole,
                organization: userOrg,
              },
            });
            console.log(`[User Created]: Created Neon user "${ownerEmail}" (Neon ID: ${neonUser.id})`);
          } else {
            console.log(`[DRY RUN - User]: Would create Neon user "${ownerEmail}" (Neon ID: ${newUserId})`);
            neonUser = { id: newUserId, email: ownerEmail };
          }

          usersCreatedCount++;
          createdUsersList.push(`${ownerEmail} (${neonUser.id})`);
          neonUserByEmail.set(ownerEmail, neonUser);
          neonUserById.set(neonUser.id, neonUser);
        }

        targetNeonUserId = neonUser.id;
      } else {
        // No Mongo user doc with email. Fall back to direct ID check in Neon
        const directNeonUser = neonUserById.get(rawCreatedBy) || (await prisma.user.findUnique({ where: { id: rawCreatedBy } }));
        if (directNeonUser) {
          targetNeonUserId = directNeonUser.id;
        }
      }

      if (!targetNeonUserId) {
        failedAudits.push({
          id: auditId,
          title: auditTitle,
          error: `Could not resolve owner. Mongo createdBy "${rawCreatedBy}" has no corresponding email or Neon user.`,
        });
        continue;
      }

      // ─── Step 2: Idempotency Checks ────────────────────────────────────────

      // 2a. Check if audit ID already exists in Neon
      const existingById = await prisma.esgAudit.findUnique({
        where: { id: auditId },
        select: { id: true, title: true },
      });

      if (existingById) {
        skippedAudits.push({
          id: auditId,
          title: auditTitle,
          reason: `Audit ID already exists in Neon (${existingById.id}).`,
        });
        continue;
      }

      // 2b. Check if an audit with the same title and createdBy already exists
      const existingByTitleAndUser = await prisma.esgAudit.findFirst({
        where: {
          title: auditTitle,
          createdBy: targetNeonUserId,
        },
        select: { id: true, title: true },
      });

      if (existingByTitleAndUser) {
        skippedAudits.push({
          id: auditId,
          title: auditTitle,
          reason: `Audit with title "${auditTitle}" and owner "${targetNeonUserId}" already exists (Neon ID: ${existingByTitleAndUser.id}).`,
        });
        continue;
      }

      // ─── Step 3: Field & Type Mapping ──────────────────────────────────────
      const facilityType = safeParseFacilityType(audit.facilityType);
      const scopeCategory = safeParseScopeCategory(audit.scopeCategory);
      const riskRating = safeParseRiskRating(audit.riskRating);

      const carbonScoreTons = new Prisma.Decimal(audit.carbonScoreTons ?? 0);
      const energyUsageKwh = new Prisma.Decimal(audit.energyUsageKwh ?? 0);

      const createdAt = audit.createdAt ? new Date(audit.createdAt) : new Date();
      const updatedAt = audit.updatedAt ? new Date(audit.updatedAt) : new Date();

      const tagsList = (Array.isArray(audit.tags) ? audit.tags : [])
        .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
        .map((t: string) => t.trim());

      const aiInsightData = audit.aiInsights
        ? {
            decarbonizationPriority: safeParseDecarbonizationPriority(
              audit.aiInsights.decarbonizationPriority || 'Medium'
            ),
            estimatedCostSavingsUsd: new Prisma.Decimal(audit.aiInsights.estimatedCostSavingsUsd ?? 0),
            recommendedActions: Array.isArray(audit.aiInsights.recommendedActions)
              ? audit.aiInsights.recommendedActions.map(String)
              : [],
          }
        : null;

      // ─── Step 4: Write or Simulate ─────────────────────────────────────────
      if (isApply) {
        await prisma.$transaction(async (tx) => {
          const createData: Prisma.EsgAuditUncheckedCreateInput = {
            id: auditId,
            title: auditTitle,
            facilityName: String(audit.facilityName || 'Unknown Facility'),
            facilityType,
            location: String(audit.location || 'Unknown Location'),
            auditYear: Number(audit.auditYear) || new Date().getFullYear(),
            scopeCategory,
            carbonScoreTons,
            energyUsageKwh,
            riskRating,
            shortDescription: String(audit.shortDescription || ''),
            fullOverview: String(audit.fullOverview || ''),
            imageUrl: audit.imageUrl ? String(audit.imageUrl) : null,
            createdBy: targetNeonUserId!,
            createdAt,
            updatedAt,
            ...(aiInsightData ? { aiInsight: { create: aiInsightData } } : {}),
            ...(tagsList.length > 0
              ? {
                  tags: {
                    connectOrCreate: tagsList.map((tag) => ({
                      where: { name: tag },
                      create: { name: tag },
                    })),
                  },
                }
              : {}),
          };

          await tx.esgAudit.create({
            data: createData,
          });
        });

        console.log(`[Audit Created]: "${auditTitle}" (ID: ${auditId}, Owner: ${targetNeonUserId})`);
      } else {
        console.log(`[DRY RUN - Audit]: Would create "${auditTitle}" (ID: ${auditId}, Owner: ${targetNeonUserId})`);
      }

      createdAudits.push({
        id: auditId,
        title: auditTitle,
        ownerId: targetNeonUserId,
      });
    } catch (auditErr: any) {
      console.error(`[Audit Error]: Failed to process audit ${auditId} ("${auditTitle}"):`, auditErr.message || auditErr);
      failedAudits.push({
        id: auditId,
        title: auditTitle,
        error: auditErr.message || String(auditErr),
      });
    }
  }

  await client.close();
  await prisma.$disconnect();

  // ─── Final Summary ──────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`[Audit Migration Summary] Mode: ${isDryRun ? 'DRY RUN' : 'APPLY'}`);
  console.log('================================================================');
  console.log(`Users Created / Would Create : ${usersCreatedCount}`);
  if (createdUsersList.length > 0) {
    createdUsersList.forEach((u) => console.log(`  - ${u}`));
  }

  console.log(`\nAudits Created / Would Create: ${createdAudits.length}`);
  createdAudits.forEach((a) => console.log(`  ✓ [${a.id}] "${a.title}" -> Owner: ${a.ownerId}`));

  console.log(`\nAudits Skipped               : ${skippedAudits.length}`);
  skippedAudits.forEach((s) => console.log(`  ↷ [${s.id}] "${s.title}" -> Reason: ${s.reason}`));

  console.log(`\nAudits Failed                : ${failedAudits.length}`);
  failedAudits.forEach((f) => console.log(`  ✗ [${f.id}] "${f.title}" -> Error: ${f.error}`));

  console.log('================================================================\n');

  if (isDryRun) {
    console.log('[Notice]: DRY RUN finished. No data was modified in Neon.');
    console.log('[Notice]: Review the output above. When confirmed, run with: npm run db:migrate-audits -- --apply');
  } else {
    console.log('[Success]: Audit migration to Neon complete.');
  }
}

migrateAudits().catch((err) => {
  console.error('[Fatal Migration Error]:', err instanceof Error ? err.message : err);
  process.exit(1);
});
