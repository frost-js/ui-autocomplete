/** @import { NodeInput } from '@fr0st/query/src/helpers.js'; */
/** @import { Placement, Position } from '@fr0st/ui/src/js/popper/popper.js'; */

import $ from '@fr0st/query';
import { BaseComponent, generateId, Popper, waitForTransition } from '@fr0st/ui';
import { normalizeValue } from './helpers.js';

const window = $.getWindow();

/**
 * @typedef {object} AutocompleteLanguage
 * @property {string} [error='Error loading data.'] The message shown when asynchronous results fail to load.
 * @property {string} [loading='Loading..'] The message shown while asynchronous results are loading.
 */

/**
 * @typedef {object} AutocompleteRequestOptions
 * @property {number} offset The number of results already loaded.
 * @property {string} [term] The current search term. This is omitted when the term is empty.
 * @property {AbortSignal} signal A signal that is aborted when the request becomes stale.
 */

/**
 * @typedef {object} AutocompleteResults
 * @property {string[]} results The result values for the requested page.
 * @property {boolean} [showMore=false] Whether another page can be requested.
 */

/**
 * @callback AutocompleteGetResultsCallback
 * @param {AutocompleteRequestOptions} options The request options.
 * @returns {AutocompleteResults|PromiseLike<AutocompleteResults>} The results or a promise-like result.
 */

/**
 * @callback AutocompleteMatchCallback
 * @param {string} value The result value to test.
 * @param {string} term The current search term.
 * @returns {boolean} Whether the result matches the term.
 */

/**
 * @callback AutocompleteRenderCallback
 * @param {string} value The result value to render.
 * @param {HTMLLIElement} item The option element that will contain the rendered result.
 * @returns {string|Node|null|undefined} The rendered HTML string or DOM node.
 * @description String output is passed through `sanitize` before being interpreted as HTML. DOM nodes are
 * appended as-is, so callers must only return nodes containing trusted content.
 */

/**
 * @callback AutocompleteSanitizeCallback
 * @param {string} input The untrusted HTML string.
 * @returns {string} The sanitized HTML string.
 */

/**
 * @callback AutocompleteSortCallback
 * @param {string} a The first result value.
 * @param {string} b The second result value.
 * @param {string} term The current search term.
 * @returns {number} A negative number, zero, or a positive number for sort ordering.
 */

/**
 * @typedef {object} AutocompleteOptions
 * @property {AutocompleteLanguage} [lang] The localized status messages.
 * @property {string[]|null} [data=null] The locally filtered result values.
 * @property {AutocompleteGetResultsCallback|null} [getResults=null] The asynchronous results callback.
 * @property {AutocompleteRenderCallback} [renderResult] The result rendering callback.
 * @property {AutocompleteSanitizeCallback} [sanitize] The HTML sanitizing callback.
 * @property {AutocompleteMatchCallback} [isMatch] The local result matching callback.
 * @property {AutocompleteSortCallback} [sortResults] The local result sorting callback.
 * @property {number} [minSearch=1] The minimum term length required before showing results.
 * @property {number} [debounce=250] The asynchronous request debounce duration in milliseconds.
 * @property {number} [duration=100] The menu transition duration in milliseconds.
 * @property {string} [maxHeight='250px'] The maximum menu height.
 * @property {NodeInput|null} [appendTo=null] The container to append the menu to, or `null` to place it after the input.
 * @property {boolean} [fullWidth=false] Whether the menu should match the input width.
 * @property {Placement} [placement='bottom'] The preferred menu placement.
 * @property {Position} [position='start'] The menu alignment.
 * @property {boolean} [fixed=false] Whether to preserve the preferred placement.
 * @property {number} [spacing=0] The spacing between the input and menu.
 * @property {number|false} [minContact=false] The minimum contact between the input and menu.
 */

/** @typedef {'first'|'last'|'preserve'} AutocompleteFocus */

/**
 * @typedef {object} AutocompletePendingRequest
 * @property {AbortController} controller The request abort controller.
 * @property {AutocompleteFocus} focus The focus behavior when results render.
 * @property {number} offset The requested result offset.
 * @property {string} term The requested search term.
 */

const INPUT_ATTRIBUTES = [
    'role',
    'aria-controls',
    'aria-autocomplete',
    'aria-expanded',
    'aria-haspopup',
    'aria-activedescendant',
];

