import { listApplications } from '../api/applications.js';
import { listConfigurations } from '../api/configurations.js';
import type { Application, Configuration } from '../types/models.js';

const STYLES = `
  :host {
    display: block;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    padding: 0 4px;
  }

  .toolbar h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text, #111827);
  }

  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: var(--radius, 6px);
    cursor: pointer;
    font-size: 1.1rem;
    color: var(--color-text-muted, #6b7280);
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;
  }

  .icon-btn:hover {
    background: var(--color-border, #e5e7eb);
    color: var(--color-text, #111827);
  }

  .icon-btn.add-app {
    color: var(--color-primary, #2563eb);
    font-size: 1.3rem;
  }

  .icon-btn.add-app:hover {
    background: #eff6ff;
  }

  .app-list {
    list-style: none;
    margin: 0;
    padding: 0;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: var(--radius, 6px);
    overflow: hidden;
    background: var(--color-surface, #fff);
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }

  .app-item {
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  .app-item:last-child {
    border-bottom: none;
  }

  .app-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    min-height: 44px;
  }

  .app-row:hover {
    background: var(--color-bg, #f9fafb);
  }

  .app-name-btn {
    flex: 1;
    background: transparent;
    border: none;
    text-align: left;
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--color-text, #111827);
    cursor: pointer;
    padding: 6px 4px;
    border-radius: var(--radius, 6px);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .app-name-btn:hover {
    color: var(--color-primary, #2563eb);
  }

  .chevron {
    font-size: 0.75rem;
    transition: transform 0.2s;
    color: var(--color-text-muted, #6b7280);
  }

  .chevron.expanded {
    transform: rotate(90deg);
  }

  .config-section {
    padding: 4px 8px 8px 44px;
    background: var(--color-bg, #f9fafb);
    border-top: 1px solid var(--color-border, #e5e7eb);
  }

  .config-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 4px;
    min-height: 36px;
  }

  .config-toolbar span {
    font-size: 0.8rem;
    color: var(--color-text-muted, #6b7280);
    font-style: italic;
  }

  .icon-btn.add-config {
    color: var(--color-primary, #2563eb);
  }

  .icon-btn.add-config:hover {
    background: #eff6ff;
  }

  .config-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .config-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 0;
    min-height: 36px;
  }

  .config-label {
    font-size: 0.875rem;
    color: var(--color-text, #111827);
    font-family: ui-monospace, monospace;
    word-break: break-all;
  }

  .loading {
    padding: 16px;
    text-align: center;
    color: var(--color-text-muted, #6b7280);
    font-size: 0.875rem;
  }

  .error-banner {
    padding: 12px 16px;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: var(--radius, 6px);
    color: #991b1b;
    font-size: 0.875rem;
    margin-bottom: 12px;
  }

  .empty-list {
    padding: 32px 16px;
    text-align: center;
    color: var(--color-text-muted, #6b7280);
    font-size: 0.875rem;
  }
`;

export class AppList extends HTMLElement {
  private applications: Application[] = [];
  private expandedId: string | null = null;
  private configurationsCache = new Map<string, Configuration[]>();
  private loadingConfigs = new Set<string>();
  private apiError: string | null = null;

  connectedCallback(): void {
    this.attachShadow({ mode: 'open' });
    this.render();
    void this.loadApplications();
  }

  async loadApplications(): Promise<void> {
    try {
      this.applications = await listApplications();
      this.apiError = null;
    } catch (err) {
      this.apiError = err instanceof Error ? err.message : 'Failed to load applications';
    }
    this.render();
  }

  private async toggleExpand(appId: string): Promise<void> {
    if (this.expandedId === appId) {
      this.expandedId = null;
      this.render();
      return;
    }
    this.expandedId = appId;
    this.render();

    if (!this.configurationsCache.has(appId)) {
      this.loadingConfigs.add(appId);
      this.render();
      try {
        const configs = await listConfigurations(appId);
        this.configurationsCache.set(appId, configs);
      } catch {
        this.configurationsCache.set(appId, []);
      }
      this.loadingConfigs.delete(appId);
      this.render();
    }
  }

