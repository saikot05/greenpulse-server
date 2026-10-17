-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'facility_manager', 'auditor');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('Manufacturing', 'Data Center', 'Corporate Office', 'Logistics Hub', 'Retail Store');

-- CreateEnum
CREATE TYPE "ScopeCategory" AS ENUM ('Scope 1 (Direct)', 'Scope 2 (Indirect Energy)', 'Scope 3 (Value Chain)');

-- CreateEnum
CREATE TYPE "RiskRating" AS ENUM ('Low Carbon', 'Moderate Impact', 'High Emissions', 'Critical Failure');

-- CreateEnum
CREATE TYPE "DecarbonizationPriority" AS ENUM ('High', 'Medium', 'Low');

-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('gemini', 'mistral');

-- CreateEnum
CREATE TYPE "BillProcessingStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'facility_manager',
    "organization" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_audits" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "facilityName" TEXT NOT NULL,
    "facilityType" "FacilityType" NOT NULL,
    "location" TEXT NOT NULL,
    "auditYear" INTEGER NOT NULL,
    "scopeCategory" "ScopeCategory" NOT NULL,
    "carbonScoreTons" DECIMAL(12,2) NOT NULL,
    "energyUsageKwh" DECIMAL(14,2) NOT NULL,
    "riskRating" "RiskRating" NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "fullOverview" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esg_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_insights" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "decarbonizationPriority" "DecarbonizationPriority" NOT NULL,
    "estimatedCostSavingsUsd" DECIMAL(12,2) NOT NULL,
    "recommendedActions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utility_bills" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "auditId" TEXT,
    "facilityName" TEXT NOT NULL,
    "location" TEXT,
    "facilityType" "FacilityType" NOT NULL,
    "energyUsageKwh" DECIMAL(14,2) NOT NULL,
    "estimatedCarbonTons" DECIMAL(12,2) NOT NULL,
    "scopeCategory" "ScopeCategory" NOT NULL,
    "riskRating" "RiskRating" NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "fullOverview" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL DEFAULT 'gemini',
    "status" "BillProcessingStatus" NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utility_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EsgAuditToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EsgAuditToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "esg_audits_facilityType_riskRating_auditYear_idx" ON "esg_audits"("facilityType", "riskRating", "auditYear" DESC);

-- CreateIndex
CREATE INDEX "esg_audits_scopeCategory_idx" ON "esg_audits"("scopeCategory");

-- CreateIndex
CREATE INDEX "esg_audits_createdBy_idx" ON "esg_audits"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "ai_insights_auditId_key" ON "ai_insights"("auditId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "utility_bills_userId_idx" ON "utility_bills"("userId");

-- CreateIndex
CREATE INDEX "utility_bills_auditId_idx" ON "utility_bills"("auditId");

-- CreateIndex
CREATE INDEX "_EsgAuditToTag_B_index" ON "_EsgAuditToTag"("B");

-- AddForeignKey
ALTER TABLE "esg_audits" ADD CONSTRAINT "esg_audits_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "esg_audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "esg_audits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EsgAuditToTag" ADD CONSTRAINT "_EsgAuditToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "esg_audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EsgAuditToTag" ADD CONSTRAINT "_EsgAuditToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