/**
 * Adds local or asynchronous autocomplete results to a text input.
 * @augments {BaseComponent<AutocompleteOptions>}
 */
export default class Autocomplete extends BaseComponent {
    static classes = {
        active: 'active',
        focus: 'focus',
        info: 'autocomplete-item text-body-secondary',
        item: 'autocomplete-item',
        menu: 'autocomplete-menu list-unstyled fade',
        menuSmall: 'autocomplete-menu-sm',
        menuLarge: 'autocomplete-menu-lg',
        show: 'show',
    };
    /** @type {AutocompleteOptions} */
    static defaults = {
        lang: {
            error: 'Error loading data.',
            loading: 'Loading..',
        },
        data: [],
        getResults: null,
        renderResult: (value) => value,
        sanitize: (input) => $.sanitize(input),
        isMatch(value, term) {
            return normalizeValue(value).includes(normalizeValue(term));
        },
        sortResults(a, b, term) {
            const aNormalized = normalizeValue(a);
            const bNormalized = normalizeValue(b);
            const termNormalized = normalizeValue(term);

            if (termNormalized) {
                const diff = aNormalized.indexOf(termNormalized) - bNormalized.indexOf(termNormalized);

                if (diff) {
                    return diff;
                }
            }

            return aNormalized.localeCompare(bNormalized);
        },
        minSearch: 1,
        debounce: 250,
        duration: 100,
        maxHeight: '250px',
        appendTo: null,
        fullWidth: false,
        placement: 'bottom',
        position: 'start',
        fixed: false,
        spacing: 0,
        minContact: false,
    };

    /** @type {HTMLLIElement[]} */
    #activeItems = [];
    /** @type {string[]} */
    #data = [];
    /** @type {HTMLLIElement|null} */
    #errorNode = null;
    /** @type {Map<string, string|null>} */
    #inputAttributes = new Map;
    #inputEvent = null;
    /** @type {HTMLLIElement|null} */
    #loaderNode = null;
    #loadResults = null;
    /** @type {HTMLUListElement|null} */
    #menuNode = null;
    /** @type {Popper|null} */
    #popper = null;
    /** @type {AutocompletePendingRequest|null} */
    #request = null;
    #scrollEvent = null;
    #showMore = false;
    #term = '';
    /** @type {{direction: 'in'|'out'}|null} */
    #transition = null;

    /**
     * Creates an Autocomplete.
     * @param {HTMLInputElement} node The text input node.
     * @param {AutocompleteOptions} [options] The Autocomplete options.
     */
    constructor(node, options) {
        super(node, options);

        if (Array.isArray(this.options.data)) {
            this.#data = this.options.data.filter((value) => typeof value === 'string');
        }

        if (this.#hasRemoteResults()) {
            const debounce = Math.max(0, Number(this.options.debounce) || 0);

            this.#loadResults = $._debounce(
                (request) => this.#requestResults(request),
                debounce,
            );
        }

