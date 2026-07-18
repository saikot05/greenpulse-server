import { User } from '../models/User.model.js';
import { EsgAudit } from '../models/EsgAudit.model.js';
import { Types } from 'mongoose';

const SEED_AUDITS = [
  {
    title: 'Q1 Carbon Performance Review',
    facilityName: 'Dallas Mega-Factory',
    facilityType: 'Manufacturing' as const,
    location: 'Dallas, TX',
    auditYear: 2026,
    scopeCategory: 'Scope 1 (Direct)' as const,
    carbonScoreTons: 12450,
    energyUsageKwh: 4500000,
    riskRating: 'High Emissions' as const,
    shortDescription: 'High-volume production facility with significant direct natural gas combustion for thermal processes.',
    fullOverview: 'Overview of Dallas facility emissions.',
    tags: ['CO2', 'Natural Gas', 'FY26'],
    aiInsights: {
      decarbonizationPriority: 'High',
      estimatedCostSavingsUsd: 120000,
      recommendedActions: ['Electrify thermal heating systems', 'Install heat recovery loops'],
    },
  },
  {
    title: 'Green Grid Data Center Audit',
    facilityName: 'Ashburn DC-3',
    facilityType: 'Data Center' as const,
    location: 'Ashburn, VA',
    auditYear: 2025,
    scopeCategory: 'Scope 2 (Indirect Energy)' as const,
    carbonScoreTons: 2100,
    energyUsageKwh: 12500000,
    riskRating: 'Low Carbon' as const,
    shortDescription: 'Hyperscale facility utilizing 100% virtual power purchase agreements (vPPAs) for offset matching.',
    fullOverview: 'Overview of Ashburn data center electricity matching.',
    tags: ['PPA', 'PUE', 'Offset'],
    aiInsights: {
      decarbonizationPriority: 'Low',
      estimatedCostSavingsUsd: 85000,
      recommendedActions: ['Optimize liquid cooling loops', 'Upgrade server hardware density'],
    },
  },
  {
    title: 'Corporate Headquarters Assessment',
    facilityName: 'HQ Plaza Tower',
    facilityType: 'Corporate Office' as const,
    location: 'New York, NY',
    auditYear: 2026,
    scopeCategory: 'Scope 2 (Indirect Energy)' as const,
    carbonScoreTons: 950,
    energyUsageKwh: 3200000,
    riskRating: 'Moderate Impact' as const,
    shortDescription: 'Office skyscraper with optimized HVAC schedule controls but limited solar canopy surface area.',
    fullOverview: 'Overview of Manhattan tower commercial electricity usage.',
    tags: ['LEED', 'HVAC', 'Smart-Building'],
    aiInsights: {
      decarbonizationPriority: 'Medium',
      estimatedCostSavingsUsd: 42000,
      recommendedActions: ['Install smart window glazes', 'Upgrade perimeter LED light zones'],
    },
  },
  {
    title: 'Logistics Distribution Footprint',
    facilityName: 'Midwest Hub - 12',
    facilityType: 'Logistics Hub' as const,
    location: 'Chicago, IL',
    auditYear: 2026,
    scopeCategory: 'Scope 3 (Value Chain)' as const,
    carbonScoreTons: 8400,
    energyUsageKwh: 1800000,
    riskRating: 'High Emissions' as const,
    shortDescription: 'Cross-dock depot with significant transport emissions and aging warehouse heating equipment.',
    fullOverview: 'Overview of freight delivery scope 3 chain.',
    tags: ['Scope-3', 'Freight', 'Fleet'],
    aiInsights: {
      decarbonizationPriority: 'High',
      estimatedCostSavingsUsd: 95000,
      recommendedActions: ['Introduce electric delivery vans', 'Transition heating to geothermal pumps'],
    },
  },
  {
    title: 'Silicon Valley DC Expansion Audit',
    facilityName: 'Santa Clara DC-5',
    facilityType: 'Data Center' as const,
    location: 'Santa Clara, CA',
    auditYear: 2026,
    scopeCategory: 'Scope 2 (Indirect Energy)' as const,
    carbonScoreTons: 4200,
    energyUsageKwh: 24000000,
    riskRating: 'Moderate Impact' as const,
    shortDescription: 'Dense computing facility with high grid power draws. Planning local solar arrays installation.',
    fullOverview: 'Overview of Silicon Valley energy efficiency.',
    tags: ['Renewables', 'PUE', 'Cooling'],
    aiInsights: {
      decarbonizationPriority: 'Medium',
      estimatedCostSavingsUsd: 180000,
      recommendedActions: ['Incorporate free-air cooling dampers', 'Install onsite solar storage battery arrays'],
    },
  },
  {
    title: 'Retail Store Decarbonization Audit',
    facilityName: 'Metro Outlet Centre',
    facilityType: 'Retail Store' as const,
    location: 'Los Angeles, CA',
    auditYear: 2025,
    scopeCategory: 'Scope 2 (Indirect Energy)' as const,
    carbonScoreTons: 350,
    energyUsageKwh: 980000,
    riskRating: 'Low Carbon' as const,
    shortDescription: 'Modern flagship outlet equipped with high-efficiency refrigeration and smart lighting profiles.',
    fullOverview: 'LA retail efficiency audit results.',
    tags: ['Retail', 'LED', 'Smart-Grid'],
    aiInsights: {
      decarbonizationPriority: 'Low',
      estimatedCostSavingsUsd: 15000,
      recommendedActions: ['Optimize off-hour thermostat setbacks'],
    },
  },
  {
    title: 'European Manufacturing Center Audit',
    facilityName: 'Munich Assembly-1',
    facilityType: 'Manufacturing' as const,
    location: 'Munich, Germany',
    auditYear: 2026,
    scopeCategory: 'Scope 1 (Direct)' as const,
    carbonScoreTons: 15300,
    energyUsageKwh: 8200000,
    riskRating: 'Critical Failure' as const,
    shortDescription: 'Industrial assembly site with coal-fired boilers requiring immediate replacement to meet regional regulations.',
    fullOverview: 'Boiler emissions breakdown at Munich plant.',
    tags: ['Boiler', 'Compliance', 'EU-ETS'],
    aiInsights: {
      decarbonizationPriority: 'High',
      estimatedCostSavingsUsd: 280000,
      recommendedActions: ['Replace coal boiler with green hydrogen system', 'Install carbon capture scrubbers'],
    },
  },
  {
    title: 'Seattle Office Microgrid Audit',
    facilityName: 'Emerald Office Park',
    facilityType: 'Corporate Office' as const,
    location: 'Seattle, WA',
    auditYear: 2026,
    scopeCategory: 'Scope 2 (Indirect Energy)' as const,
    carbonScoreTons: 150,
    energyUsageKwh: 1100000,
    riskRating: 'Low Carbon' as const,
    shortDescription: 'Net-zero ready building running on local solar and hydropower purchase agreements.',
    fullOverview: 'Seattle commercial microgrid details.',
    tags: ['Net-Zero', 'Microgrid', 'Hydro'],
    aiInsights: {
      decarbonizationPriority: 'Low',
      estimatedCostSavingsUsd: 8000,
      recommendedActions: ['Configure smart EV charger load balancing'],
    },
  },
  {
    title: 'Logistics Cold Storage Review',
    facilityName: 'Atlanta Cold Depot',
    facilityType: 'Logistics Hub' as const,
    location: 'Atlanta, GA',
    auditYear: 2026,
    scopeCategory: 'Scope 2 (Indirect Energy)' as const,
    carbonScoreTons: 3800,
    energyUsageKwh: 6400000,
    riskRating: 'Moderate Impact' as const,
    shortDescription: 'Heavy refrigeration facility. Investigating coolant leaks and insulation replacements.',
    fullOverview: 'Atlanta cooling units compressor audits.',
    tags: ['Refrigeration', 'Insulation', 'HFCs'],
    aiInsights: {
      decarbonizationPriority: 'Medium',
      estimatedCostSavingsUsd: 55000,
      recommendedActions: ['Upgrade cold room door seals', 'Switch to low-GWP refrigerants'],
    },
  },
  {
    title: 'Retail Outlets Fleet Integration',
    facilityName: 'Dallas Retail District',
    facilityType: 'Retail Store' as const,
    location: 'Dallas, TX',
    auditYear: 2026,
    scopeCategory: 'Scope 3 (Value Chain)' as const,
    carbonScoreTons: 2900,
    energyUsageKwh: 450000,
    riskRating: 'Moderate Impact' as const,
    shortDescription: 'Analyzing supplier shipping footprint and last-mile delivery routes across the metropolitan zone.',
    fullOverview: 'Dallas regional store logistics audit.',
    tags: ['Supply-Chain', 'Logistics', 'Last-Mile'],
    aiInsights: {
      decarbonizationPriority: 'Medium',
      estimatedCostSavingsUsd: 38000,
      recommendedActions: ['Consolidate local courier runs', 'Partner with postal carriers using green fleets'],
    },
  },
  {
    title: 'East Coast Distribution Center',
    facilityName: 'Boston Storage Park',
    facilityType: 'Logistics Hub' as const,
    location: 'Boston, MA',
    auditYear: 2025,
    scopeCategory: 'Scope 1 (Direct)' as const,
    carbonScoreTons: 7100,
    energyUsageKwh: 1200000,
    riskRating: 'High Emissions' as const,
    shortDescription: 'Large warehouse using propane forklifts and diesel standby generators. Upgrades needed.',
    fullOverview: 'Standby assets emissions profile.',
    tags: ['Diesel', 'Propane', 'Electrification'],
    aiInsights: {
      decarbonizationPriority: 'High',
      estimatedCostSavingsUsd: 72000,
      recommendedActions: ['Replace propane forklifts with lithium-ion units', 'Install backup battery systems'],
    },
  },
  {
    title: 'Legacy Assembly Plant Review',
    facilityName: 'Detroit Assembly Plant',
    facilityType: 'Manufacturing' as const,
    location: 'Detroit, MI',
    auditYear: 2026,
    scopeCategory: 'Scope 1 (Direct)' as const,
    carbonScoreTons: 19800,
    energyUsageKwh: 9500000,
    riskRating: 'Critical Failure' as const,
    shortDescription: 'Heavy vehicle assembly facility with aging pneumatic equipment, furnace losses, and steam leaks.',
    fullOverview: 'Pneumatics losses at Detroit site.',
    tags: ['Pneumatics', 'Furnace', 'Steam-Leaks'],
    aiInsights: {
      decarbonizationPriority: 'High',
      estimatedCostSavingsUsd: 310000,
      recommendedActions: ['Deploy ultrasonic leak detectors', 'Upgrade induction melting furnaces'],
    },
  }
];

export const seedDatabase = async (): Promise<void> => {
  try {
    const auditCount = await EsgAudit.countDocuments();
    if (auditCount > 0) {
      console.log('[Seeder]: Database already has audits. Skipping seed.');
      return;
    }

    console.log('[Seeder]: No audits found. Initiating database seed...');

    // Find or create default user for mock ownership
    let defaultUser = await User.findOne({ email: 'manager@greenpulse.ai' });
    if (!defaultUser) {
      defaultUser = await User.create({
        name: 'System ESG Manager',
        email: 'manager@greenpulse.ai',
        role: 'facility_manager',
        organization: 'GreenPulse Global',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
      });
      console.log('[Seeder]: Created default system compliance manager account.');
    }

    const auditsToInsert = SEED_AUDITS.map((audit) => ({
      ...audit,
      createdBy: defaultUser!._id,
      fullOverview: audit.fullOverview || `${audit.title} at ${audit.facilityName} covers scope emissions and compliance factors.`,
    }));

    await EsgAudit.insertMany(auditsToInsert);
    console.log(`[Seeder]: Successfully seeded ${auditsToInsert.length} ESG compliance audits into the database.`);
  } catch (error) {
    console.error('[Seeder]: Critical database seeding error:', error);
  }
};
