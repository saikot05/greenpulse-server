import { Router } from 'express';
import { auditController } from '../../controllers/audit.controller.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createAuditSchema, queryAuditSchema } from '../../validators/audit.validator.js';

export const auditRouter = Router();

/**
 * Route: POST /api/v1/audits
 * Description: Protected. Creates a new ESG audit with Zod validation.
 */
auditRouter.post(
  '/audits',
  auth,
  validate({ body: createAuditSchema }),
  auditController.createAudit
);

/**
 * Route: GET /api/v1/audits
 * Description: Public/Protected. Retrieves all audits matching query parameter filters.
 */
auditRouter.get(
  '/audits',
  validate({ query: queryAuditSchema }),
  auditController.getAudits
);

export default auditRouter;
