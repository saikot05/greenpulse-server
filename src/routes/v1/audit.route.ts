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

/**
 * Route: GET /api/v1/audits/:id
 * Description: Public. Retrieves a specific ESG audit by its ID.
 */
auditRouter.get(
  '/audits/:id',
  auditController.getAuditById
);

/**
 * Route: DELETE /api/v1/audits/:id
 * Description: Protected. Deletes a specific ESG audit by its ID if created by the current user.
 */
auditRouter.delete(
  '/audits/:id',
  auth,
  auditController.deleteAudit
);

export default auditRouter;

