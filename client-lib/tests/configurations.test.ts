import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConfigurationsClient } from '../src/configurations.js';
import { createHttpClient } from '../src/client.js';
import type { ConfigurationsClient } from '../src/configurations.js';
import type { Configuration } from '../src/types.js';

const SAMPLE_CFG: Configuration = {
  id: 'cfg-1',
  application_id: 'app-1',
  name: 'db-settings',
  comments: 'DB config',
  config: { host: 'localhost', port: 5432 },
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

describe('ConfigurationsClient', () => {
  let client: ConfigurationsClient;

  beforeEach(() => {
    client = createConfigurationsClient(createHttpClient('http://localhost:8000'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('list', () => {
    it('sends GET to /api/v1/configurations with application_id query param', async () => {
      mockFetch(200, [SAMPLE_CFG]);
      await client.list('app-1');
      const fetchMock = vi.mocked(fetch);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        'http://localhost:8000/api/v1/configurations?application_id=app-1',
      );
      expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe('GET');
    });

    it('URL-encodes the application_id', async () => {
      mockFetch(200, []);
      await client.list('app/with spaces');
      const fetchMock = vi.mocked(fetch);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        'http://localhost:8000/api/v1/configurations?application_id=app%2Fwith%20spaces',
      );
    });

    it('returns array of configurations', async () => {
      mockFetch(200, [SAMPLE_CFG]);
      const result = await client.list('app-1');
      expect(result).toEqual([SAMPLE_CFG]);
    });
  });

  describe('get', () => {
    it('sends GET to /api/v1/configurations/{id}', async () => {
      mockFetch(200, SAMPLE_CFG);
      await client.get('cfg-1');
      const fetchMock = vi.mocked(fetch);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        'http://localhost:8000/api/v1/configurations/cfg-1',
      );
    });

    it('returns the configuration', async () => {
      mockFetch(200, SAMPLE_CFG);
      const result = await client.get('cfg-1');
      expect(result).toEqual(SAMPLE_CFG);
    });
  });

  describe('create', () => {
    it('sends POST to /api/v1/configurations with body', async () => {
      mockFetch(201, SAMPLE_CFG);
      await client.create({
        application_id: 'app-1',
        name: 'db-settings',
        config: { host: 'localhost' },
      });
      const fetchMock = vi.mocked(fetch);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8000/api/v1/configurations');
      expect(init.method).toBe('POST');
      expect(init.body).toBe(
        JSON.stringify({ application_id: 'app-1', name: 'db-settings', config: { host: 'localhost' } }),
      );
    });

    it('returns the created configuration', async () => {
      mockFetch(201, SAMPLE_CFG);
      const result = await client.create({ application_id: 'app-1', name: 'db-settings' });
      expect(result).toEqual(SAMPLE_CFG);
    });
  });

  describe('update', () => {
    it('sends PUT to /api/v1/configurations/{id} with body', async () => {
      mockFetch(200, { ...SAMPLE_CFG, name: 'updated' });
      await client.update('cfg-1', { name: 'updated' });
      const fetchMock = vi.mocked(fetch);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        'http://localhost:8000/api/v1/configurations/cfg-1',
      );
      expect(init.method).toBe('PUT');
      expect(init.body).toBe(JSON.stringify({ name: 'updated' }));
    });

    it('returns the updated configuration', async () => {
      const updated = { ...SAMPLE_CFG, name: 'updated' };
      mockFetch(200, updated);
      const result = await client.update('cfg-1', { name: 'updated' });
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('sends DELETE to /api/v1/configurations/{id}', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, status: 204, json: () => Promise.resolve(undefined) }),
      );
      await client.delete('cfg-1');
      const fetchMock = vi.mocked(fetch);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        'http://localhost:8000/api/v1/configurations/cfg-1',
      );
      expect(init.method).toBe('DELETE');
    });

    it('returns undefined on 204', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, status: 204, json: () => Promise.resolve(undefined) }),
      );
      const result = await client.delete('cfg-1');
      expect(result).toBeUndefined();
    });
  });
});
