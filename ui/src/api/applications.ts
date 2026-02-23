import { del, get, post, put } from './client.js';
import type { Application } from '../types/models.js';

const BASE = '/api/v1/applications';

export function listApplications(): Promise<Application[]> {
  return get<Application[]>(BASE);
}

export function getApplication(id: string): Promise<Application> {
  return get<Application>(`${BASE}/${id}`);
}

export function createApplication(data: {
  name: string;
  comments?: string | null;
}): Promise<Application> {
  return post<Application>(BASE, data);
}

export function updateApplication(
  id: string,
  data: { name?: string; comments?: string | null },
): Promise<Application> {
  return put<Application>(`${BASE}/${id}`, data);
}

export function deleteApplication(id: string): Promise<void> {
  return del(`${BASE}/${id}`);
}
