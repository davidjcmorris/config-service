import { del, get, post, put } from './client.js';
import type { Configuration } from '../types/models.js';

const BASE = '/api/v1/configurations';

export function listConfigurations(applicationId: string): Promise<Configuration[]> {
  return get<Configuration[]>(`${BASE}?application_id=${encodeURIComponent(applicationId)}`);
}

export function getConfiguration(id: string): Promise<Configuration> {
  return get<Configuration>(`${BASE}/${id}`);
}

export function createConfiguration(data: {
  application_id: string;
  name: string;
  comments?: string | null;
  config?: Record<string, unknown>;
}): Promise<Configuration> {
  return post<Configuration>(BASE, data);
}

export function updateConfiguration(
  id: string,
  data: {
    name?: string;
    comments?: string | null;
    config?: Record<string, unknown>;
  },
): Promise<Configuration> {
  return put<Configuration>(`${BASE}/${id}`, data);
}

export function deleteConfiguration(id: string): Promise<void> {
  return del(`${BASE}/${id}`);
}
