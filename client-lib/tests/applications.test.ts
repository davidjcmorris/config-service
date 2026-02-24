import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApplicationsClient } from '../src/applications.js';
import { createHttpClient } from '../src/client.js';
import type { ApplicationsClient } from '../src/applications.js';
import type { Application } from '../src/types.js';

const SAMPLE_APP: Application = {
  id: 'app-1',
  name: 'my-app',
  comments: 'A test app',
  configuration_ids: ['cfg-1'],
};

function mockFetch(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

describe('ApplicationsClient', () => {
  let client: ApplicationsClient;

  beforeEach(() => {
    client = createApplicationsClient(createHttpClient('http://localhost:8000'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('list', () => {
    it('sends GET to /api/v1/applications', async () => {
      mockFetch(200, [SAMPLE_APP]);
      await client.list();
      const fetchMock = vi.mocked(fetch);
      expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8000/api/v1/applications');
      expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe('GET');
    });

    it('returns array of applications', async () => {
      mockFetch(200, [SAMPLE_APP]);
      const result = await client.list();
      expect(result).toEqual([SAMPLE_APP]);
    });
  });

  describe('get', () => {
    it('sends GET to /api/v1/applications/{id}', async () => {
      mockFetch(200, SAMPLE_APP);
      await client.get('app-1');
      const fetchMock = vi.mocked(fetch);
      expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8000/api/v1/applications/app-1');
    });

    it('returns the application', async () => {
      mockFetch(200, SAMPLE_APP);
      const result = await client.get('app-1');
      expect(result).toEqual(SAMPLE_APP);
    });
  });

  describe('create', () => {
    it('sends POST to /api/v1/applications with body', async () => {
      mockFetch(201, SAMPLE_APP);
      await client.create({ name: 'my-app', comments: 'A test app' });
      const fetchMock = vi.mocked(fetch);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8000/api/v1/applications');
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ name: 'my-app', comments: 'A test app' }));
    });

    it('returns the created application', async () => {
      mockFetch(201, SAMPLE_APP);
      const result = await client.create({ name: 'my-app' });
      expect(result).toEqual(SAMPLE_APP);
    });
  });

  describe('update', () => {
    it('sends PUT to /api/v1/applications/{id} with body', async () => {
      mockFetch(200, { ...SAMPLE_APP, name: 'updated' });
      await client.update('app-1', { name: 'updated' });
      const fetchMock = vi.mocked(fetch);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8000/api/v1/applications/app-1');
      expect(init.method).toBe('PUT');
      expect(init.body).toBe(JSON.stringify({ name: 'updated' }));
    });

    it('returns the updated application', async () => {
      const updated = { ...SAMPLE_APP, name: 'updated' };
      mockFetch(200, updated);
      const result = await client.update('app-1', { name: 'updated' });
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('sends DELETE to /api/v1/applications/{id}', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, status: 204, json: () => Promise.resolve(undefined) }),
      );
      await client.delete('app-1');
      const fetchMock = vi.mocked(fetch);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8000/api/v1/applications/app-1');
      expect(init.method).toBe('DELETE');
    });

    it('returns undefined on 204', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, status: 204, json: () => Promise.resolve(undefined) }),
      );
      const result = await client.delete('app-1');
      expect(result).toBeUndefined();
    });
  });
});
