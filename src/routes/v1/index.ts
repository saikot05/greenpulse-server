import { Router } from 'express';
import { healthRouter } from './health.route.js';

const v1Router = Router();

// Register routes
v1Router.use(healthRouter);

export { v1Router };
