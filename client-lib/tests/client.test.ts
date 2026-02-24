import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/errors.js';
import { createHttpClient } from '../src/client.js';

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

describe('createHttpClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('URL construction', () => {
    it('constructs full URL from baseUrl and path', async () => {
      mockFetch(200, {});
      const http = createHttpClient('http://localhost:8000');
      await http.get('/api/v1/applications');
      const fetchMock = vi.mocked(fetch);
      expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8000/api/v1/applications');
    });

    it('strips trailing slash from baseUrl', async () => {
      mockFetch(200, {});
      const http = createHttpClient('http://localhost:8000/');
      await http.get('/api/v1/applications');
      const fetchMock = vi.mocked(fetch);
      expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8000/api/v1/applications');
    });
  });

  describe('get', () => {
    it('returns parsed JSON on 200', async () => {
      mockFetch(200, { id: '1', name: 'test' });
      const http = createHttpClient('http://localhost:8000');
      const result = await http.get<{ id: string; name: string }>('/api/v1/applications');
      expect(result).toEqual({ id: '1', name: 'test' });
    });

    it('throws ApiError with status and detail on non-2xx', async () => {
      mockFetch(404, { detail: 'Not found' });
      const http = createHttpClient('http://localhost:8000');
      await expect(http.get('/api/v1/applications/missing')).rejects.toThrow(ApiError);
      await expect(http.get('/api/v1/applications/missing')).rejects.toMatchObject({
        status: 404,
        detail: 'Not found',
      });
    });

    it('throws ApiError with fallback detail when no detail field', async () => {
      mockFetch(500, {});
      const http = createHttpClient('http://localhost:8000');
      await expect(http.get('/api/v1/applications')).rejects.toMatchObject({
        status: 500,
        detail: 'HTTP 500',
      });
    });
  });

  describe('post', () => {
    it('sends Content-Type header', async () => {
      mockFetch(201, { id: '1', name: 'new-app' });
      const http = createHttpClient('http://localhost:8000');
      await http.post('/api/v1/applications', { name: 'new-app' });
      const fetchMock = vi.mocked(fetch);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });

    it('sends serialised body', async () => {
      mockFetch(201, { id: '1', name: 'new-app' });
      const http = createHttpClient('http://localhost:8000');
      await http.post('/api/v1/applications', { name: 'new-app' });
      const fetchMock = vi.mocked(fetch);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.body).toBe(JSON.stringify({ name: 'new-app' }));
    });

    it('returns parsed JSON on success', async () => {
      mockFetch(201, { id: '1', name: 'new-app' });
      const http = createHttpClient('http://localhost:8000');
      const result = await http.post<{ id: string }>('/api/v1/applications', { name: 'new-app' });
      expect(result.id).toBe('1');
    });
  });

  describe('put', () => {
    it('sends PUT method', async () => {
      mockFetch(200, { id: '1', name: 'updated' });
      const http = createHttpClient('http://localhost:8000');
      await http.put('/api/v1/applications/1', { name: 'updated' });
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
      const http = createHttpClient('http://localhost:8000');
      const result = await http.del('/api/v1/applications/1');
      expect(result).toBeUndefined();
    });

    it('throws ApiError on 404', async () => {
      mockFetch(404, { detail: 'Application not found' });
      const http = createHttpClient('http://localhost:8000');
      await expect(http.del('/api/v1/applications/missing')).rejects.toMatchObject({
        status: 404,
        detail: 'Application not found',
      });
    });
  });
});
