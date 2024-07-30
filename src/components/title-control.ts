import { CSSResultGroup, html, LitElement, TemplateResult, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { createRef, Ref, ref } from 'lit/directives/ref.js';
import { TitleControlConfig } from '../config/types';
import titleStyle from '../scss/title-control.scss';
import { View } from '../view/view.js';

type PaperToast = HTMLElement & {
  opened: boolean;
};

export const getDefaultTitleConfigForView = (
  view?: Readonly<View> | null,
  baseConfig?: TitleControlConfig,
): TitleControlConfig | null => {
  if (!baseConfig && view?.isGrid()) {
    return { mode: 'none', duration_seconds: 2 };
  }
  return {
    mode: 'popup-bottom-right',
    duration_seconds: 2,
    ...baseConfig,
  };
};

@customElement('frigate-card-title-control')
export class FrigateCardTitleControl extends LitElement {
  @property({ attribute: false })
  public config?: TitleControlConfig;

  @property({ attribute: false })
  public text?: string;

  @property({ attribute: false })
  public fitInto?: HTMLElement;

  @property({ attribute: false })
  public logo?: string;

  protected _toastRef: Ref<PaperToast> = createRef();

  protected render(): TemplateResult {
    if (
      !this.text ||
      !this.config ||
      !this.config.mode ||
      this.config.duration_seconds === undefined ||
      this.config.mode === 'none' ||
      !this.fitInto
    ) {
      return html``;
    }

    const verticalAlign = this.config.mode.match(/-top-/) ? 'top' : 'bottom';
    const horizontalAlign = this.config.mode.match(/-left$/) ? 'left' : 'right';

    return html` <paper-toast
      ${ref(this._toastRef)}
      class="capsule"
      .duration=${this.config.duration_seconds * 1000}
      .verticalAlign=${verticalAlign}
      .horizontalAlign=${horizontalAlign}
      .text="${this.text}"
      .fitInto=${this.fitInto}
    >
      ${this.logo ? html`<img src=${this.logo} />` : ''}
    </paper-toast>`;
  }

  public isVisible(): boolean {
    return this._toastRef.value?.opened ?? false;
  }

  public hide(): void {
    if (this._toastRef.value) {
      // Set it to false first, to ensure the timer resets.
      this._toastRef.value.opened = false;
    }
  }

  public show(): void {
    if (this._toastRef.value) {
      // Set it to false first, to ensure the timer resets.
      this._toastRef.value.opened = false;
      this._toastRef.value.opened = true;
    }
  }

  static get styles(): CSSResultGroup {
    return unsafeCSS(titleStyle);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frigate-card-title-control': FrigateCardTitleControl;
  }
}
