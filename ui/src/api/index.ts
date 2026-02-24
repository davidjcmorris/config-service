import { createConfigServiceClient } from '@config-service/client';

export { ApiError, friendlyErrorMessage } from '@config-service/client';
export type {
  Application,
  Configuration,
  ApplicationCreate,
  ApplicationUpdate,
  ConfigurationCreate,
  ConfigurationUpdate,
} from '@config-service/client';

// Instantiate with the Vite dev proxy path — relative URL works in the browser
const client = createConfigServiceClient('');

export const applications = client.applications;
export const configurations = client.configurations;
