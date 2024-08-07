import { Package } from "../package";
import { getDefaultHintOptions, HintOptions } from "./option";
import { fetchHintItems, HintItem } from "./hintItem";
import { setOption, setOptions } from "../../option";
import isFunction from "../../util/isFunction";
import debounce from "../../util/debounce";
import { reAlignHints } from "./position";
import DOMEvent from "../../util/DOMEvent";
import { getContainerElement } from "../../util/containerElement";
import { renderHints } from "./render";
import { hideHint, hideHints } from "./hide";
import { showHint, showHints } from "./show";
import { removeHint, removeHints } from "./remove";
import { showHintDialog } from "./tooltip";

type hintsAddedCallback = (this: Hint) => void | Promise<void>;
type hintClickCallback = (
  this: Hint,
  hintElement: HTMLElement,
  item: HintItem,
  stepId: number
) => void | Promise<void>;
type hintCloseCallback = (this: Hint, stepId: number) => void | Promise<void>;

export class Hint implements Package<HintOptions> {
  private _hints: HintItem[] = [];
  private readonly _targetElement: HTMLElement;
  private _options: HintOptions;

  private readonly callbacks: {
    hintsAdded?: hintsAddedCallback;
    hintClick?: hintClickCallback;
    hintClose?: hintCloseCallback;
  } = {};

  // Event handlers
  private _hintsAutoRefreshFunction?: () => void;

  /**
   * Create a new Hint instance
   * @param elementOrSelector Optional target element or CSS query to start the Hint on
   * @param options Optional Hint options
   */
  public constructor(
    elementOrSelector?: string | HTMLElement,
    options?: Partial<HintOptions>
  ) {
    this._targetElement = getContainerElement(elementOrSelector);
    this._options = options
      ? setOptions(this._options, options)
      : getDefaultHintOptions();
  }

  /**
   * Get the callback function for the provided callback name
   * @param callbackName The name of the callback
   */
  callback<K extends keyof typeof this.callbacks>(
    callbackName: K
  ): (typeof this.callbacks)[K] | undefined {
    const callback = this.callbacks[callbackName];
    if (isFunction(callback)) {
      return callback;
    }
    return undefined;
  }

  /**
   * Get the target element for the Hint
   */
  getTargetElement(): HTMLElement {
    return this._targetElement;
  }

  /**
   * Get the Hint items
   */
  getHints(): HintItem[] {
    return this._hints;
  }

  /**
   * Get the Hint item for the provided step ID
   * @param stepId The step ID
   */
  getHint(stepId: number): HintItem | undefined {
    return this._hints[stepId];
  }

  /**
   * Set the Hint items
   * @param hints The Hint items
   */
  setHints(hints: HintItem[]): this {
    this._hints = hints;
    return this;
  }

  /**
   * Add a Hint item
   * @param hint The Hint item
   */
  addHint(hint: HintItem): this {
    this._hints.push(hint);
    return this;
  }

  /**
   * Render hints on the page
   */
  async render(): Promise<this> {
    if (!this.isActive()) {
      return this;
    }

    fetchHintItems(this);
    await renderHints(this);
    return this;
  }

  /**
   * @deprecated renderHints() is deprecated, please use render() instead
   */
  async addHints() {
    return this.render();
  }

  /**
   * Hide a specific hint on the page
   * @param stepId The hint step ID
   */
  async hideHint(stepId: number) {
    await hideHint(this, stepId);
    return this;
  }

  /**
   * Hide all hints on the page
   */
  async hideHints() {
    await hideHints(this);
    return this;
  }

  /**
   * Show a specific hint on the page
   * @param stepId The hint step ID
   */
  showHint(stepId: number) {
    showHint(stepId);
    return this;
  }

  /**
   * Show all hints on the page
   */
  async showHints() {
    await showHints(this);
    return this;
  }

  /**
   * Destroys and removes all hint elements on the page
   * Useful when you want to destroy the elements and add them again (e.g. a modal or popup)
   */
  destroy() {
    removeHints(this);
    return this;
  }

  /**
   * @deprecated removeHints() is deprecated, please use destroy() instead
   */
  removeHints() {
    this.destroy();
    return this;
  }

