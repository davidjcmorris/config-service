import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/applications.js', () => ({
  getApplication: vi.fn(),
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
  deleteApplication: vi.fn(),
}));
vi.mock('../../src/api/configurations.js', () => ({
  listConfigurations: vi.fn(),
}));

import {
  createApplication,
  deleteApplication,
  getApplication,
  updateApplication,
} from '../../src/api/applications.js';
import { listConfigurations } from '../../src/api/configurations.js';
import type { Application, Configuration } from '../../src/types/models.js';

import '../../src/components/confirm-dialog.js';
import '../../src/components/app-form.js';

const SAMPLE_APP: Application = {
  id: 'app-1',
  name: 'my-app',
  comments: 'A test app',
  configuration_ids: ['cfg-1'],
};

const SAMPLE_CFG: Configuration = {
  id: 'cfg-1',
  application_id: 'app-1',
  name: 'db-settings',
  comments: null,
  config: { host: 'localhost' },
};

function getEl(): HTMLElement {
  return document.querySelector('app-form')!;
}

function getShadow(): ShadowRoot {
  return getEl().shadowRoot!;
}

function getInput(name: string): HTMLInputElement | HTMLTextAreaElement {
  return getShadow().querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement;
}

function submitForm(): void {
  (getShadow().querySelector('form') as HTMLFormElement).dispatchEvent(
    new Event('submit', { bubbles: true, cancelable: true }),
  );
}

describe('app-form', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('create mode (no application-id)', () => {
    beforeEach(() => {
      document.body.innerHTML = '<app-form></app-form>';
    });

    it('renders without delete button', () => {
      expect(getShadow().querySelector('.delete-btn')).toBeNull();
    });

    it('renders without config section', () => {
      expect(getShadow().querySelector('.section-title')).toBeNull();
    });

    it('shows inline error when name is empty', () => {
      submitForm();
      expect(getShadow().querySelector('.field-error')?.textContent).toContain('Name is required');
    });

    it('does not call createApplication when name is empty', () => {
      submitForm();
      expect(createApplication).not.toHaveBeenCalled();
    });

    it('calls createApplication and dispatches navigate-to-list on success', async () => {
      vi.mocked(createApplication).mockResolvedValue({ ...SAMPLE_APP, id: 'new-id' });

      const events: CustomEvent[] = [];
      getEl().addEventListener('navigate-to-list', (e) => events.push(e as CustomEvent));

      getInput('name').value = 'new-app';
      submitForm();

      await vi.waitFor(() => {
        expect(createApplication).toHaveBeenCalledWith({ name: 'new-app', comments: null });
        expect(events).toHaveLength(1);
      });
    });

    it('shows API error banner on create failure', async () => {
      const { ApiError } = await import('../../src/api/client.js');
      vi.mocked(createApplication).mockRejectedValue(new ApiError(409, 'Application with name already exists.'));

      getInput('name').value = 'duplicate';
      submitForm();

      await vi.waitFor(() => {
        expect(getShadow().querySelector('.api-error')?.textContent).toContain(
          'This name is already in use.',
        );
      });
    });

    it('dispatches navigate-to-list on cancel', () => {
      const events: CustomEvent[] = [];
      getEl().addEventListener('navigate-to-list', (e) => events.push(e as CustomEvent));
      (getShadow().querySelector('.cancel-btn') as HTMLButtonElement).click();
      expect(events).toHaveLength(1);
    });
  });

  describe('edit mode (with application-id)', () => {
    beforeEach(async () => {
      vi.mocked(getApplication).mockResolvedValue(SAMPLE_APP);
      vi.mocked(listConfigurations).mockResolvedValue([SAMPLE_CFG]);
      document.body.innerHTML = '<app-form application-id="app-1"></app-form>';
      await vi.waitFor(() => {
        expect(getInput('name').value).toBe('my-app');
      });
    });

    it('pre-fills name and comments', () => {
      expect(getInput('name').value).toBe('my-app');
      expect(getInput('comments').value).toBe('A test app');
    });

    it('shows config section with configurations', () => {
      expect(getShadow().querySelector('.section-title')).not.toBeNull();
      expect(getShadow().textContent).toContain('db-settings');
    });

    it('shows delete button', () => {
      expect(getShadow().querySelector('.delete-btn')).not.toBeNull();
    });

    it('calls updateApplication and dispatches navigate-to-list on save', async () => {
      vi.mocked(updateApplication).mockResolvedValue({ ...SAMPLE_APP, name: 'updated' });

      const events: CustomEvent[] = [];
      getEl().addEventListener('navigate-to-list', (e) => events.push(e as CustomEvent));

      getInput('name').value = 'updated';
      submitForm();

      await vi.waitFor(() => {
        expect(updateApplication).toHaveBeenCalledWith('app-1', {
          name: 'updated',
          comments: 'A test app',
        });
        expect(events).toHaveLength(1);
      });
    });

    it('dispatches navigate-to-config-form when add-config clicked', () => {
      const events: CustomEvent[] = [];
      getEl().addEventListener('navigate-to-config-form', (e) => events.push(e as CustomEvent));
      (getShadow().querySelector('.add-config-btn') as HTMLButtonElement).click();
      expect(events).toHaveLength(1);
      expect(events[0]!.detail.applicationId).toBe('app-1');
    });
  });
});
