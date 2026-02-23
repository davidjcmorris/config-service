const STYLES = `
  :host {
    display: contents;
  }

  dialog {
    border: none;
    border-radius: var(--radius, 6px);
    padding: 0;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 400px;
    width: 90vw;
  }

  dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
  }

  .dialog-inner {
    padding: 24px;
  }

  .message {
    margin: 0 0 20px;
    font-size: 1rem;
    line-height: 1.5;
    color: var(--color-text, #111827);
  }

  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  button {
    padding: 8px 16px;
    border-radius: var(--radius, 6px);
    border: 1px solid transparent;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .confirm-btn {
    background: var(--color-danger, #dc2626);
    color: #fff;
    border-color: var(--color-danger, #dc2626);
  }

  .confirm-btn:hover {
    background: var(--color-danger-hover, #b91c1c);
    border-color: var(--color-danger-hover, #b91c1c);
  }

  .cancel-btn {
    background: #fff;
    color: var(--color-text, #111827);
    border-color: var(--color-border, #e5e7eb);
  }

  .cancel-btn:hover {
    background: var(--color-bg, #f9fafb);
  }
`;

export class ConfirmDialog extends HTMLElement {
  private dialog!: HTMLDialogElement;
  private messageEl!: HTMLParagraphElement;
  private resolve: ((value: boolean) => void) | null = null;

  connectedCallback(): void {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${STYLES}</style>
      <dialog>
        <div class="dialog-inner">
          <p class="message"></p>
          <div class="actions">
            <button class="cancel-btn" type="button">Cancel</button>
            <button class="confirm-btn" type="button">Delete</button>
          </div>
        </div>
      </dialog>
    `;

    this.dialog = shadow.querySelector('dialog')!;
    this.messageEl = shadow.querySelector('.message')!;

    shadow.querySelector('.confirm-btn')!.addEventListener('click', () => {
      this.dialog.close();
      this.resolve?.(true);
      this.resolve = null;
    });

    shadow.querySelector('.cancel-btn')!.addEventListener('click', () => {
      this.dialog.close();
      this.resolve?.(false);
      this.resolve = null;
    });

    this.dialog.addEventListener('cancel', () => {
      this.resolve?.(false);
      this.resolve = null;
    });
  }

  open(message: string): Promise<boolean> {
    this.messageEl.textContent = message;
    this.dialog.showModal();
    return new Promise<boolean>((resolve) => {
      this.resolve = resolve;
    });
  }
}

customElements.define('confirm-dialog', ConfirmDialog);
