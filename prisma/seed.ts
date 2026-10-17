import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';
import {
  UserRole,
  FacilityType,
  ScopeCategory,
  RiskRating,
  DecarbonizationPriority,
} from '../src/generated/prisma/enums.js';

async function main() {
  console.log('[Prisma Seed]: Initializing database seed...');

  // 1. Ensure default seed user exists (Idempotent via upsert)
  const seedUserId = 'seed-default-facility-manager';
  const defaultUser = await prisma.user.upsert({
    where: { id: seedUserId },
    update: {},
    create: {
      id: seedUserId,
      email: 'manager@greenpulse.ai',
      name: 'Elena Rostova',
      role: UserRole.FACILITY_MANAGER,
      organization: 'GreenPulse Global Technologies',
    },
  });

  console.log(`[Prisma Seed]: Default user verified: ${defaultUser.email} (${defaultUser.id})`);

  // 2. Seed example audits with deterministic IDs for idempotency
  const seedAudits = [
    {
      id: 'seed-audit-dallas-factory',
      title: 'Q1 Carbon Performance Review',
      facilityName: 'Dallas Mega-Factory',
      facilityType: FacilityType.MANUFACTURING,
      location: 'Dallas, TX',
      auditYear: 2026,
      scopeCategory: ScopeCategory.SCOPE_1,
      carbonScoreTons: 12450,
      energyUsageKwh: 4500000,
      riskRating: RiskRating.HIGH_EMISSIONS,
      shortDescription: 'High-volume production facility with significant direct natural gas combustion for thermal processes.',
      fullOverview: 'Overview of Dallas facility emissions, identifying key efficiency opportunities in combustion loops.',
      tags: ['CO2', 'Natural Gas', 'FY26'],
      aiInsight: {
        decarbonizationPriority: DecarbonizationPriority.HIGH,
        estimatedCostSavingsUsd: 120000,
        recommendedActions: ['Electrify thermal heating systems', 'Install heat recovery loops'],
      },
    },
    {
      id: 'seed-audit-ashburn-dc3',
      title: 'Green Grid Data Center Audit',
      facilityName: 'Ashburn DC-3',
      facilityType: FacilityType.DATA_CENTER,
      location: 'Ashburn, VA',
      auditYear: 2025,
      scopeCategory: ScopeCategory.SCOPE_2,
      carbonScoreTons: 2100,
      energyUsageKwh: 12500000,
      riskRating: RiskRating.LOW_CARBON,
      shortDescription: 'Hyperscale facility utilizing 100% virtual power purchase agreements (vPPAs) for offset matching.',
      fullOverview: 'Overview of Ashburn data center electricity matching and renewable procurement performance.',
      tags: ['PPA', 'PUE', 'Offset'],
      aiInsight: {
        decarbonizationPriority: DecarbonizationPriority.LOW,
        estimatedCostSavingsUsd: 85000,
        recommendedActions: ['Optimize liquid cooling loops', 'Upgrade server hardware density'],
      },
    },
    {
      id: 'seed-audit-hq-tower',
      title: 'Corporate Headquarters Assessment',
      facilityName: 'HQ Plaza Tower',
      facilityType: FacilityType.CORPORATE_OFFICE,
      location: 'New York, NY',
      auditYear: 2026,
      scopeCategory: ScopeCategory.SCOPE_2,
      carbonScoreTons: 950,
      energyUsageKwh: 3200000,
      riskRating: RiskRating.MODERATE_IMPACT,
      shortDescription: 'Office skyscraper with optimized HVAC schedule controls but limited solar canopy surface area.',
      fullOverview: 'Overview of Manhattan tower commercial electricity usage and peak-demand throttling.',
      tags: ['LEED', 'HVAC', 'Smart-Building'],
      aiInsight: {
        decarbonizationPriority: DecarbonizationPriority.MEDIUM,
        estimatedCostSavingsUsd: 42000,
        recommendedActions: ['Install smart window glazes', 'Upgrade perimeter LED light zones'],
      },
    },
  ];

  for (const auditData of seedAudits) {
    const { id, tags, aiInsight, ...coreData } = auditData;

    const existing = await prisma.esgAudit.findUnique({
      where: { id },
      include: { aiInsight: true },
    });

    if (!existing) {
      const tagConnectOrCreate = tags.map((name) => ({
        where: { name },
        create: { name },
      }));

      await prisma.esgAudit.create({
        data: {
          id,
          ...coreData,
          createdBy: defaultUser.id,
          tags: {
            connectOrCreate: tagConnectOrCreate,
          },
          aiInsight: {
            create: aiInsight,
          },
        },
      });
    }
  }

  // 3. Print verification counts per table
  const userCount = await prisma.user.count();
  const auditCount = await prisma.esgAudit.count();
  const aiInsightCount = await prisma.aiInsight.count();
  const tagCount = await prisma.tag.count();
  const joinTableRows = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM "_EsgAuditToTag"`;
  const joinTableCount = Number(joinTableRows[0]?.count ?? 0);

  console.log('[Prisma Seed]: Completed successfully.');
  console.log(`[Row Counts]:
  - users: ${userCount}
  - esg_audits: ${auditCount}
  - ai_insights: ${aiInsightCount}
  - tags: ${tagCount}
  - _EsgAuditToTag: ${joinTableCount}`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error('[Prisma Seed Error]:', e);
    process.exit(1);
  });
