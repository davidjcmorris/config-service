import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createConfigServiceClient } from '@config-service/client';

// The low-level HTTP primitives (get/post/put/del) now live in @config-service/client.
// This test exercises the same behaviour via the client instance.
const client = createConfigServiceClient('');

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

describe('API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('get', () => {
    it('returns parsed JSON on success', async () => {
      mockFetch(200, { id: '1', name: 'test' });
      const result = await client.applications.list();
      expect(result).toEqual({ id: '1', name: 'test' });
    });

    it('throws ApiError with status and detail on non-2xx', async () => {
      mockFetch(404, { detail: 'Not found' });
      await expect(client.applications.get('missing')).rejects.toThrow(ApiError);
      await expect(client.applications.get('missing')).rejects.toMatchObject({
        status: 404,
        detail: 'Not found',
      });
    });

    it('throws ApiError with fallback message when no detail field', async () => {
      mockFetch(500, {});
      await expect(client.applications.list()).rejects.toMatchObject({
        status: 500,
      });
    });
  });

  describe('post', () => {
    beforeEach(() => {
      mockFetch(201, { id: '1', name: 'new-app', comments: null, configuration_ids: [] });
    });

    it('sends Content-Type header', async () => {
      await client.applications.create({ name: 'new-app' });
      const fetchMock = vi.mocked(fetch);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });

    it('sends serialised body', async () => {
      await client.applications.create({ name: 'new-app' });
      const fetchMock = vi.mocked(fetch);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.body).toBe(JSON.stringify({ name: 'new-app' }));
    });

    it('returns parsed JSON on success', async () => {
      const result = await client.applications.create({ name: 'new-app' });
      expect(result.id).toBe('1');
    });
  });

  describe('put', () => {
    it('sends PUT method', async () => {
      mockFetch(200, { id: '1', name: 'updated', comments: null, configuration_ids: [] });
      await client.applications.update('1', { name: 'updated' });
      const fetchMock = vi.mocked(fetch);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.method).toBe('PUT');
    });
  });

  describe('del', () => {
    it('returns undefined on 204', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 204,
          json: () => Promise.resolve(undefined),
        }),
      );
      const result = await client.applications.delete('1');
      expect(result).toBeUndefined();
    });

    it('throws ApiError on 404', async () => {
      mockFetch(404, { detail: 'Application not found' });
      await expect(client.applications.delete('missing')).rejects.toMatchObject({
        status: 404,
        detail: 'Application not found',
      });
    });
  });
});
