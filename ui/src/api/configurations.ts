// Re-exported from @config-service/client via the api barrel
import { configurations } from './index.js';
import type { Configuration, ConfigurationCreate, ConfigurationUpdate } from './index.js';

export function listConfigurations(applicationId: string): Promise<Configuration[]> {
  return configurations.list(applicationId);
}

export function getConfiguration(id: string): Promise<Configuration> {
  return configurations.get(id);
}

export function createConfiguration(data: ConfigurationCreate): Promise<Configuration> {
  return configurations.create(data);
}

export function updateConfiguration(id: string, data: ConfigurationUpdate): Promise<Configuration> {
  return configurations.update(id, data);
}

export function deleteConfiguration(id: string): Promise<void> {
  return configurations.delete(id);
}
