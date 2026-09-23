(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ?  factory(exports, require('@fr0st/ui'), require('@fr0st/query')) :
  typeof define === 'function' && define.amd ? define(['exports', '@fr0st/ui', '@fr0st/query'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.UI = global.UI || {}), global.UI,global.fQuery));
})(this, function(exports, _fr0st_ui, _fr0st_query) {
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
//#region \0rolldown/runtime.js
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) {
					__defProp(to, key, {
						get: ((k) => from[k]).bind(null, key),
						enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
					});
				}
			}
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));

//#endregion
_fr0st_query = __toESM(_fr0st_query, 1);

//#region src/js/helpers.js
/**
	* Normalizes a value for case- and accent-insensitive matching.
	* @param {string} value The value to normalize.
	* @returns {string} The normalized value.
	*/
	function normalizeValue(value) {
		return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
	}

//#endregion
//#region src/js/autocomplete.js
/** @import { NodeInput } from '@fr0st/query/src/helpers.js'; */
	/** @import { Placement, Position } from '@fr0st/ui/src/js/popper/popper.js'; */
	var window = _fr0st_query.default.getWindow();
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
	var INPUT_ATTRIBUTES = [
		"role",
		"aria-controls",
		"aria-autocomplete",
		"aria-expanded",
		"aria-haspopup",
		"aria-activedescendant"
	];
	/**
	* Adds local or asynchronous autocomplete results to a text input.
	* @augments {BaseComponent<AutocompleteOptions>}
	*/
	var Autocomplete = class extends _fr0st_ui.BaseComponent {
		static classes = {
			active: "active",
			focus: "focus",
			info: "autocomplete-item text-body-secondary",
			item: "autocomplete-item",
			menu: "autocomplete-menu list-unstyled fade",
			menuSmall: "autocomplete-menu-sm",
			menuLarge: "autocomplete-menu-lg",
			show: "show"
		};
		/** @type {AutocompleteOptions} */
		static defaults = {
			lang: {
				error: "Error loading data.",
				loading: "Loading.."
			},
			data: [],
			getResults: null,
			renderResult: (value) => value,
			sanitize: (input) => _fr0st_query.default.sanitize(input),
			isMatch(value, term) {
				return normalizeValue(value).includes(normalizeValue(term));
			},
			sortResults(a, b, term) {
				const aNormalized = normalizeValue(a);
				const bNormalized = normalizeValue(b);
				const termNormalized = normalizeValue(term);
				if (termNormalized) {
					const diff = aNormalized.indexOf(termNormalized) - bNormalized.indexOf(termNormalized);
					if (diff) return diff;
				}
				return aNormalized.localeCompare(bNormalized);
			},
			minSearch: 1,
			debounce: 250,
			duration: 100,
			maxHeight: "250px",
			appendTo: null,
			fullWidth: false,
			placement: "bottom",
			position: "start",
			fixed: false,
			spacing: 0,
			minContact: false
		};
		/** @type {HTMLLIElement[]} */
		#activeItems = [];
		/** @type {string[]} */
		#data = [];
		/** @type {HTMLLIElement|null} */
		#errorNode = null;
		/** @type {Map<string, string|null>} */
		#inputAttributes = /* @__PURE__ */ new Map();
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
		#term = "";
		/** @type {{direction: 'in'|'out'}|null} */
		#transition = null;
		/**
		* Creates an Autocomplete.
		* @param {HTMLInputElement} node The text input node.
		* @param {AutocompleteOptions} [options] The Autocomplete options.
		*/
		constructor(node, options) {
			super(node, options);
			if (Array.isArray(this.options.data)) this.#data = this.options.data.filter((value) => typeof value === "string");
			if (this.#hasRemoteResults()) {
				const debounce = Math.max(0, Number(this.options.debounce) || 0);
				this.#loadResults = _fr0st_query.default._debounce((request) => this.#requestResults(request), debounce);
			}
			this.#render();
			this.#events();
		}
		/** @inheritdoc */
		dispose() {
			if (!this.node) return;
			const node = this.node;
			this.#transition = null;
			this.#cancelRequest();
			this.#inputEvent?.cancel();
			this.#scrollEvent?.cancel();
			if (this.#popper) {
				this.#popper.dispose();
				this.#popper = null;
			}
			_fr0st_query.default.removeEvent(node, "blur.ui.autocomplete input.ui.autocomplete keydown.ui.autocomplete");
			_fr0st_query.default.removeEvent(this.#menuNode, "mousedown.ui.autocomplete click.ui.autocomplete mouseover.ui.autocomplete scroll.ui.autocomplete");
			_fr0st_query.default.remove(this.#menuNode);
			for (const [attribute, value] of this.#inputAttributes) if (value === null) _fr0st_query.default.removeAttribute(node, attribute);
			else _fr0st_query.default.setAttribute(node, attribute, value);
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
			if (!this.node || !_fr0st_query.default.isConnected(this.#menuNode) || this.#transition?.direction === "out") return;
			if (!_fr0st_query.default.triggerOne(this.node, "hide.ui.autocomplete") || !this.node) return;
			this.#cancelRequest();
			const transition = { direction: "out" };
			this.#transition = transition;
			_fr0st_query.default.setStyle(this.#menuNode, { display: "block" });
			_fr0st_query.default.removeClass(this.#menuNode, this.constructor.classes.show);
			_fr0st_query.default.setAttribute(this.node, { "aria-expanded": false });
			if (this.node) _fr0st_query.default.removeAttribute(this.node, "aria-activedescendant");
			(0, _fr0st_ui.waitForTransition)(this.#menuNode, ["opacity"]).then((_) => {
				if (!this.node || this.#transition !== transition) return;
				this.#transition = null;
				if (this.#popper) {
					this.#popper.dispose();
					this.#popper = null;
				}
				this.#resetMenu();
				_fr0st_query.default.setStyle(this.#menuNode, { display: "" });
				_fr0st_query.default.detach(this.#menuNode);
				_fr0st_query.default.triggerEvent(this.node, "hidden.ui.autocomplete");
			});
		}
		/**
		* Shows the Autocomplete menu.
		*/
		show() {
			this.#show("first");
		}
		/**
		* Toggles the Autocomplete menu.
		*/
		toggle() {
			if (_fr0st_query.default.isConnected(this.#menuNode) && this.#transition?.direction !== "out") this.hide();
			else this.show();
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
			if (this.options.appendTo) try {
				_fr0st_query.default.append(this.options.appendTo, this.#menuNode);
			} catch {}
			if (!_fr0st_query.default.isConnected(this.#menuNode)) _fr0st_query.default.after(this.node, this.#menuNode);
		}
		/**
		* Cancels pending debounce work and the current asynchronous request.
		*/
		#cancelRequest() {
			this.#loadResults?.cancel();
			if (this.#request) {
				this.#request.controller.abort();
				this.#request = null;
			}
			if (this.#menuNode) _fr0st_query.default.setAttribute(this.#menuNode, { "aria-busy": false });
		}
		/**
		* Creates the menu Popper.
		*/
		#createPopper() {
			if (this.#popper) return;
			const popperOptions = {
				reference: this.node,
				placement: this.options.placement,
				position: this.options.position,
				fixed: this.options.fixed,
				spacing: this.options.spacing,
				minContact: this.options.minContact
			};
			if (this.options.fullWidth) popperOptions.beforeUpdate = (node, reference) => {
				const inlineSize = `${_fr0st_query.default.rect(reference).width}px`;
				_fr0st_query.default.setStyle(node, {
					inlineSize,
					maxInlineSize: inlineSize,
					minInlineSize: inlineSize
				});
			};
			this.#popper = new _fr0st_ui.Popper(this.#menuNode, popperOptions);
		}
		/**
		* Attaches input and menu events.
		*/
		#events() {
			_fr0st_query.default.addEventDelegate(this.#menuNode, "mousedown.ui.autocomplete", "[data-ui-action=\"select\"]", (e) => {
				if (e.button === 0) e.preventDefault();
			});
			_fr0st_query.default.addEventDelegate(this.#menuNode, "click.ui.autocomplete", "[data-ui-action=\"select\"]", (e) => {
				if (e.button !== 0) return;
				e.preventDefault();
				this.#selectItem(e.currentTarget);
			});
			_fr0st_query.default.addEventDelegate(this.#menuNode, "mouseover.ui.autocomplete", "[data-ui-action=\"select\"]", (e) => this.#focusItem(e.currentTarget));
			_fr0st_query.default.addEvent(this.node, "blur.ui.autocomplete", (_) => {
				this.hide();
			});
			this.#inputEvent = _fr0st_query.default._debounce((_) => {
				if (!this.node || !_fr0st_query.default.is(this.node, ":focus")) return;
				if (!_fr0st_query.default.isConnected(this.#menuNode) || this.#transition?.direction === "out") {
					this.#show("first");
					return;
				}
				if (!this.#load(this.node?.value ?? "", "first")) this.hide();
			});
			_fr0st_query.default.addEvent(this.node, "input.ui.autocomplete", this.#inputEvent);
			_fr0st_query.default.addEvent(this.node, "keydown.ui.autocomplete", (e) => {
				if (e.isComposing || ![
					"ArrowDown",
					"ArrowUp",
					"Enter",
					"Escape"
				].includes(e.key)) return;
				const open = _fr0st_query.default.isConnected(this.#menuNode) && this.#transition?.direction !== "out";
				if (e.key === "Enter") {
					const focusedNode = this.#getFocusedItem();
					if (open && focusedNode) {
						e.preventDefault();
						this.#selectItem(focusedNode);
					}
					return;
				}
				if (e.key === "Escape") {
					if (open) {
						e.preventDefault();
						e.stopPropagation();
						this.hide();
					}
					return;
				}
				e.preventDefault();
				if (!open) {
					this.#show(e.key === "ArrowUp" ? "last" : "first");
					return;
				}
				const focusedNode = this.#getFocusedItem();
				if (!focusedNode) {
					if (this.#activeItems.length) {
						const focusNode = e.key === "ArrowUp" ? this.#activeItems.at(-1) : this.#activeItems[0];
						this.#focusItem(focusNode, { scroll: true });
					} else if (!this.#request) this.#load(this.node?.value ?? "", e.key === "ArrowUp" ? "last" : "first");
					return;
				}
				const currentIndex = this.#activeItems.indexOf(focusedNode);
				const change = e.key === "ArrowUp" ? -1 : 1;
				const focusNode = this.#activeItems[currentIndex + change];
				if (focusNode) this.#focusItem(focusNode, { scroll: true });
			});
			if (this.#hasRemoteResults()) {
				this.#scrollEvent = _fr0st_query.default._throttle((_) => {
					if (!this.node || !_fr0st_query.default.isConnected(this.#menuNode) || this.#transition?.direction === "out" || this.#request || !this.#showMore) return;
					const height = _fr0st_query.default.height(this.#menuNode);
					const scrollHeight = _fr0st_query.default.height(this.#menuNode, { boxSize: _fr0st_query.default.SCROLL_BOX });
					if (_fr0st_query.default.getScrollY(this.#menuNode) < scrollHeight - height - height / 4) return;
					const term = this.node?.value ?? "";
					if (term !== this.#term) {
						this.#load(term, "first");
						return;
					}
					this.#requestData({
						focus: "preserve",
						offset: this.#data.length,
						term
					});
				}, 250, { leading: false });
				_fr0st_query.default.addEvent(this.#menuNode, "scroll.ui.autocomplete", this.#scrollEvent);
			}
		}
		/**
		* Focuses an option and updates the active descendant.
		* @param {HTMLLIElement} item The option to focus.
		* @param {object} [options] The focus options.
		* @param {boolean} [options.scroll=false] Whether to scroll the option into view.
		*/
		#focusItem(item, { scroll = false } = {}) {
			if (!item || !this.#activeItems.includes(item)) return;
			const focusedNode = this.#getFocusedItem();
			if (focusedNode && !_fr0st_query.default.isSame(focusedNode, item)) {
				_fr0st_query.default.removeClass(focusedNode, this.constructor.classes.focus);
				_fr0st_query.default.removeDataset(focusedNode, "uiFocus");
			}
			_fr0st_query.default.addClass(item, this.constructor.classes.focus);
			_fr0st_query.default.setDataset(item, { uiFocus: true });
			if (this.node) {
				const id = _fr0st_query.default.getAttribute(item, "id");
				if (id) _fr0st_query.default.setAttribute(this.node, { "aria-activedescendant": id });
				else _fr0st_query.default.removeAttribute(this.node, "aria-activedescendant");
			}
			if (!scroll) return;
			const menuScrollY = _fr0st_query.default.getScrollY(this.#menuNode);
			const menuRect = _fr0st_query.default.rect(this.#menuNode, { offset: true });
			const itemRect = _fr0st_query.default.rect(item, { offset: true });
			if (itemRect.top < menuRect.top) _fr0st_query.default.setScrollY(this.#menuNode, menuScrollY + itemRect.top - menuRect.top);
			else if (itemRect.bottom > menuRect.bottom) _fr0st_query.default.setScrollY(this.#menuNode, menuScrollY + itemRect.bottom - menuRect.bottom);
		}
		/**
		* Gets the currently focused option.
		* @returns {HTMLLIElement|null} The focused option, or `null`.
		*/
		#getFocusedItem() {
			return this.#activeItems.find((item) => _fr0st_query.default.hasDataset(item, "uiFocus")) || null;
		}
		/**
		* Gets sorted local results for a term.
		* @param {string} term The current search term.
		* @returns {string[]} The matching results.
		*/
		#getLocalResults(term) {
			return this.#data.filter((value) => {
				try {
					return Boolean(this.options.isMatch.call(this, value, term));
				} catch {
					return false;
				}
			}).sort((a, b) => {
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
			return typeof this.options.getResults === "function";
		}
		/**
		* Checks whether a request token is still active and safe to render.
		* @param {AutocompletePendingRequest} request The request token to check.
		* @returns {boolean} Whether the request is current.
		*/
		#isCurrentRequest(request) {
			return Boolean(this.node && this.#request === request && !request.controller.signal.aborted && request.term === this.#term && _fr0st_query.default.isConnected(this.#menuNode));
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
				this.#term = term;
				this.#resetMenu();
				return false;
			}
			if (this.#hasRemoteResults()) {
				this.#requestData({
					focus,
					term
				});
				return true;
			}
			this.#term = term;
			const results = this.#getLocalResults(term);
			this.#renderResults(results, { focus });
			if (!this.node) return false;
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
			const id = (0, _fr0st_ui.generateId)("autocomplete");
			for (const attribute of INPUT_ATTRIBUTES) this.#inputAttributes.set(attribute, _fr0st_query.default.getAttribute(this.node, attribute));
			const style = { maxBlockSize: this.options.maxHeight };
			const duration = Number(this.options.duration);
			if (Number.isFinite(duration) && duration >= 0) style["--ui-autocomplete-transition-duration"] = `${duration}ms`;
			this.#menuNode = _fr0st_query.default.create("ul", {
				class: this.constructor.classes.menu,
				style,
				attributes: {
					"id": id,
					"role": "listbox",
					"aria-busy": false
				}
			});
			if (_fr0st_query.default.is(this.node, ".input-sm")) _fr0st_query.default.addClass(this.#menuNode, this.constructor.classes.menuSmall);
			else if (_fr0st_query.default.is(this.node, ".input-lg")) _fr0st_query.default.addClass(this.#menuNode, this.constructor.classes.menuLarge);
			if (this.#hasRemoteResults()) {
				this.#loaderNode = this.#renderInfo(this.options.lang.loading);
				this.#errorNode = this.#renderInfo(this.options.lang.error);
			}
			_fr0st_query.default.setAttribute(this.node, {
				"role": "combobox",
				"aria-controls": id,
				"aria-autocomplete": "list",
				"aria-expanded": false,
				"aria-haspopup": "listbox"
			});
			_fr0st_query.default.removeAttribute(this.node, "aria-activedescendant");
		}
		/**
		* Renders an informational listbox option.
		* @param {string} text The status text to render.
		* @returns {HTMLLIElement} The status option.
		*/
		#renderInfo(text) {
			return _fr0st_query.default.create("li", {
				html: this.#sanitize(`${text ?? ""}`),
				class: this.constructor.classes.info,
				attributes: {
					"role": "option",
					"aria-disabled": true,
					"aria-live": "polite"
				}
			});
		}
		/**
		* Renders a selectable result option.
		* @param {string} value The result value.
		* @returns {HTMLLIElement|null} The result option, or `null` if disposed while rendering.
		*/
		#renderItem(value) {
			const active = (this.node?.value ?? "") === value;
			const item = _fr0st_query.default.create("li", {
				class: this.constructor.classes.item,
				attributes: {
					"id": (0, _fr0st_ui.generateId)("autocomplete-item"),
					"role": "option",
					"aria-label": value,
					"aria-selected": active
				},
				dataset: {
					uiAction: "select",
					uiValue: value
				}
			});
			if (active) _fr0st_query.default.addClass(item, this.constructor.classes.active);
			let content;
			try {
				content = this.options.renderResult.call(this, value, item);
			} catch {
				content = value;
			}
			if (!this.node) return null;
			if (typeof content === "string") _fr0st_query.default.setHTML(item, this.#sanitize(content));
			else if ((_fr0st_query.default._isNode(content) || _fr0st_query.default._isFragment(content)) && !_fr0st_query.default.isSame(item, content)) _fr0st_query.default.append(item, content);
			return item;
		}
		/**
		* Renders a successful asynchronous response.
		* @param {AutocompletePendingRequest} request The completed request.
		* @param {AutocompleteResults} response The response to render.
		*/
		#renderResponse(request, response) {
			if (!this.#isCurrentRequest(request)) return;
			if (!response || typeof response !== "object" || !Array.isArray(response.results) || response.results.some((value) => typeof value !== "string")) throw new TypeError("Autocomplete results must contain a string results array.");
			const results = response.results;
			this.#showMore = Boolean(response.showMore) && results.length > 0;
			_fr0st_query.default.detach(this.#loaderNode);
			if (request.offset) {
				this.#data.push(...results);
				if (results.length) this.#renderResults(results, {
					append: true,
					focus: request.focus
				});
			} else {
				this.#data = [...results];
				if (results.length) this.#renderResults(results, { focus: request.focus });
				else this.hide();
			}
		}
		/**
		* Renders a page of results.
		* @param {string[]} results The result values to render.
		* @param {object} [options] The rendering options.
		* @param {boolean} [options.append=false] Whether to append to the current results.
		* @param {AutocompleteFocus} [options.focus='first'] The initial focus behavior.
		*/
		#renderResults(results, { append = false, focus = "first" } = {}) {
			const focusedNode = append ? this.#getFocusedItem() : null;
			if (append) {
				_fr0st_query.default.detach(this.#loaderNode);
				_fr0st_query.default.detach(this.#errorNode);
			} else this.#resetMenu();
			const newItems = [];
			for (const value of results) {
				const item = this.#renderItem(value);
				if (!item || !this.node) return;
				newItems.push(item);
			}
			this.#activeItems.push(...newItems);
			_fr0st_query.default.append(this.#menuNode, newItems);
			if (focusedNode) this.#focusItem(focusedNode);
			else if (focus !== "preserve" && this.#activeItems.length) {
				const focusNode = focus === "last" ? this.#activeItems.at(-1) : this.#activeItems[0];
				this.#focusItem(focusNode, { scroll: true });
			} else if (this.node) _fr0st_query.default.removeAttribute(this.node, "aria-activedescendant");
		}
		/**
		* Requests a page of asynchronous results.
		* @param {object} options The request options.
		* @param {AutocompleteFocus} options.focus The focus behavior when results render.
		* @param {number} [options.offset=0] The result offset.
		* @param {string} options.term The current search term.
		*/
		#requestData({ focus, offset = 0, term }) {
			if (!this.node || offset && (this.#request || term !== this.#term)) return;
			if (!offset) {
				this.#cancelRequest();
				this.#term = term;
				this.#data = [];
				this.#showMore = false;
				this.#resetMenu();
			} else _fr0st_query.default.detach(this.#errorNode);
			const request = {
				controller: new AbortController(),
				focus,
				offset,
				term
			};
			this.#request = request;
			if (this.#menuNode) _fr0st_query.default.setAttribute(this.#menuNode, { "aria-busy": true });
			if (!_fr0st_query.default.isSame(this.#menuNode.lastElementChild, this.#loaderNode)) _fr0st_query.default.append(this.#menuNode, this.#loaderNode);
			this.#loadResults(request);
		}
		/**
		* Invokes the asynchronous results callback for a request token.
		* @param {AutocompletePendingRequest} request The pending request.
		*/
		#requestResults(request) {
			Promise.resolve().then((_) => {
				if (!this.#isCurrentRequest(request)) return;
				const options = {
					offset: request.offset,
					signal: request.controller.signal
				};
				if (request.term) options.term = request.term;
				return this.options.getResults.call(this, options);
			}).then((response) => this.#renderResponse(request, response)).catch((_) => {
				if (!this.#isCurrentRequest(request)) return;
				this.#showMore = false;
				_fr0st_query.default.detach(this.#loaderNode);
				_fr0st_query.default.detach(this.#errorNode);
				_fr0st_query.default.append(this.#menuNode, this.#errorNode);
			}).finally((_) => {
				if (!this.#isCurrentRequest(request)) return;
				this.#request = null;
				if (this.#menuNode) _fr0st_query.default.setAttribute(this.#menuNode, { "aria-busy": false });
				this.update();
				if (this.#showMore && this.#menuNode.scrollHeight <= this.#menuNode.clientHeight) this.#scrollEvent();
			});
		}
		/**
		* Resets all rendered menu content and focus state.
		*/
		#resetMenu() {
			this.#activeItems = [];
			_fr0st_query.default.empty(this.#menuNode);
			if (this.node) _fr0st_query.default.removeAttribute(this.node, "aria-activedescendant");
			if (this.#menuNode) _fr0st_query.default.setAttribute(this.#menuNode, { "aria-busy": false });
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
				return _fr0st_query.default.sanitize(input);
			}
		}
		/**
		* Selects a result option.
		* @param {HTMLLIElement} item The option to select.
		*/
		#selectItem(item) {
			if (!this.node || !item || !this.#activeItems.includes(item)) return;
			const value = item.dataset.uiValue;
			if (value !== (this.node?.value ?? "")) {
				_fr0st_query.default.setValue(this.node, value);
				_fr0st_query.default.triggerEvent(this.node, "change.ui.autocomplete");
			}
			this.hide();
			_fr0st_query.default.focus(this.node);
		}
		/**
		* Shows the Autocomplete menu with the requested initial focus behavior.
		* @param {AutocompleteFocus} focus The initial focus behavior.
		*/
		#show(focus) {
			if (!this.node || this.node.disabled || this.node.readOnly || _fr0st_query.default.isConnected(this.#menuNode) && this.#transition?.direction !== "out") return;
			const term = this.node?.value ?? "";
			if (!this.#meetsMinimumSearch(term)) {
				this.#cancelRequest();
				return;
			}
			const localResults = this.#hasRemoteResults() ? null : this.#getLocalResults(term);
			if (localResults && !localResults.length) {
				this.#resetMenu();
				return;
			}
			if (!_fr0st_query.default.triggerOne(this.node, "show.ui.autocomplete") || !this.node) return;
			if (localResults) {
				this.#term = term;
				this.#renderResults(localResults, { focus });
			} else this.#requestData({
				focus,
				term
			});
			if (!this.node) return;
			if (!_fr0st_query.default.isConnected(this.#menuNode)) this.#appendMenu();
			_fr0st_query.default.setStyle(this.#menuNode, { display: "block" });
			_fr0st_query.default.css(this.#menuNode, "opacity");
			this.#createPopper();
			const transition = { direction: "in" };
			this.#transition = transition;
			_fr0st_query.default.addClass(this.#menuNode, this.constructor.classes.show);
			_fr0st_query.default.setStyle(this.#menuNode, { display: "" });
			_fr0st_query.default.setAttribute(this.node, { "aria-expanded": true });
			this.#focusItem(this.#getFocusedItem(), { scroll: true });
			window.requestAnimationFrame((_) => {
				if (this.node && this.#transition === transition) this.update();
			});
			(0, _fr0st_ui.waitForTransition)(this.#menuNode, ["opacity"]).then((_) => {
				if (!this.node || this.#transition !== transition) return;
				this.#transition = null;
				_fr0st_query.default.triggerEvent(this.node, "shown.ui.autocomplete");
			});
		}
	};

//#endregion
//#region src/js/index.js
	(0, _fr0st_ui.initComponent)("autocomplete", Autocomplete);
	var js_default = Autocomplete;

//#endregion
exports.Autocomplete = js_default;
});
//# sourceMappingURL=frost-ui-autocomplete.js.map