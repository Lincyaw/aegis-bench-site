import { setupWorker } from 'msw/browser';
import { contractHandler } from './contract';
import { handlers } from './handlers';

export const worker = setupWorker(contractHandler(handlers));
