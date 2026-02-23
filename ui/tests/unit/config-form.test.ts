import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/configurations.js', () => ({
  getConfiguration: vi.fn(),
  createConfiguration: vi.fn(),
  updateConfiguration: vi.fn(),
  deleteConfiguration: vi.fn(),
}));

import {
  createConfiguration,
  deleteConfiguration,
  getConfiguration,
  updateConfiguration,
} from '../../src/api/configurations.js';
import type { Configuration } from '../../src/types/models.js';

import '../../src/components/confirm-dialog.js';
import '../../src/components/config-form.js';

const SAMPLE_CFG: Configuration = {
  id: 'cfg-1',
  application_id: 'app-1',
  name: 'db-settings',
  comments: 'DB config',
  config: { host: 'localhost', port: 5432 },
};

function getEl(): HTMLElement {
  return document.querySelector('config-form')!;
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

describe('config-form', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('create mode (no configuration-id)', () => {
    beforeEach(() => {
      document.body.innerHTML = '<config-form application-id="app-1"></config-form>';
    });

    it('renders without delete button', () => {
      expect(getShadow().querySelector('.delete-btn')).toBeNull();
    });

    it('shows name error when name is empty', () => {
      submitForm();
      const errors = getShadow().querySelectorAll('.field-error');
      const hasNameError = Array.from(errors).some((e) => e.textContent?.includes('Name is required'));
      expect(hasNameError).toBe(true);
    });

    it('shows config error when config is invalid JSON', () => {
      getInput('name').value = 'my-config';
      getInput('config').value = 'not json';
      submitForm();
      const errors = getShadow().querySelectorAll('.field-error');
      const hasConfigError = Array.from(errors).some((e) => e.textContent?.includes('Invalid JSON'));
      expect(hasConfigError).toBe(true);
    });

    it('shows config error when config is a JSON array', () => {
      getInput('name').value = 'my-config';
      getInput('config').value = '[1, 2, 3]';
      submitForm();
      const errors = getShadow().querySelectorAll('.field-error');
      const hasConfigError = Array.from(errors).some((e) => e.textContent?.includes('JSON object'));
      expect(hasConfigError).toBe(true);
    });

    it('does not call createConfiguration when validation fails', () => {
      submitForm();
      expect(createConfiguration).not.toHaveBeenCalled();
    });

    it('calls createConfiguration with parsed config and dispatches navigate-to-app-form', async () => {
      vi.mocked(createConfiguration).mockResolvedValue(SAMPLE_CFG);

      const events: CustomEvent[] = [];
      getEl().addEventListener('navigate-to-app-form', (e) => events.push(e as CustomEvent));

      getInput('name').value = 'db-settings';
      getInput('config').value = '{"host": "localhost"}';
      submitForm();

      await vi.waitFor(() => {
        expect(createConfiguration).toHaveBeenCalledWith({
          application_id: 'app-1',
          name: 'db-settings',
          comments: null,
          config: { host: 'localhost' },
        });
        expect(events).toHaveLength(1);
        expect(events[0]!.detail.applicationId).toBe('app-1');
      });
    });

    it('shows API error on create failure', async () => {
      vi.mocked(createConfiguration).mockRejectedValue(
        new Error('Configuration with name already exists'),
      );

      getInput('name').value = 'duplicate';
      getInput('config').value = '{}';
      submitForm();

      await vi.waitFor(() => {
        expect(getShadow().querySelector('.api-error')?.textContent).toContain(
          'Configuration with name already exists',
        );
      });
    });

    it('dispatches navigate-to-app-form on cancel', () => {
      const events: CustomEvent[] = [];
      getEl().addEventListener('navigate-to-app-form', (e) => events.push(e as CustomEvent));
      (getShadow().querySelector('.cancel-btn') as HTMLButtonElement).click();
      expect(events).toHaveLength(1);
      expect(events[0]!.detail.applicationId).toBe('app-1');
    });
  });

  describe('edit mode (with configuration-id)', () => {
    beforeEach(async () => {
      vi.mocked(getConfiguration).mockResolvedValue(SAMPLE_CFG);
      document.body.innerHTML =
        '<config-form application-id="app-1" configuration-id="cfg-1"></config-form>';
      await vi.waitFor(() => {
        expect(getInput('name').value).toBe('db-settings');
      });
    });

    it('pre-fills name', () => {
      expect(getInput('name').value).toBe('db-settings');
    });

    it('pre-fills comments', () => {
      expect(getInput('comments').value).toBe('DB config');
    });

    it('pre-fills config as formatted JSON', () => {
      const configVal = getInput('config').value;
      expect(JSON.parse(configVal)).toEqual({ host: 'localhost', port: 5432 });
    });

    it('shows delete button', () => {
      expect(getShadow().querySelector('.delete-btn')).not.toBeNull();
    });

    it('calls updateConfiguration and dispatches navigate-to-app-form on save', async () => {
      vi.mocked(updateConfiguration).mockResolvedValue({ ...SAMPLE_CFG, name: 'updated' });

      const events: CustomEvent[] = [];
      getEl().addEventListener('navigate-to-app-form', (e) => events.push(e as CustomEvent));

      getInput('name').value = 'updated';
      submitForm();

      await vi.waitFor(() => {
        expect(updateConfiguration).toHaveBeenCalledWith(
          'cfg-1',
          expect.objectContaining({ name: 'updated' }),
        );
        expect(events).toHaveLength(1);
        expect(events[0]!.detail.applicationId).toBe('app-1');
      });
    });
  });
});
