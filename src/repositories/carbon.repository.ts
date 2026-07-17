import { BaseRepository } from './base.repository.js';
import { CarbonAnalysis } from '../models/CarbonAnalysis.model.js';
import type { ICarbonAnalysis } from '../models/CarbonAnalysis.model.js';

/**
 * Repository layer for Carbon Analysis entities.
 * Inherits all standard CRUD helper operations from BaseRepository.
 */
export class CarbonAnalysisRepository extends BaseRepository<ICarbonAnalysis> {
  constructor() {
    super(CarbonAnalysis);
  }
}
export default CarbonAnalysisRepository;
