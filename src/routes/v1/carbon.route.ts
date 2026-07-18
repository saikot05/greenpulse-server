import { Router } from 'express';
import { analyzeCarbonData } from '../../controllers/carbon.controller.js';

const carbonRouter = Router();

carbonRouter.post('/analyze', analyzeCarbonData);

export { carbonRouter };
