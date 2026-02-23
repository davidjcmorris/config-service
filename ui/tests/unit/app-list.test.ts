import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock API modules before importing the component
vi.mock('../../src/api/applications.js', () => ({
  listApplications: vi.fn(),
}));
vi.mock('../../src/api/configurations.js', () => ({
  listConfigurations: vi.fn(),
}));

import { listApplications } from '../../src/api/applications.js';
import { listConfigurations } from '../../src/api/configurations.js';
import type { Application, Configuration } from '../../src/types/models.js';

// Register the component
import '../../src/components/app-list.js';

const SAMPLE_APP: Application = {
  id: 'app-1',
  name: 'my-app',
  comments: null,
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
  return document.querySelector('app-list')!;
}

function getShadow(): ShadowRoot {
  return getEl().shadowRoot!;
}

describe('app-list', () => {
  beforeEach(() => {
    vi.mocked(listApplications).mockResolvedValue([SAMPLE_APP]);
    vi.mocked(listConfigurations).mockResolvedValue([SAMPLE_CFG]);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('renders application names after loading', async () => {
    document.body.innerHTML = '<app-list></app-list>';
    // Wait for async load
    await vi.waitFor(() => {
      expect(getShadow().textContent).toContain('my-app');
    });
  });

  it('shows empty state when no applications', async () => {
    vi.mocked(listApplications).mockResolvedValue([]);
    document.body.innerHTML = '<app-list></app-list>';
    await vi.waitFor(() => {
      expect(getShadow().textContent).toContain('No applications yet');
    });
  });

  it('expands application and fetches configurations on click', async () => {
    document.body.innerHTML = '<app-list></app-list>';
    await vi.waitFor(() => {
      expect(getShadow().textContent).toContain('my-app');
    });

    const nameBtn = getShadow().querySelector('.app-name-btn') as HTMLButtonElement;
    nameBtn.click();

    await vi.waitFor(() => {
      expect(listConfigurations).toHaveBeenCalledWith('app-1');
      expect(getShadow().textContent).toContain('db-settings');
    });
  });

  it('collapses application on second click', async () => {
    document.body.innerHTML = '<app-list></app-list>';
    await vi.waitFor(() => {
      expect(getShadow().textContent).toContain('my-app');
    });

    const nameBtn = getShadow().querySelector('.app-name-btn') as HTMLButtonElement;
    nameBtn.click();
    await vi.waitFor(() => {
      expect(getShadow().querySelector('.config-section')).not.toBeNull();
    });

    nameBtn.click();
    await vi.waitFor(() => {
      expect(getShadow().querySelector('.config-section')).toBeNull();
    });
  });

  it('dispatches navigate-to-app-form with no id when add-app clicked', async () => {
    document.body.innerHTML = '<app-list></app-list>';
    await vi.waitFor(() => {
      expect(getShadow().textContent).toContain('my-app');
    });

    const events: CustomEvent[] = [];
    getEl().addEventListener('navigate-to-app-form', (e) => events.push(e as CustomEvent));

    (getShadow().querySelector('.add-app') as HTMLButtonElement).click();
    expect(events).toHaveLength(1);
    expect(events[0]!.detail.applicationId).toBeUndefined();
  });

  it('dispatches navigate-to-app-form with applicationId when edit-app clicked', async () => {
    document.body.innerHTML = '<app-list></app-list>';
    await vi.waitFor(() => {
      expect(getShadow().textContent).toContain('my-app');
    });

    const events: CustomEvent[] = [];
    getEl().addEventListener('navigate-to-app-form', (e) => events.push(e as CustomEvent));

    (getShadow().querySelector('.edit-app') as HTMLButtonElement).click();
    expect(events).toHaveLength(1);
    expect(events[0]!.detail.applicationId).toBe('app-1');
  });

  it('dispatches navigate-to-config-form with applicationId when add-config clicked', async () => {
    document.body.innerHTML = '<app-list></app-list>';
    await vi.waitFor(() => {
      expect(getShadow().textContent).toContain('my-app');
    });

    // Expand first
    (getShadow().querySelector('.app-name-btn') as HTMLButtonElement).click();
    await vi.waitFor(() => {
      expect(getShadow().querySelector('.add-config')).not.toBeNull();
    });

    const events: CustomEvent[] = [];
    getEl().addEventListener('navigate-to-config-form', (e) => events.push(e as CustomEvent));

    (getShadow().querySelector('.add-config') as HTMLButtonElement).click();
    expect(events).toHaveLength(1);
    expect(events[0]!.detail.applicationId).toBe('app-1');
    expect(events[0]!.detail.configurationId).toBeUndefined();
  });

  it('dispatches navigate-to-config-form with both ids when edit-config clicked', async () => {
    document.body.innerHTML = '<app-list></app-list>';
    await vi.waitFor(() => {
      expect(getShadow().textContent).toContain('my-app');
    });

    (getShadow().querySelector('.app-name-btn') as HTMLButtonElement).click();
    await vi.waitFor(() => {
      expect(getShadow().querySelector('.edit-config')).not.toBeNull();
    });

    const events: CustomEvent[] = [];
    getEl().addEventListener('navigate-to-config-form', (e) => events.push(e as CustomEvent));

    (getShadow().querySelector('.edit-config') as HTMLButtonElement).click();
    expect(events).toHaveLength(1);
    expect(events[0]!.detail.applicationId).toBe('app-1');
    expect(events[0]!.detail.configurationId).toBe('cfg-1');
  });
});