        this.#render();
        this.#events();
    }

    /** @inheritdoc */
    dispose() {
        if (!this.node) {
            return;
        }

        this.#transition = null;
        this.#cancelRequest();

        if (!this.node) {
            return;
        }

        this.#inputEvent?.cancel();
        this.#scrollEvent?.cancel();

        if (this.#popper) {
            this.#popper.dispose();
            this.#popper = null;
        }

        $.removeEvent(
            this.node,
            'blur.ui.autocomplete input.ui.autocomplete keydown.ui.autocomplete',
        );
        $.remove(this.#menuNode);

        for (const [attribute, value] of this.#inputAttributes) {
            if (value === null) {
                $.removeAttribute(this.node, attribute);
            } else {
                $.setAttribute(this.node, attribute, value);
            }
        }

        this.#activeItems = null;
        this.#data = null;
        this.#errorNode = null;
        this.#inputAttributes = null;
        this.#inputEvent = null;
        this.#loaderNode = null;
        this.#loadResults = null;
        this.#menuNode = null;
        this.#scrollEvent = null;

        super.dispose();
    }

    /**
     * Hides the Autocomplete menu.
     */
    hide() {
        this.#inputEvent?.cancel();
        this.#scrollEvent?.cancel();

        if (
            !this.node ||
            !$.isConnected(this.#menuNode) ||
            this.#transition?.direction === 'out'
        ) {
            return;
        }

        // A lifecycle listener may dispose the component.
        if (
            !$.triggerOne(this.node, 'hide.ui.autocomplete') ||
            !this.node
        ) {
            return;
        }

        this.#cancelRequest();

        if (!this.node) {
            return;
        }

        const transition = { direction: 'out' };
        this.#transition = transition;

        // Keep the menu rendered until the opacity transition finishes.
        $.setStyle(this.#menuNode, { display: 'block' });
        $.removeClass(this.#menuNode, this.constructor.classes.show);
        $.setAttribute(this.node, { 'aria-expanded': false });

        if (this.node) {
            $.removeAttribute(this.node, 'aria-activedescendant');
        }

        waitForTransition(this.#menuNode, ['opacity']).then((_) => {
            if (!this.node || this.#transition !== transition) {
                return;
            }

            this.#transition = null;

            if (this.#popper) {
                this.#popper.dispose();
                this.#popper = null;
            }

            this.#resetMenu();
            $.setStyle(this.#menuNode, { display: '' });
            $.detach(this.#menuNode);
            $.triggerEvent(this.node, 'hidden.ui.autocomplete');
        });
    }

    /**
     * Shows the Autocomplete menu.
     */
    show() {
        this.#show('first');
    }

    /**
     * Toggles the Autocomplete menu.
     */
    toggle() {
        if (
            $.isConnected(this.#menuNode) &&
            this.#transition?.direction !== 'out'
        ) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Updates the Autocomplete menu position.
     */
    update() {
        this.#popper?.update();
    }

    /**
     * Appends the menu to its configured container.
     */
    #appendMenu() {
        if (this.options.appendTo) {
            try {
                $.append(this.options.appendTo, this.#menuNode);
            } catch {
                // Invalid selectors fall back to placement after the input.
            }
        }

        if (!$.isConnected(this.#menuNode)) {
            $.after(this.node, this.#menuNode);
        }
    }

    /**
     * Cancels pending debounce work and the current asynchronous request.
     */
    #cancelRequest() {
        this.#loadResults?.cancel();

        const request = this.#request;
        this.#request = null;

        if (this.#menuNode) {
            $.setAttribute(this.#menuNode, { 'aria-busy': false });
        }

        // Abort listeners run synchronously and may dispose the component.
        request?.controller.abort();
    }

    /**
     * Creates the menu Popper.
     */
    #createPopper() {
        if (this.#popper) {
            return;
        }

        const popperOptions = {
            reference: this.node,
            placement: this.options.placement,
            position: this.options.position,
            fixed: this.options.fixed,
            spacing: this.options.spacing,
            minContact: this.options.minContact,
        };

        if (this.options.fullWidth) {
            popperOptions.beforeUpdate = (node, reference) => {
                const width = $.rect(reference).width;
                const inlineSize = `${width}px`;

                $.setStyle(node, {
                    inlineSize,
                    maxInlineSize: inlineSize,
                    minInlineSize: inlineSize,
                });
            };
        }

        this.#popper = new Popper(this.#menuNode, popperOptions);
    }

    /**
     * Attaches input and menu events.
     */
    #events() {
        $.addEventDelegate(
            this.#menuNode,
            'mousedown.ui.autocomplete',
            '[data-ui-action="select"]',
            (e) => {
                if (e.button === 0) {
                    // Keep focus on the combobox until the delegated click selects the item.
                    e.preventDefault();
                }
            },
        );

        $.addEventDelegate(
            this.#menuNode,
            'click.ui.autocomplete',
            '[data-ui-action="select"]',
            (e) => {
                if (e.button !== 0) {
                    return;
                }

                e.preventDefault();
                this.#selectItem(e.currentTarget);
            },
        );

        $.addEventDelegate(
            this.#menuNode,
            'mouseover.ui.autocomplete',
            '[data-ui-action="select"]',
            (e) => this.#focusItem(e.currentTarget),
        );

        $.addEvent(this.node, 'blur.ui.autocomplete', (_) => {
            this.hide();
        });

        this.#inputEvent = $._debounce((_) => {
            if (
                !this.node ||
                !$.is(this.node, ':focus')
            ) {
                return;
            }

            if (
                !$.isConnected(this.#menuNode) ||
                this.#transition?.direction === 'out'
            ) {
                this.#show('first');
                return;
            }

            if (!this.#load(this.node.value, 'first')) {
                this.hide();
            }
        });

        $.addEvent(this.node, 'input.ui.autocomplete', this.#inputEvent);

        $.addEvent(this.node, 'keydown.ui.autocomplete', (e) => {
            if (
                e.isComposing ||
                !['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)
            ) {
                return;
            }

            const open = $.isConnected(this.#menuNode) &&
                this.#transition?.direction !== 'out';

            if (e.key === 'Enter') {
                const focusedNode = this.#getFocusedItem();

                if (open && focusedNode) {
                    e.preventDefault();
                    this.#selectItem(focusedNode);
                }

                return;
            }

            if (e.key === 'Escape') {
                if (open) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.hide();
                }

                return;
            }

            e.preventDefault();

            if (!open) {
                this.#show(e.key === 'ArrowUp' ? 'last' : 'first');
                return;
            }

            const focusedNode = this.#getFocusedItem();

            if (!focusedNode) {
                if (this.#activeItems.length) {
                    const focusNode = e.key === 'ArrowUp' ?
                        this.#activeItems.at(-1) :
                        this.#activeItems[0];

                    this.#focusItem(focusNode, { scroll: true });
                } else if (!this.#request) {
                    this.#load(this.node?.value ?? '', e.key === 'ArrowUp' ? 'last' : 'first');
                }

                return;
            }

            const currentIndex = this.#activeItems.indexOf(focusedNode);
            const change = e.key === 'ArrowUp' ? -1 : 1;
            const focusNode = this.#activeItems[currentIndex + change];

            if (focusNode) {
                this.#focusItem(focusNode, { scroll: true });
            }
        });

        if (this.#hasRemoteResults()) {
            this.#scrollEvent = $._throttle((_) => {
                if (
                    !this.node ||
                    !$.isConnected(this.#menuNode) ||
                    this.#transition?.direction === 'out' ||
                    this.#request ||
                    !this.#showMore
                ) {
                    return;
                }

                const height = $.height(this.#menuNode);
                const scrollHeight = $.height(this.#menuNode, { boxSize: $.SCROLL_BOX });
                const scrollTop = $.getScrollY(this.#menuNode);

                if (scrollTop < scrollHeight - height - (height / 4)) {
                    return;
                }

                const term = this.node.value;

                if (term !== this.#term) {
                    this.#load(term, 'first');
                    return;
                }

                this.#requestData({
                    focus: 'preserve',
                    offset: this.#data.length,
                    term,
                });
            }, 250, { leading: false });

            $.addEvent(this.#menuNode, 'scroll.ui.autocomplete', this.#scrollEvent);
        }
    }

    /**
     * Focuses an option and updates the active descendant.
     * @param {HTMLLIElement} item The option to focus.
     * @param {object} [options] The focus options.
     * @param {boolean} [options.scroll=false] Whether to scroll the option into view.
     */
    #focusItem(item, { scroll = false } = {}) {
        if (!item || !this.#activeItems.includes(item)) {
            return;
        }

        const focusedNode = this.#getFocusedItem();

        if (focusedNode && !$.isSame(focusedNode, item)) {
            $.removeClass(focusedNode, this.constructor.classes.focus);
            $.removeDataset(focusedNode, 'uiFocus');
        }

        $.addClass(item, this.constructor.classes.focus);
        $.setDataset(item, { uiFocus: true });

        if (this.node) {
            const id = $.getAttribute(item, 'id');

            if (id) {
                $.setAttribute(this.node, { 'aria-activedescendant': id });
            } else {
                $.removeAttribute(this.node, 'aria-activedescendant');
            }
        }

        if (!scroll) {
            return;
        }

        const menuScrollY = $.getScrollY(this.#menuNode);
        const menuRect = $.rect(this.#menuNode, { offset: true });
        const itemRect = $.rect(item, { offset: true });

        if (itemRect.top < menuRect.top) {
            $.setScrollY(this.#menuNode, menuScrollY + itemRect.top - menuRect.top);
        } else if (itemRect.bottom > menuRect.bottom) {
            $.setScrollY(this.#menuNode, menuScrollY + itemRect.bottom - menuRect.bottom);
        }
    }

    /**
     * Gets the currently focused option.
     * @returns {HTMLLIElement|null} The focused option, or `null`.
     */
    #getFocusedItem() {
        return this.#activeItems.find((item) => $.hasDataset(item, 'uiFocus')) || null;
    }

    /**
     * Gets sorted local results for a term.
     * @param {string} term The current search term.
     * @returns {string[]} The matching results.
     */
    #getLocalResults(term) {
        const results = this.#data.filter((value) => {
            try {
                return Boolean(this.options.isMatch.call(this, value, term));
            } catch {
                return false;
            }
        });

        return results.sort((a, b) => {
            try {
                return Number(this.options.sortResults.call(this, a, b, term)) || 0;
            } catch {
                return a.localeCompare(b);
            }
        });
    }

    /**
     * Checks whether an asynchronous results callback is configured.
     * @returns {boolean} Whether results load asynchronously.
     */
    #hasRemoteResults() {
        return typeof this.options.getResults === 'function';
    }

    /**
     * Checks whether a request token is still active and safe to render.
     * @param {AutocompletePendingRequest} request The request token to check.
     * @returns {boolean} Whether the request is current.
     */
    #isCurrentRequest(request) {
        return Boolean(
            this.node &&
            this.#request === request &&
            !request.controller.signal.aborted &&
            request.term === this.#term &&
            $.isConnected(this.#menuNode),
        );
    }

    /**
     * Loads results for a term.
     * @param {string} term The current search term.
     * @param {AutocompleteFocus} focus The initial focus behavior.
     * @returns {boolean} Whether the menu has content or pending content to display.
     */
    #load(term, focus) {
        if (!this.#meetsMinimumSearch(term)) {
            this.#cancelRequest();

            if (!this.node) {
                return false;
            }

            this.#term = term;
            this.#resetMenu();
            return false;
        }

        if (this.#hasRemoteResults()) {
            this.#requestData({ focus, term });
            return true;
        }

        this.#term = term;

        const results = this.#getLocalResults(term);

        this.#renderResults(results, { focus });

        if (!this.node) {
            return false;
        }

        this.update();

        return results.length > 0;
    }

    /**
     * Checks whether a term meets the configured minimum length.
     * @param {string} term The current search term.
     * @returns {boolean} Whether results can be shown.
     */
    #meetsMinimumSearch(term) {
        const minimum = Math.max(0, Number(this.options.minSearch) || 0);

        return term.length >= minimum;
    }

    /**
     * Renders the menu and applies combobox attributes to the input.
     */
    #render() {
        const id = generateId('autocomplete');

        for (const attribute of INPUT_ATTRIBUTES) {
            this.#inputAttributes.set(attribute, $.getAttribute(this.node, attribute));
        }

        const style = { maxBlockSize: this.options.maxHeight };
        const duration = Number(this.options.duration);

        if (Number.isFinite(duration) && duration >= 0) {
            style['--ui-autocomplete-transition-duration'] = `${duration}ms`;
        }

        this.#menuNode = $.create('ul', {
            class: this.constructor.classes.menu,
            style,
            attributes: {
                'id': id,
                'role': 'listbox',
                'aria-busy': false,
            },
        });

        if ($.is(this.node, '.input-sm')) {
            $.addClass(this.#menuNode, this.constructor.classes.menuSmall);
        } else if ($.is(this.node, '.input-lg')) {
            $.addClass(this.#menuNode, this.constructor.classes.menuLarge);
        }

        if (this.#hasRemoteResults()) {
            this.#loaderNode = this.#renderInfo(this.options.lang.loading);
            this.#errorNode = this.#renderInfo(this.options.lang.error);
        }

        $.setAttribute(this.node, {
            'role': 'combobox',
            'aria-controls': id,
            'aria-autocomplete': 'list',
            'aria-expanded': false,
            'aria-haspopup': 'listbox',
        });
        $.removeAttribute(this.node, 'aria-activedescendant');
    }

    /**
     * Renders an informational listbox option.
     * @param {string} text The status text to render.
     * @returns {HTMLLIElement} The status option.
     */
    #renderInfo(text) {
        return $.create('li', {
            html: this.#sanitize(`${text ?? ''}`),
            class: this.constructor.classes.info,
            attributes: {
                'role': 'option',
                'aria-disabled': true,
                'aria-live': 'polite',
            },
        });
    }

    /**
     * Renders a selectable result option.
     * @param {string} value The result value.
     * @returns {HTMLLIElement|null} The result option, or `null` if disposed while rendering.
     */
    #renderItem(value) {
        const active = (this.node?.value ?? '') === value;
        const item = $.create('li', {
            class: this.constructor.classes.item,
            attributes: {
                'id': generateId('autocomplete-item'),
                'role': 'option',
                'aria-label': value,
                'aria-selected': active,
            },
            dataset: {
                uiAction: 'select',
                uiValue: value,
            },
        });

        if (active) {
            $.addClass(item, this.constructor.classes.active);
        }

        let content;

        try {
            content = this.options.renderResult.call(this, value, item);
        } catch {
            content = value;
        }

        if (!this.node) {
            return null;
        }

        if (typeof content === 'string') {
            $.setHTML(item, this.#sanitize(content));
        } else if (
            ($._isNode(content) || $._isFragment(content)) &&
            !$.isSame(item, content)
        ) {
            $.append(item, content);
        }

        return item;
    }

    /**
     * Renders a successful asynchronous response.
     * @param {AutocompletePendingRequest} request The completed request.
     * @param {AutocompleteResults} response The response to render.
     */
    #renderResponse(request, response) {
        if (!this.#isCurrentRequest(request)) {
            return;
        }

        if (
            !response ||
            typeof response !== 'object' ||
            !Array.isArray(response.results) ||
            response.results.some((value) => typeof value !== 'string')
        ) {
            throw new TypeError('Autocomplete results must contain a string results array.');
        }

        const results = response.results;
        this.#showMore = Boolean(response.showMore) && results.length > 0;

        $.detach(this.#loaderNode);

        if (request.offset) {
            this.#data.push(...results);
        } else {
            this.#data = [...results];
        }

        if (results.length) {
            this.#renderResults(results, {
                append: Boolean(request.offset),
                focus: request.focus,
            });
        } else if (!request.offset) {
            this.hide();
        }
    }

    /**
     * Renders a page of results.
     * @param {string[]} results The result values to render.
     * @param {object} [options] The rendering options.
     * @param {boolean} [options.append=false] Whether to append to the current results.
     * @param {AutocompleteFocus} [options.focus='first'] The initial focus behavior.
     */
    #renderResults(results, { append = false, focus = 'first' } = {}) {
        const focusedNode = append ? this.#getFocusedItem() : null;

        if (!append) {
            this.#resetMenu();
        }

        const newItems = [];

        for (const value of results) {
            const item = this.#renderItem(value);

            // Rendering callbacks may dispose the component.
            if (!item || !this.node) {
                return;
            }

            newItems.push(item);
        }

        this.#activeItems.push(...newItems);
        $.append(this.#menuNode, newItems);

        if (focusedNode) {
            this.#focusItem(focusedNode);
        } else if (focus !== 'preserve' && this.#activeItems.length) {
            const focusNode = focus === 'last' ?
                this.#activeItems.at(-1) :
                this.#activeItems[0];

            this.#focusItem(focusNode, { scroll: true });
        } else if (this.node) {
            $.removeAttribute(this.node, 'aria-activedescendant');
        }
    }

    /**
     * Requests a page of asynchronous results.
     * @param {object} options The request options.
     * @param {AutocompleteFocus} options.focus The focus behavior when results render.
     * @param {number} [options.offset=0] The result offset.
     * @param {string} options.term The current search term.
     */
    #requestData({ focus, offset = 0, term }) {
        if (!this.node || (offset && (this.#request || term !== this.#term))) {
            return;
        }

        if (!offset) {
            this.#cancelRequest();

            if (!this.node) {
                return;
            }

            this.#term = term;
            this.#data = [];
            this.#showMore = false;

            this.#resetMenu();
        } else {
            $.detach(this.#errorNode);
        }

        const request = {
            controller: new AbortController,
            focus,
            offset,
            term,
        };

        this.#request = request;

        if (this.#menuNode) {
            $.setAttribute(this.#menuNode, { 'aria-busy': true });
        }

        if (this.#menuNode && this.#loaderNode) {
            $.append(this.#menuNode, this.#loaderNode);
        }

        this.#loadResults(request);
    }

    /**
     * Invokes the asynchronous results callback for a request token.
     * @param {AutocompletePendingRequest} request The pending request.
     */
    #requestResults(request) {
        Promise.resolve()
            .then((_) => {
                if (!this.#isCurrentRequest(request)) {
                    return;
                }

                const options = {
                    offset: request.offset,
                    signal: request.controller.signal,
                };

                if (request.term) {
                    options.term = request.term;
                }

                return this.options.getResults.call(this, options);
            })
            .then((response) => this.#renderResponse(request, response))
            .catch((_) => {
                if (!this.#isCurrentRequest(request)) {
                    return;
                }

                this.#showMore = false;

                $.detach(this.#loaderNode);
                $.detach(this.#errorNode);
                $.append(this.#menuNode, this.#errorNode);
            })
            .finally((_) => {
                if (!this.#isCurrentRequest(request)) {
                    return;
                }

                this.#request = null;

                if (this.#menuNode) {
                    $.setAttribute(this.#menuNode, { 'aria-busy': false });
                }

                this.update();

                if (
                    this.#showMore &&
                    this.#menuNode.scrollHeight <= this.#menuNode.clientHeight
                ) {
                    this.#scrollEvent();
                }
            });
    }

    /**
     * Resets all rendered menu content and focus state.
     */
    #resetMenu() {
        this.#activeItems = [];

        $.empty(this.#menuNode);

        if (this.node) {
            $.removeAttribute(this.node, 'aria-activedescendant');
        }

        if (this.#menuNode) {
            $.setAttribute(this.#menuNode, { 'aria-busy': false });
        }
    }

    /**
     * Sanitizes a rendered string and falls back to the built-in sanitizer if the callback fails.
     * @param {string} input The input HTML string.
     * @returns {string} The sanitized HTML string.
     */
    #sanitize(input) {
        try {
            return `${this.options.sanitize.call(this, input)}`;
        } catch {
            return $.sanitize(input);
        }
    }

    /**
     * Selects a result option.
     * @param {HTMLLIElement} item The option to select.
     */
    #selectItem(item) {
        if (!this.node || !item || !this.#activeItems.includes(item)) {
            return;
        }

        // Read the raw DOM string so values such as "true", "null", and "001" are not JSON-coerced.
        const value = item.dataset.uiValue;

        if (value !== this.node.value) {
            $.setValue(this.node, value);
            $.triggerEvent(this.node, 'change.ui.autocomplete');
        }

        this.hide();
        $.focus(this.node);
    }

    /**
     * Shows the Autocomplete menu with the requested initial focus behavior.
     * @param {AutocompleteFocus} focus The initial focus behavior.
     */
    #show(focus) {
        if (
            !this.node ||
            this.node.disabled ||
            this.node.readOnly ||
            (
                $.isConnected(this.#menuNode) &&
                this.#transition?.direction !== 'out'
            )
        ) {
            return;
        }

        const term = this.node.value;

        if (!this.#meetsMinimumSearch(term)) {
            this.#cancelRequest();
            return;
        }

        const localResults = this.#hasRemoteResults() ? null : this.#getLocalResults(term);

        if (localResults && !localResults.length) {
            this.#resetMenu();
            return;
        }

        // A lifecycle listener may dispose the component.
        if (
            !$.triggerOne(this.node, 'show.ui.autocomplete') ||
            !this.node
        ) {
            return;
        }

        if (localResults) {
            this.#term = term;
            this.#renderResults(localResults, { focus });
        } else {
            this.#requestData({ focus, term });
        }

        if (!this.node) {
            return;
        }

        const alreadyConnected = $.isConnected(this.#menuNode);

        if (!alreadyConnected) {
            this.#appendMenu();
        }

        // Render and commit the hidden menu before starting the transition.
        $.setStyle(this.#menuNode, { display: 'block' });
        $.css(this.#menuNode, 'opacity');
        this.#createPopper();

        const transition = { direction: 'in' };
        this.#transition = transition;

        $.addClass(this.#menuNode, this.constructor.classes.show);
        $.setStyle(this.#menuNode, { display: '' });
        $.setAttribute(this.node, { 'aria-expanded': true });

        this.#focusItem(this.#getFocusedItem(), { scroll: true });

        window.requestAnimationFrame((_) => {
            if (this.node && this.#transition === transition) {
                this.update();
            }
        });

        waitForTransition(this.#menuNode, ['opacity']).then((_) => {
            if (!this.node || this.#transition !== transition) {
                return;
            }

            this.#transition = null;
            $.triggerEvent(this.node, 'shown.ui.autocomplete');
        });
    }
}
