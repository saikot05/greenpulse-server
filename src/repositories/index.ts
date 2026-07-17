import { EsgAuditRepository } from './audit.repository.js';
import { CarbonAnalysisRepository } from './carbon.repository.js';
import { ConversationRepository } from './chat.repository.js';

// Export class references for extension/mocking
export { BaseRepository } from './base.repository.js';
export { EsgAuditRepository } from './audit.repository.js';
export { CarbonAnalysisRepository } from './carbon.repository.js';
export { ConversationRepository } from './chat.repository.js';

// Export singleton instances for direct import in controllers/services
export const esgAuditRepository = new EsgAuditRepository();
export const carbonAnalysisRepository = new CarbonAnalysisRepository();
export const conversationRepository = new ConversationRepository();
