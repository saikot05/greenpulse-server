import { Router } from 'express';
import { healthRouter } from './health.route.js';
import { aiRouter } from './ai.route.js';
import { auditRouter } from './audit.route.js';

const v1Router = Router();

// Register routes
v1Router.use(healthRouter);
v1Router.use(aiRouter);
v1Router.use(auditRouter);

export { v1Router };