  private dispatch(event: string, detail: Record<string, unknown>): void {
    this.dispatchEvent(new CustomEvent(event, { bubbles: true, composed: true, detail }));
  }

  private render(): void {
    if (!this.shadowRoot) return;

    const apps = this.applications;

    let listHtml = '';
    if (apps.length === 0 && !this.apiError) {
      listHtml = `<div class="empty-list">No applications yet. Click + to add one.</div>`;
    } else {
      listHtml = `<ul class="app-list">`;
      for (const app of apps) {
        const isExpanded = this.expandedId === app.id;
        const isLoading = this.loadingConfigs.has(app.id);
        const configs = this.configurationsCache.get(app.id) ?? [];

        let configSection = '';
        if (isExpanded) {
          let configItems = '';
          if (isLoading) {
            configItems = `<div class="loading">Loading…</div>`;
          } else {
            for (const cfg of configs) {
              const configStr = JSON.stringify(cfg.config);
              configItems += `
                <li class="config-item">
                  <button class="icon-btn edit-config" data-config-id="${cfg.id}" data-app-id="${app.id}" title="Edit configuration">✎</button>
                  <span class="config-label">${this.escHtml(cfg.name)}: ${this.escHtml(configStr)}</span>
                </li>`;
            }
          }

          const emptyNote = !isLoading && configs.length === 0
            ? `<span>No configurations</span>`
            : '';

          configSection = `
            <div class="config-section">
              <div class="config-toolbar">
                <button class="icon-btn add-config" data-app-id="${app.id}" title="Add configuration">＋</button>
                ${emptyNote}
              </div>
              ${isLoading ? `<div class="loading">Loading…</div>` : `<ul class="config-list">${configItems}</ul>`}
            </div>`;
        }

        listHtml += `
          <li class="app-item">
            <div class="app-row">
              <button class="icon-btn edit-app" data-app-id="${app.id}" title="Edit application">✎</button>
              <button class="app-name-btn" data-app-id="${app.id}">
                <span class="chevron ${isExpanded ? 'expanded' : ''}">▶</span>
                ${this.escHtml(app.name)}
              </button>
            </div>
            ${configSection}
          </li>`;
      }
      listHtml += `</ul>`;
    }

    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      ${this.apiError ? `<div class="error-banner">${this.escHtml(this.apiError)}</div>` : ''}
      <div class="toolbar">
        <h1>Applications</h1>
        <button class="icon-btn add-app" title="Add application">＋</button>
      </div>
      ${listHtml}
    `;

    // Bind events
    this.shadowRoot.querySelector('.add-app')?.addEventListener('click', () => {
      this.dispatch('navigate-to-app-form', {});
    });

    this.shadowRoot.querySelectorAll('.edit-app').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const appId = (e.currentTarget as HTMLElement).dataset['appId']!;
        this.dispatch('navigate-to-app-form', { applicationId: appId });
      });
    });

    this.shadowRoot.querySelectorAll('.app-name-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const appId = (e.currentTarget as HTMLElement).dataset['appId']!;
        void this.toggleExpand(appId);
      });
    });

    this.shadowRoot.querySelectorAll('.add-config').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const appId = (e.currentTarget as HTMLElement).dataset['appId']!;
        this.dispatch('navigate-to-config-form', { applicationId: appId });
      });
    });

    this.shadowRoot.querySelectorAll('.edit-config').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const el = e.currentTarget as HTMLElement;
        this.dispatch('navigate-to-config-form', {
          configurationId: el.dataset['configId']!,
          applicationId: el.dataset['appId']!,
        });
      });
    });
  }

  private escHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

customElements.define('app-list', AppList);
