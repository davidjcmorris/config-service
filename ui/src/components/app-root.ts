type View =
  | { name: 'list' }
  | { name: 'app-form'; applicationId?: string }
  | { name: 'config-form'; applicationId: string; configurationId?: string };

const STYLES = `
  :host {
    display: block;
  }
`;

export class AppRoot extends HTMLElement {
  private view: View = { name: 'list' };

  connectedCallback(): void {
    this.attachShadow({ mode: 'open' });

    // Listen for navigation events bubbling up from child components
    this.addEventListener('navigate-to-list', () => {
      this.view = { name: 'list' };
      this.render();
    });

    this.addEventListener('navigate-to-app-form', (e: Event) => {
      const detail = (e as CustomEvent<{ applicationId?: string }>).detail;
      this.view = { name: 'app-form', applicationId: detail.applicationId };
      this.render();
    });

    this.addEventListener('navigate-to-config-form', (e: Event) => {
      const detail = (e as CustomEvent<{
        applicationId: string;
        configurationId?: string;
      }>).detail;
      this.view = {
        name: 'config-form',
        applicationId: detail.applicationId,
        configurationId: detail.configurationId,
      };
      this.render();
    });

    this.render();
  }

  private render(): void {
    if (!this.shadowRoot) return;

    let content = '';
    const v = this.view;

    if (v.name === 'list') {
      content = `<app-list></app-list>`;
    } else if (v.name === 'app-form') {
      const idAttr = v.applicationId ? ` application-id="${v.applicationId}"` : '';
      content = `<app-form${idAttr}></app-form>`;
    } else if (v.name === 'config-form') {
      const appAttr = ` application-id="${v.applicationId}"`;
      const cfgAttr = v.configurationId ? ` configuration-id="${v.configurationId}"` : '';
      content = `<config-form${appAttr}${cfgAttr}></config-form>`;
    }

    this.shadowRoot.innerHTML = `<style>${STYLES}</style>${content}`;
  }
}

customElements.define('app-root', AppRoot);
