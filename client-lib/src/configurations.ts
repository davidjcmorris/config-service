import type { HttpClient } from './client.js';
import type {
  Configuration,
  ConfigurationCreate,
  ConfigurationUpdate,
} from './types.js';

const PATH = '/api/v1/configurations';

export interface ConfigurationsClient {
  list(applicationId: string): Promise<Configuration[]>;
  get(id: string): Promise<Configuration>;
  create(data: ConfigurationCreate): Promise<Configuration>;
  update(id: string, data: ConfigurationUpdate): Promise<Configuration>;
  delete(id: string): Promise<void>;
}

export function createConfigurationsClient(http: HttpClient): ConfigurationsClient {
  return {
    list: (applicationId) =>
      http.get<Configuration[]>(`${PATH}?application_id=${encodeURIComponent(applicationId)}`),
    get: (id) => http.get<Configuration>(`${PATH}/${id}`),
    create: (data) => http.post<Configuration>(PATH, data),
    update: (id, data) => http.put<Configuration>(`${PATH}/${id}`, data),
    delete: (id) => http.del(`${PATH}/${id}`),
  };
}
