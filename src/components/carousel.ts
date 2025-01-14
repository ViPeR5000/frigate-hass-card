import EmblaCarousel, { EmblaCarouselType, EmblaOptionsType } from 'embla-carousel';
import { EmblaNodesType } from 'embla-carousel/components';
import {
  CreatePluginType,
  EmblaPluginsType,
  LoosePluginType,
} from 'embla-carousel/components/Plugins';
import {
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  unsafeCSS,
} from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { createRef, ref, Ref } from 'lit/directives/ref.js';
import { throttle } from 'lodash-es';
import carouselStyle from '../scss/carousel.scss';
import { TransitionEffect } from '../types';
import { dispatchFrigateCardEvent } from '../utils/basic.js';

export interface CarouselSelect {
  index: number;
  element: HTMLElement;
}

export type EmblaCarouselPlugins = CreatePluginType<
  LoosePluginType,
  Record<string, unknown>
>[];

@customElement('frigate-card-carousel')
export class FrigateCardCarousel extends LitElement {
  @property({ attribute: true, reflect: true })
  public direction: 'vertical' | 'horizontal' = 'horizontal';

  @property({ attribute: false })
  public carouselOptions?: EmblaOptionsType;

  @property({ attribute: false })
  public carouselPlugins?: EmblaCarouselPlugins;

  @property({ attribute: true })
  public transitionEffect?: TransitionEffect;

  // An override to the startIndex, used to preserve the current carousel
  // position after the carousel is destroyed (so it can be restored if
  // recreated).
  // See: https://github.com/dermotduffy/frigate-hass-card/issues/775
  protected _savedStartIndex: number | null = null;

  protected _refSlot: Ref<HTMLSlotElement> = createRef();

  protected _carousel?: EmblaCarouselType;

  // Whether the carousel is actively scrolling.
  protected _scrolling = false;

  // Whether to reinit the carousel when it settles.
  protected _reInitOnSettle = false;

  protected _carouselReInitInPlace = throttle(
    this._carouselReInitInPlaceInternal.bind(this),
    500,
    { trailing: true },
  );

  connectedCallback(): void {
    super.connectedCallback();

    // Guarantee a re-render if the component is reconnected. See note in
    // disconnectedCallback().
    this.requestUpdate();
  }

  /**
   * Component disconnected callback.
   */
  disconnectedCallback(): void {
    // Destroy the carousel when the component is disconnected, which forces the
    // plugins (which may have registered event handlers) to also be destroyed.
    // The carousel will automatically reconstruct if the component is re-rendered.
    this._destroyCarousel({ savePosition: true });
    super.disconnectedCallback();
  }

  /**
   * Destroy the carousel if certain properties change.
   * @param changedProps The changed properties
   */
  protected willUpdate(changedProps: PropertyValues): void {
    const destroyProperties = [
      'direction',
      'carouselOptions',
      'carouselPlugins',
    ] as const;
    if (destroyProperties.some((prop) => changedProps.has(prop))) {
      this._destroyCarousel({ savePosition: true });
    }
  }

  /**
   * Scroll to a particular slide.
   * @param index Slide number.
   */
  public carouselScrollTo(index: number): void {
    this._carousel?.scrollTo(index, this.transitionEffect === 'none');
  }

  /**
   * Scroll to the previous slide.
   */
  public carouselScrollPrevious(): void {
    this._carousel?.scrollPrev(this.transitionEffect === 'none');
  }

  /**
   * Scroll to the next slide.
   */
  public carouselScrollNext(): void {
    this._carousel?.scrollNext(this.transitionEffect === 'none');
  }

  /**
   * Get the selected slide.
   * @returns A CarouselSelect object (index & element).
   */
  public getCarouselSelected(): CarouselSelect | null {
    const index = this._carousel?.selectedScrollSnap();
    const element =
      index !== undefined ? this._carousel?.slideNodes()[index] ?? null : null;
    if (index !== undefined && element) {
      return {
        index: index,
        element: element,
      };
    }
    return null;
  }

  /**
   * Get the carousel.
   */
  public carouselClickAllowed(): boolean {
    return this._carousel?.clickAllowed() ?? true;
  }

  /**
   * Get the carousel.
   */
  public carousel(): EmblaCarouselType | null {
    return this._carousel ?? null;
  }

  /**
   * ReInit the carousel.
   */
  protected _carouselReInit(options?: EmblaOptionsType): void {
    // Allow the browser a moment to paint components that are inflight, to
    // ensure accurate measurements are taken during the carousel
    // reinitialization.
    window.requestAnimationFrame(() => {
      this._carousel?.reInit({ ...options });
    });
  }
  /**
   * ReInit the carousel but stay on the current slide.
   */
  protected _carouselReInitInPlaceInternal(): void {
    const selected = this.getCarouselSelected();

    this._carouselReInit({
      ...(selected && { startIndex: selected.index }),
    });
  }

