import { CSSResultGroup, LitElement, TemplateResult, html, unsafeCSS } from 'lit';
import { createRef, ref, Ref } from 'lit/directives/ref.js';
import { customElement } from 'lit/decorators.js';

import { FrigateCardDrawer } from './drawer.js';

import './drawer.js';

import surroundStyle from '../scss/surround.scss';

interface FrigateCardDrawerOpen {
  drawer: 'left' | 'right';
}

@customElement('frigate-card-surround')
export class FrigateCardSurround extends LitElement {
  protected _refDrawerLeft: Ref<FrigateCardDrawer> = createRef();
  protected _refDrawerRight: Ref<FrigateCardDrawer> = createRef();
  protected _boundDrawerHandler = this._drawerHandler.bind(this);

  /**
   * Component connected callback.
   */
  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('frigate-card:drawer:open', this._boundDrawerHandler);
    this.addEventListener('frigate-card:drawer:close', this._boundDrawerHandler);
  }

  /**
   * Component disconnected callback.
   */
  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('frigate-card:drawer:open', this._boundDrawerHandler);
    this.removeEventListener('frigate-card:drawer:close', this._boundDrawerHandler);
  }

  protected _drawerHandler(ev: Event) {
    const drawer = (ev as CustomEvent<FrigateCardDrawerOpen>).detail.drawer;
    const open = ev.type.endsWith(':open');
    if (drawer === 'left' && this._refDrawerLeft.value) {
      this._refDrawerLeft.value.open = open;
    } else if (drawer === 'right' && this._refDrawerRight.value) {
      this._refDrawerRight.value.open = open;
    }
  }

  /**
   * Master render method.
   * @returns A rendered template.
   */
  protected render(): TemplateResult | void {
    return html` <slot name="above"></slot>
      <slot></slot>
      <frigate-card-drawer ${ref(this._refDrawerLeft)} location="left">
        <slot name="left"></slot>
      </frigate-card-drawer>
      <frigate-card-drawer ${ref(this._refDrawerRight)} location="right">
        <slot name="right"></slot>
      </frigate-card-drawer>
      <slot name="below"></slot>`;
  }

  /**
   * Return compiled CSS styles.
   */
  static get styles(): CSSResultGroup {
    return unsafeCSS(surroundStyle);
  }
}

declare global {
	interface HTMLElementTagNameMap {
		"frigate-card-surround": FrigateCardSurround
	}
}
