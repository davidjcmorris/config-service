// Re-exported from @config-service/client via the api barrel
import { applications } from './index.js';
import type { Application, ApplicationCreate, ApplicationUpdate } from './index.js';

export function listApplications(): Promise<Application[]> {
  return applications.list();
}

export function getApplication(id: string): Promise<Application> {
  return applications.get(id);
}

export function createApplication(data: ApplicationCreate): Promise<Application> {
  return applications.create(data);
}

export function updateApplication(id: string, data: ApplicationUpdate): Promise<Application> {
  return applications.update(id, data);
}

export function deleteApplication(id: string): Promise<void> {
  return applications.delete(id);
}
