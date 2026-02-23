import {
  createApplication,
  deleteApplication,
  getApplication,
  updateApplication,
} from '../api/applications.js';
import { friendlyErrorMessage } from '../api/client.js';
import { listConfigurations } from '../api/configurations.js';
import type { Application, Configuration } from '../types/models.js';
import type { ConfirmDialog } from './confirm-dialog.js';

const STYLES = `
  :host {
    display: block;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
  }

  .back-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 1.2rem;
    color: var(--color-text-muted, #6b7280);
    padding: 4px;
    border-radius: var(--radius, 6px);
    display: inline-flex;
    align-items: center;
  }

  .back-btn:hover {
    background: var(--color-border, #e5e7eb);
    color: var(--color-text, #111827);
  }

  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .card {
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: var(--radius, 6px);
    padding: 24px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }

  .field {
    margin-bottom: 16px;
  }

  label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 4px;
    color: var(--color-text, #111827);
  }

  input, textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: var(--radius, 6px);
    font-size: 0.875rem;
    font-family: inherit;
    color: var(--color-text, #111827);
    background: var(--color-surface, #fff);
    transition: border-color 0.15s;
    box-sizing: border-box;
  }

  input:focus, textarea:focus {
    outline: none;
    border-color: var(--color-primary, #2563eb);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  input.invalid, textarea.invalid {
    border-color: var(--color-danger, #dc2626);
  }

  textarea {
    resize: vertical;
    min-height: 80px;
  }

  .field-error {
    display: block;
    font-size: 0.8rem;
    color: var(--color-danger, #dc2626);
    margin-top: 4px;
    min-height: 1.2em;
  }

  .api-error {
    padding: 10px 14px;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: var(--radius, 6px);
    color: #991b1b;
    font-size: 0.875rem;
    margin-bottom: 16px;
  }

  .api-error:empty {
    display: none;
  }

  .actions {
    display: flex;
    gap: 8px;
    margin-top: 20px;
    flex-wrap: wrap;
  }

  button[type="submit"], .save-btn {
    padding: 8px 20px;
    background: var(--color-primary, #2563eb);
    color: #fff;
    border: none;
    border-radius: var(--radius, 6px);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  button[type="submit"]:hover, .save-btn:hover {
    background: var(--color-primary-hover, #1d4ed8);
  }

  button[type="submit"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .cancel-btn {
    padding: 8px 20px;
    background: #fff;
    color: var(--color-text, #111827);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: var(--radius, 6px);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .cancel-btn:hover {
    background: var(--color-bg, #f9fafb);
  }

  .delete-btn {
    padding: 8px 20px;
    background: #fff;
    color: var(--color-danger, #dc2626);
    border: 1px solid var(--color-danger, #dc2626);
    border-radius: var(--radius, 6px);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    margin-left: auto;
    transition: background 0.15s;
  }

  .delete-btn:hover {
    background: #fef2f2;
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text, #111827);
    margin: 20px 0 8px;
    padding-top: 16px;
    border-top: 1px solid var(--color-border, #e5e7eb);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .add-config-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: transparent;
    color: var(--color-primary, #2563eb);
    border: 1px solid var(--color-primary, #2563eb);
    border-radius: var(--radius, 6px);
    font-size: 0.8rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .add-config-btn:hover {
    background: #eff6ff;
  }

  .config-list {
    list-style: none;
    margin: 0;
    padding: 0;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: var(--radius, 6px);
    overflow: hidden;
  }

  .config-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    font-size: 0.875rem;
    font-family: ui-monospace, monospace;
  }

  .config-item:last-child {
    border-bottom: none;
  }

  .config-item .edit-config-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    color: var(--color-text-muted, #6b7280);
    padding: 2px 4px;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .config-item .edit-config-btn:hover {
    background: var(--color-border, #e5e7eb);
    color: var(--color-text, #111827);
  }

  .empty-configs {
    padding: 12px;
    text-align: center;
    color: var(--color-text-muted, #6b7280);
    font-size: 0.875rem;
    font-style: italic;
  }

  .loading {
    padding: 12px;
    text-align: center;
    color: var(--color-text-muted, #6b7280);
    font-size: 0.875rem;
  }
`;

export class AppForm extends HTMLElement {
  static observedAttributes = ['application-id'];

  private application: Application | null = null;
  private configurations: Configuration[] = [];
  private nameError = '';
  private apiError = '';
  private saving = false;
  private loadingConfigs = false;

  // Draft values preserve what the user typed across re-renders
  private draftName: string | null = null;
  private draftComments: string | null = null;

  get applicationId(): string | null {
    return this.getAttribute('application-id');
  }

  connectedCallback(): void {
    this.attachShadow({ mode: 'open' });
    this.render();
    if (this.applicationId) {
      void this.loadData();
    }
  }

  attributeChangedCallback(): void {
    if (this.shadowRoot) {
      // Reset draft when navigating to a different application
      this.draftName = null;
      this.draftComments = null;
      this.render();
      if (this.applicationId) {
        void this.loadData();
      }
    }
  }

  private async loadData(): Promise<void> {
    const id = this.applicationId;
    if (!id) return;
    try {
      this.application = await getApplication(id);
      this.loadingConfigs = true;
      this.render();
      this.configurations = await listConfigurations(id);
      this.loadingConfigs = false;
    } catch (err) {
      this.apiError = friendlyErrorMessage(err);
      this.loadingConfigs = false;
    }
    this.render();
  }