  /**
   * Remove one single hint element from the page
   * Useful when you want to destroy the element and add them again (e.g. a modal or popup)
   * Use removeHints if you want to remove all elements.
   *
   * @param stepId The hint step ID
   */
  removeHint(stepId: number) {
    removeHint(stepId);
    return this;
  }

  /**
   * Show hint dialog for a specific hint
   * @param stepId The hint step ID
   */
  async showHintDialog(stepId: number) {
    await showHintDialog(this, stepId);
    return this;
  }

  /**
   * Enable hint auto refresh on page scroll and resize for hints
   */
  enableHintAutoRefresh(): this {
    const hintAutoRefreshInterval = this.getOption("hintAutoRefreshInterval");
    if (hintAutoRefreshInterval >= 0) {
      this._hintsAutoRefreshFunction = debounce(
        () => reAlignHints(this),
        hintAutoRefreshInterval
      );

      DOMEvent.on(window, "scroll", this._hintsAutoRefreshFunction, true);
      DOMEvent.on(window, "resize", this._hintsAutoRefreshFunction, true);
    }

    return this;
  }

  /**
   * Disable hint auto refresh on page scroll and resize for hints
   */
  disableHintAutoRefresh(): this {
    if (this._hintsAutoRefreshFunction) {
      DOMEvent.off(window, "scroll", this._hintsAutoRefreshFunction, true);
      DOMEvent.on(window, "resize", this._hintsAutoRefreshFunction, true);

      this._hintsAutoRefreshFunction = undefined;
    }

    return this;
  }

  /**
   * Get specific Hint option
   * @param key The option key
   */
  getOption<K extends keyof HintOptions>(key: K): HintOptions[K] {
    return this._options[key];
  }

  /**
   * Set Hint options
   * @param partialOptions Hint options
   */
  setOptions(partialOptions: Partial<HintOptions>): this {
    this._options = setOptions(this._options, partialOptions);
    return this;
  }

  /**
   * Set specific Hint option
   * @param key Option key
   * @param value Option value
   */
  setOption<K extends keyof HintOptions>(key: K, value: HintOptions[K]): this {
    this._options = setOption(this._options, key, value);
    return this;
  }

  /**
   * Clone the Hint instance
   */
  clone(): ThisType<this> {
    return new Hint(this._targetElement, this._options);
  }

  /**
   * Returns true if the Hint is active
   */
  isActive(): boolean {
    return this.getOption("isActive");
  }

  onHintsAdded(providedCallback: hintsAddedCallback) {
    if (!isFunction(providedCallback)) {
      throw new Error("Provided callback for onhintsadded was not a function.");
    }

    this.callbacks.hintsAdded = providedCallback;
    return this;
  }

  /**
   * @deprecated onhintsadded is deprecated, please use onHintsAdded instead
   * @param providedCallback callback function
   */
  onhintsadded(providedCallback: hintsAddedCallback) {
    this.onHintsAdded(providedCallback);
  }

  /**
   * Callback for when hint items are clicked
   * @param providedCallback callback function
   */
  onHintClick(providedCallback: hintClickCallback) {
    if (!isFunction(providedCallback)) {
      throw new Error("Provided callback for onhintclick was not a function.");
    }

    this.callbacks.hintClick = providedCallback;
    return this;
  }

  /**
   * @deprecated onhintclick is deprecated, please use onHintClick instead
   * @param providedCallback
   */
  onhintclick(providedCallback: hintClickCallback) {
    this.onHintClick(providedCallback);
  }

  /**
   * Callback for when hint items are closed
   * @param providedCallback callback function
   */
  onHintClose(providedCallback: hintCloseCallback) {
    if (isFunction(providedCallback)) {
      this.callbacks.hintClose = providedCallback;
    } else {
      throw new Error("Provided callback for onhintclose was not a function.");
    }
    return this;
  }

  /**
   * @deprecated onhintclose is deprecated, please use onHintClose instead
   * @param providedCallback
   */
  onhintclose(providedCallback: hintCloseCallback) {
    this.onHintClose(providedCallback);
  }
}