  /**
   * ReInit the carousel when it is safe to do so without disturbing the
   * appearance (i.e. cutting off a scroll in progress).
   */
  public carouselReInitWhenSafe(): void {
    if (this._scrolling) {
      this._reInitOnSettle = true;
    } else {
      this._carouselReInitInPlace();
    }
  }

  /**
   * Get the live carousel plugins.
   */
  public getCarouselPlugins(): EmblaPluginsType | null {
    return this._carousel?.plugins() ?? null;
  }

  /**
   * The updated lifecycle callback for this element.
   * @param changedProperties The properties that were changed in this render.
   */
  updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (!this._carousel) {
      this._initCarousel();
    }
  }

  /**
   * Destroy the carousel.
   * @param options If `savePosition` is set the existing carousel position
   * will be saved so it can be restored if the carousel is recreated.
   */
  protected _destroyCarousel(options?: { savePosition: boolean }): void {
    this._savedStartIndex =
      (options?.savePosition ? this._carousel?.selectedScrollSnap() : null) ?? null;
    if (this._carousel) {
      this._carousel.destroy();
    }
    this._carousel = undefined;
  }

  /**
   * Initialize the carousel.
   */
  protected _initCarousel(): void {
    const carouselNode = this.renderRoot.querySelector(
      '.embla__viewport',
    ) as HTMLElement;

    const nodes: EmblaNodesType = {
      root: carouselNode,
      // As the slides are slotted, need to explicitly pull them out and pass
      // them to Embla.
      slides: this._refSlot.value?.assignedElements({ flatten: true }) as HTMLElement[],
    };

    if (carouselNode && nodes.slides) {
      this._carousel = EmblaCarousel(
        nodes,
        {
          axis: this.direction == 'horizontal' ? 'x' : 'y',
          speed: 20,
          ...this.carouselOptions,
          ...(this._savedStartIndex && { startIndex: this._savedStartIndex }),
        },
        this.carouselPlugins,
      );
      this._carousel.on('init', () => dispatchFrigateCardEvent(this, 'carousel:init'));
      this._carousel.on('select', () => {
        const selected = this.getCarouselSelected();
        if (selected) {
          dispatchFrigateCardEvent<CarouselSelect>(this, 'carousel:select', selected);
        }

        // Make sure every select causes a refresh to allow for re-paint of the
        // next/previous controls.
        this.requestUpdate();
      });

      this._carousel.on('scroll', () => {
        this._scrolling = true;
      });
      this._carousel.on('settle', () => {
        // Reinitialize the carousel if a request to reinitialize was made
        // during scrolling (instead the request is handled after the scrolling
        // has settled).
        this._scrolling = false;
        if (this._reInitOnSettle) {
          this._reInitOnSettle = false;
          this._carouselReInitInPlace();
        }
      });
      this._carousel.on('settle', () => {
        const selected = this.getCarouselSelected();
        if (selected) {
          dispatchFrigateCardEvent<CarouselSelect>(this, 'carousel:settle', selected);
        }
      });
    }
  }

  /**
   * Called when the slotted children in the carousel change.
   */
  protected _slotChanged(): void {
    // Cannot just re-init, because the slide elements themselves may have
    // changed, and only a carousel init can pass in new (slotted) children. If
    // the slides themselves change, any position the user has set is assumed to
    // be abandoned and so the startIndex is reset to whatever the carousel was
    // originally configured with.
    this._destroyCarousel({ savePosition: false });
    this.requestUpdate();
  }

  protected render(): TemplateResult | void {
    const slides = this._refSlot.value?.assignedElements({ flatten: true }) || [];
    const currentSlide = this._carousel?.selectedScrollSnap() ?? 0;
    const showPrevious = this.carouselOptions?.loop || currentSlide > 0;
    const showNext = this.carouselOptions?.loop || currentSlide + 1 < slides.length;

    return html` <div class="embla">
      ${showPrevious ? html`<slot name="previous"></slot>` : ``}
      <div class="embla__viewport">
        <div class="embla__container">
          <slot ${ref(this._refSlot)} @slotchange=${this._slotChanged.bind(this)}></slot>
        </div>
      </div>
      ${showNext ? html`<slot name="next"></slot>` : ``}
    </div>`;
  }

  /**
   * Get element styles.
   */
  static get styles(): CSSResultGroup {
    return unsafeCSS(carouselStyle);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frigate-card-carousel': FrigateCardCarousel;
  }
}