  private dispatch(event: string, detail: Record<string, unknown> = {}): void {
    this.dispatchEvent(new CustomEvent(event, { bubbles: true, composed: true, detail }));
  }

  private async handleSubmit(name: string, comments: string): Promise<void> {
    // Capture draft values so they survive re-render
    this.draftName = name;
    this.draftComments = comments;
    this.nameError = '';
    this.apiError = '';

    if (!name.trim()) {
      this.nameError = 'Name is required';
      this.render();
      return;
    }

    this.saving = true;
    this.render();

    try {
      if (this.applicationId) {
        await updateApplication(this.applicationId, {
          name: name.trim(),
          comments: comments.trim() || null,
        });
      } else {
        await createApplication({
          name: name.trim(),
          comments: comments.trim() || null,
        });
      }
      // Clear drafts on success before navigating away
      this.draftName = null;
      this.draftComments = null;
      this.dispatch('navigate-to-list');
    } catch (err) {
      this.apiError = friendlyErrorMessage(err);
      this.saving = false;
      this.render();
    }
  }

  private async handleDelete(): Promise<void> {
    const dialog = this.shadowRoot?.querySelector('confirm-dialog') as ConfirmDialog | null;
    if (!dialog) return;

    const confirmed = await dialog.open(
      `Are you sure you want to delete "${this.application?.name ?? 'this application'}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await deleteApplication(this.applicationId!);
      this.dispatch('navigate-to-list');
    } catch (err) {
      this.apiError = friendlyErrorMessage(err);
      this.render();
    }
  }

  private render(): void {
    if (!this.shadowRoot) return;

    const isEdit = !!this.applicationId;
    // Use draft values if present (after a failed submit), otherwise fall back to loaded data
    const name = this.draftName ?? this.application?.name ?? '';
    const comments = this.draftComments ?? this.application?.comments ?? '';

    let configsHtml = '';
    if (isEdit) {
      if (this.loadingConfigs) {
        configsHtml = `<div class="loading">Loading configurations…</div>`;
      } else if (this.configurations.length === 0) {
        configsHtml = `<div class="empty-configs">No configurations yet.</div>`;
      } else {
        const items = this.configurations
          .map(
            (cfg) => `
          <li class="config-item">
            <button class="edit-config-btn" data-config-id="${cfg.id}" title="Edit">✎</button>
            <span>${this.escHtml(cfg.name)}: ${this.escHtml(JSON.stringify(cfg.config))}</span>
          </li>`,
          )
          .join('');
        configsHtml = `<ul class="config-list">${items}</ul>`;
      }
    }

    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <confirm-dialog></confirm-dialog>

      <div class="header">
        <button class="back-btn" title="Back">←</button>
        <h2>${isEdit ? 'Edit Application' : 'New Application'}</h2>
      </div>

      <div class="card">
        <div class="api-error" role="alert">${this.escHtml(this.apiError)}</div>

        <form>
          <div class="field">
            <label for="name">Name *</label>
            <input
              id="name"
              name="name"
              type="text"
              value="${this.escHtml(name)}"
              class="${this.nameError ? 'invalid' : ''}"
              autocomplete="off"
            />
            <span class="field-error" aria-live="polite">${this.escHtml(this.nameError)}</span>
          </div>

          <div class="field">
            <label for="comments">Comments</label>
            <textarea id="comments" name="comments">${this.escHtml(comments)}</textarea>
          </div>

          ${
            isEdit
              ? `
            <div class="section-title">
              Configurations
              <button type="button" class="add-config-btn">＋ Add configuration</button>
            </div>
            ${configsHtml}
          `
              : ''
          }

          <div class="actions">
            <button type="submit" ${this.saving ? 'disabled' : ''}>${this.saving ? 'Saving…' : 'Save'}</button>
            <button type="button" class="cancel-btn">Cancel</button>
            ${isEdit ? `<button type="button" class="delete-btn">Delete</button>` : ''}
          </div>
        </form>
      </div>
    `;

    // Bind events
    this.shadowRoot.querySelector('.back-btn')?.addEventListener('click', () => {
      this.dispatch('navigate-to-list');
    });

    this.shadowRoot.querySelector('.cancel-btn')?.addEventListener('click', () => {
      this.dispatch('navigate-to-list');
    });

    this.shadowRoot.querySelector('form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const nameVal = (form.elements.namedItem('name') as HTMLInputElement).value;
      const commentsVal = (form.elements.namedItem('comments') as HTMLTextAreaElement).value;
      void this.handleSubmit(nameVal, commentsVal);
    });

    this.shadowRoot.querySelector('.delete-btn')?.addEventListener('click', () => {
      void this.handleDelete();
    });

    this.shadowRoot.querySelector('.add-config-btn')?.addEventListener('click', () => {
      this.dispatch('navigate-to-config-form', { applicationId: this.applicationId! });
    });

    this.shadowRoot.querySelectorAll('.edit-config-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const configId = (e.currentTarget as HTMLElement).dataset['configId']!;
        this.dispatch('navigate-to-config-form', {
          configurationId: configId,
          applicationId: this.applicationId!,
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

customElements.define('app-form', AppForm);
