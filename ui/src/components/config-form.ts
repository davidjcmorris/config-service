import {
  createConfiguration,
  deleteConfiguration,
  getConfiguration,
  updateConfiguration,
} from '../api/configurations.js';
import type { Configuration } from '../types/models.js';
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

  textarea.config-textarea {
    font-family: ui-monospace, monospace;
    font-size: 0.8rem;
    min-height: 160px;
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

  button[type="submit"] {
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

  button[type="submit"]:hover {
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
`;

export class ConfigForm extends HTMLElement {
  static observedAttributes = ['configuration-id', 'application-id'];

  private configuration: Configuration | null = null;
  private nameError = '';
  private configError = '';
  private apiError = '';
  private saving = false;

  get configurationId(): string | null {
    return this.getAttribute('configuration-id');
  }

  get applicationId(): string | null {
    return this.getAttribute('application-id');
  }

  connectedCallback(): void {
    this.attachShadow({ mode: 'open' });
    this.render();
    if (this.configurationId) {
      void this.loadData();
    }
  }

  attributeChangedCallback(): void {
    if (this.shadowRoot) {
      this.render();
      if (this.configurationId) {
        void this.loadData();
      }
    }
  }

  private async loadData(): Promise<void> {
    const id = this.configurationId;
    if (!id) return;
    try {
      this.configuration = await getConfiguration(id);
    } catch (err) {
      this.apiError = err instanceof Error ? err.message : 'Failed to load configuration';
    }
    this.render();
  }

  private dispatch(event: string, detail: Record<string, unknown> = {}): void {
    this.dispatchEvent(new CustomEvent(event, { bubbles: true, composed: true, detail }));
  }

  private navigateBack(): void {
    this.dispatch('navigate-to-app-form', { applicationId: this.applicationId! });
  }

  private async handleSubmit(name: string, configText: string, comments: string): Promise<void> {
    this.nameError = '';
    this.configError = '';
    this.apiError = '';

    let valid = true;

    if (!name.trim()) {
      this.nameError = 'Name is required';
      valid = false;
    }

    let parsedConfig: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(configText.trim() || '{}');
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        this.configError = 'Config must be a JSON object (e.g. {"key": "value"})';
        valid = false;
      } else {
        parsedConfig = parsed as Record<string, unknown>;
      }
    } catch {
      this.configError = 'Invalid JSON — please check the syntax';
      valid = false;
    }

    if (!valid) {
      this.render();
      return;
    }

    this.saving = true;
    this.render();

    try {
      if (this.configurationId) {
        await updateConfiguration(this.configurationId, {
          name: name.trim(),
          comments: comments.trim() || null,
          config: parsedConfig,
        });
      } else {
        await createConfiguration({
          application_id: this.applicationId!,
          name: name.trim(),
          comments: comments.trim() || null,
          config: parsedConfig,
        });
      }
      this.navigateBack();
    } catch (err) {
      this.apiError = err instanceof Error ? err.message : 'Save failed';
      this.saving = false;
      this.render();
    }
  }

  private async handleDelete(): Promise<void> {
    const dialog = this.shadowRoot?.querySelector('confirm-dialog') as ConfirmDialog | null;
    if (!dialog) return;

    const confirmed = await dialog.open(
      `Are you sure you want to delete "${this.configuration?.name ?? 'this configuration'}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await deleteConfiguration(this.configurationId!);
      this.navigateBack();
    } catch (err) {
      this.apiError = err instanceof Error ? err.message : 'Delete failed';
      this.render();
    }
  }

  private render(): void {
    if (!this.shadowRoot) return;

    const isEdit = !!this.configurationId;
    const name = this.configuration?.name ?? '';
    const comments = this.configuration?.comments ?? '';
    const configText = this.configuration
      ? JSON.stringify(this.configuration.config, null, 2)
      : '{}';

    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <confirm-dialog></confirm-dialog>

      <div class="header">
        <button class="back-btn" title="Back">←</button>
        <h2>${isEdit ? 'Edit Configuration' : 'New Configuration'}</h2>
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
            <label for="config">Config (JSON) *</label>
            <textarea
              id="config"
              name="config"
              class="config-textarea${this.configError ? ' invalid' : ''}"
              rows="8"
              spellcheck="false"
            >${this.escHtml(configText)}</textarea>
            <span class="field-error" aria-live="polite">${this.escHtml(this.configError)}</span>
          </div>

          <div class="field">
            <label for="comments">Comments</label>
            <textarea id="comments" name="comments">${this.escHtml(comments)}</textarea>
          </div>

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
      this.navigateBack();
    });

    this.shadowRoot.querySelector('.cancel-btn')?.addEventListener('click', () => {
      this.navigateBack();
    });

    this.shadowRoot.querySelector('form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const nameVal = (form.elements.namedItem('name') as HTMLInputElement).value;
      const configVal = (form.elements.namedItem('config') as HTMLTextAreaElement).value;
      const commentsVal = (form.elements.namedItem('comments') as HTMLTextAreaElement).value;
      void this.handleSubmit(nameVal, configVal, commentsVal);
    });

    this.shadowRoot.querySelector('.delete-btn')?.addEventListener('click', () => {
      void this.handleDelete();
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

customElements.define('config-form', ConfigForm);
