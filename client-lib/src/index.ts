export { ApiError, friendlyErrorMessage } from './errors.js';
export type {
  Application,
  Configuration,
  ApplicationCreate,
  ApplicationUpdate,
  ConfigurationCreate,
  ConfigurationUpdate,
} from './types.js';
export type { ApplicationsClient } from './applications.js';
export type { ConfigurationsClient } from './configurations.js';

import { createHttpClient } from './client.js';
import { createApplicationsClient } from './applications.js';
import { createConfigurationsClient } from './configurations.js';

export interface ConfigServiceClient {
  applications: import('./applications.js').ApplicationsClient;
  configurations: import('./configurations.js').ConfigurationsClient;
}

export function createConfigServiceClient(baseUrl: string): ConfigServiceClient {
  const http = createHttpClient(baseUrl);
  return {
    applications: createApplicationsClient(http),
    configurations: createConfigurationsClient(http),
  };
}
