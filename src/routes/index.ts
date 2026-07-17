import { Router } from 'express';
import { v1Router } from './v1/index.js';

const mainRouter = Router();

// Mount v1 routes
mainRouter.use('/v1', v1Router);

export { mainRouter };
