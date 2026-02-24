import type { HttpClient } from './client.js';
import type {
  Application,
  ApplicationCreate,
  ApplicationUpdate,
} from './types.js';

const PATH = '/api/v1/applications';

export interface ApplicationsClient {
  list(): Promise<Application[]>;
  get(id: string): Promise<Application>;
  create(data: ApplicationCreate): Promise<Application>;
  update(id: string, data: ApplicationUpdate): Promise<Application>;
  delete(id: string): Promise<void>;
}

export function createApplicationsClient(http: HttpClient): ApplicationsClient {
  return {
    list: () => http.get<Application[]>(PATH),
    get: (id) => http.get<Application>(`${PATH}/${id}`),
    create: (data) => http.post<Application>(PATH, data),
    update: (id, data) => http.put<Application>(`${PATH}/${id}`, data),
    delete: (id) => http.del(`${PATH}/${id}`),
  };
}
