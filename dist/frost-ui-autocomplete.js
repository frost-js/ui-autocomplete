(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ?  factory(exports, require('@fr0st/query'), require('@fr0st/ui')) :
  typeof define === 'function' && define.amd ? define(['exports', '@fr0st/query', '@fr0st/ui'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.UI = global.UI || {}), global.fQuery,global.UI));
})(this, function(exports, _fr0st_query, _fr0st_ui) {
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

//#region src/js/autocomplete.js
/**
	* Autocomplete Class
	* @class
	*/
	var Autocomplete = class extends _fr0st_ui.BaseComponent {
		/**
		* New Autocomplete constructor.
		* @param {HTMLElement} node The input node.
		* @param {object} [options] The options to create the Autocomplete with.
		*/
		constructor(node, options) {
			super(node, options);
			this._data = [];
			this._activeItems = [];
			this._getData = null;
			this._getResults = null;
			if (this._options.getResults) this._getResultsInit();
			else if (this._options.data) {
				this._data = this._options.data;
				this._getDataInit();
			}
			this._render();
			this._events();
		}
		/**
		* Dispose the Autocomplete.
		*/
		dispose() {
			if (this._popper) {
				this._popper.dispose();
				this._popper = null;
			}
			_fr0st_query.default.remove(this._menuNode);
			_fr0st_query.default.removeEvent(this._node, "keydown.ui.autocomplete");
			_fr0st_query.default.removeEvent(this._node, "input.ui.autocomplete");
			_fr0st_query.default.removeEvent(this._node, "blur.ui.autocomplete");
			_fr0st_query.default.removeAttribute(this._node, "role");
			_fr0st_query.default.removeAttribute(this._node, "aria-controls");
			_fr0st_query.default.removeAttribute(this._node, "aria-autocomplete");
			_fr0st_query.default.removeAttribute(this._node, "aria-expanded");
			_fr0st_query.default.removeAttribute(this._node, "aria-activedescendent");
			this._menuNode = null;
			this._loader = null;
			this._error = null;
			this._data = null;
			this._activeItems = null;
			this._value = null;
			this._requests = null;
			this._popperOptions = null;
			this._getData = null;
			super.dispose();
		}
		/**
		* Hide the Autocomplete.
		*/
		hide() {
			if (!_fr0st_query.default.isConnected(this._menuNode) || _fr0st_query.default.getDataset(this._menuNode, "uiAnimating") || !_fr0st_query.default.triggerOne(this._node, "hide.ui.autocomplete")) return;
			_fr0st_query.default.setDataset(this._menuNode, { uiAnimating: "out" });
			_fr0st_query.default.fadeOut(this._menuNode, { duration: this._options.duration }).then((_) => {
				this._popper.dispose();
				this._popper = null;
				this._activeItems = [];
				_fr0st_query.default.empty(this._menuNode);
				_fr0st_query.default.detach(this._menuNode);
				_fr0st_query.default.removeDataset(this._menuNode, "uiAnimating");
				_fr0st_query.default.setAttribute(this._node, {
					"aria-expanded": false,
					"aria-activedescendent": ""
				});
				_fr0st_query.default.triggerEvent(this._node, "hidden.ui.autocomplete");
			}).catch((_) => {
				if (_fr0st_query.default.getDataset(this._menuNode, "uiAnimating") === "out") _fr0st_query.default.removeDataset(this._menuNode, "uiAnimating");
			});
		}
		/**
		* Show the Autocomplete.
		*/
		show() {
			if (_fr0st_query.default.is(this._node, ":disabled") || _fr0st_query.default.hasAttribute(this._node, "readonly") || _fr0st_query.default.isConnected(this._menuNode) || _fr0st_query.default.getDataset(this._menuNode, "uiAnimating") || !_fr0st_query.default.triggerOne(this._node, "show.ui.autocomplete")) return;
			const term = _fr0st_query.default.getValue(this._node);
			this._getData({ term });
			_fr0st_query.default.setDataset(this._menuNode, { uiAnimating: "in" });
			if (this._options.appendTo) _fr0st_query.default.append(this._options.appendTo, this._menuNode);
			else _fr0st_query.default.after(this._node, this._menuNode);
			this._popper = new _fr0st_ui.Popper(this._menuNode, this._popperOptions);
			_fr0st_query.default.fadeIn(this._menuNode, { duration: this._options.duration }).then((_) => {
				_fr0st_query.default.removeDataset(this._menuNode, "uiAnimating");
				_fr0st_query.default.setAttribute(this._node, { "aria-expanded": true });
				_fr0st_query.default.triggerEvent(this._node, "shown.ui.autocomplete");
			}).catch((_) => {
				if (_fr0st_query.default.getDataset(this._menuNode, "uiAnimating") === "in") _fr0st_query.default.removeDataset(this._menuNode, "uiAnimating");
			});
		}
		/**
		* Toggle the Autocomplete.
		*/
		toggle() {
			if (_fr0st_query.default.isConnected(this._menuNode)) this.hide();
			else this.show();
		}
		/**
		* Update the Autocomplete position.
		*/
		update() {
			if (this._popper) this._popper.update();
		}
	};

//#endregion
//#region src/js/prototype/data.js
/**
	* Initialize preloaded get data.
	*/
	function _getDataInit() {
		this._getData = ({ term = null }) => {
			this._activeItems = [];
			_fr0st_query.default.empty(this._menuNode);
			_fr0st_query.default.setAttribute(this._node, { "aria-activedescendent": "" });
			if (this._options.minSearch && (!term || term.length < this._options.minSearch)) {
				_fr0st_query.default.hide(this._menuNode);
				this.update();
				return;
			}
			_fr0st_query.default.show(this._menuNode);
			const isMatch = this._options.isMatch.bind(this);
			const sortResults = this._options.sortResults.bind(this);
			const results = this._data.filter((value) => isMatch(value, term)).sort((a, b) => sortResults(a, b, term));
			this._renderResults(results);
			this.update();
		};
	}
	/**
	* Initialize get data from callback.
	*/
	function _getResultsInit() {
		const load = _fr0st_query.default._debounce(({ offset, term }) => {
			const options = { offset };
			if (term) options.term = term;
			const request = Promise.resolve(this._options.getResults(options));
			request.then((response) => {
				if (this._request !== request) return;
				const newData = response.results;
				if (!offset) {
					this._data = newData;
					_fr0st_query.default.empty(this._menuNode);
				} else {
					this._data.push(...newData);
					_fr0st_query.default.detach(this._loader);
				}
				this._showMore = response.showMore;
				this._renderResults(newData);
				this._request = null;
			}).catch((_) => {
				if (this._request !== request) return;
				_fr0st_query.default.detach(this._loader);
				_fr0st_query.default.append(this._menuNode, this._error);
				this._request = null;
			}).finally((_) => {
				this._loadingScroll = false;
				this.update();
			});
			this._request = request;
		}, this._options.debounce);
		this._getData = ({ offset = 0, term = null }) => {
			if (this._request && this._request.cancel) this._request.cancel();
			this._request = null;
			if (!offset) {
				this._activeItems = [];
				_fr0st_query.default.setAttribute(this._node, { "aria-activedescendent": "" });
				const children = _fr0st_query.default.children(this._menuNode, (node) => !_fr0st_query.default.isSame(node, this._loader));
				_fr0st_query.default.detach(children);
			} else _fr0st_query.default.detach(this._error);
			if (this._options.minSearch && (!term || term.length < this._options.minSearch)) {
				_fr0st_query.default.hide(this._menuNode);
				this.update();
				return;
			}
			_fr0st_query.default.show(this._menuNode);
			const lastChild = _fr0st_query.default.child(this._menuNode, ":last-child");
			if (!lastChild || !_fr0st_query.default.isSame(lastChild, this._loader)) _fr0st_query.default.append(this._menuNode, this._loader);
			load({
				offset,
				term
			});
		};
	}

//#endregion
//#region src/js/prototype/events.js
/**
	* Attach events for the Autocomplete.
	*/
	function _events() {
		_fr0st_query.default.addEventDelegate(this._menuNode, "contextmenu.ui.autocomplete", "[data-ui-action=\"select\"]", (e) => {
			e.preventDefault();
		});
		_fr0st_query.default.addEventDelegate(this._menuNode, "mousedown.ui.autocomplete", "[data-ui-action=\"select\"]", (e) => {
			e.preventDefault();
		});
		_fr0st_query.default.addEvent(this._node, "blur.ui.autocomplete", (_) => {
			if (_fr0st_query.default.isSame(this._node, document.activeElement)) return;
			_fr0st_query.default.stop(this._menuNode);
			_fr0st_query.default.removeDataset(this._menuNode, "uiAnimating");
			this.hide();
		});
		_fr0st_query.default.addEventDelegate(this._menuNode, "click.ui.autocomplete", "[data-ui-action=\"select\"]", (e) => {
			e.preventDefault();
			const value = _fr0st_query.default.getDataset(e.currentTarget, "uiValue");
			if (value !== _fr0st_query.default.getValue(this._node)) {
				_fr0st_query.default.setValue(this._node, value);
				_fr0st_query.default.triggerEvent(this._node, "change.ui.autocomplete");
			}
			this.hide();
			_fr0st_query.default.focus(this._node);
		});
		_fr0st_query.default.addEventDelegate(this._menuNode, "mouseover.ui.autocomplete", "[data-ui-action=\"select\"]", _fr0st_query.default.debounce((e) => {
			const focusedNode = _fr0st_query.default.findOne("[data-ui-focus]", this._menuNode);
			_fr0st_query.default.removeClass(focusedNode, this.constructor.classes.focus);
			_fr0st_query.default.removeDataset(focusedNode, "uiFocus");
			_fr0st_query.default.addClass(e.currentTarget, this.constructor.classes.focus);
			_fr0st_query.default.setDataset(e.currentTarget, { uiFocus: true });
			const id = _fr0st_query.default.getAttribute(e.currentTarget, "id");
			_fr0st_query.default.setAttribute(this._node, { "aria-activedescendent": id });
		}));
		_fr0st_query.default.addEvent(this._node, "input.ui.autocomplete", _fr0st_query.default.debounce((_) => {
			if (!_fr0st_query.default.isConnected(this._menuNode)) this.show();
			else {
				const term = _fr0st_query.default.getValue(this._node);
				this._getData({ term });
			}
		}));
		_fr0st_query.default.addEvent(this._node, "keydown.ui.autocomplete", (e) => {
			if (![
				"ArrowDown",
				"ArrowUp",
				"Enter",
				"Escape",
				"NumpadEnter"
			].includes(e.code)) return;
			const focusedNode = _fr0st_query.default.findOne("[data-ui-focus]", this._menuNode);
			switch (e.code) {
				case "Enter":
				case "NumpadEnter":
					if (focusedNode) {
						const value = _fr0st_query.default.getDataset(focusedNode, "uiValue");
						if (value !== _fr0st_query.default.getValue(this._node)) {
							_fr0st_query.default.setValue(this._node, value);
							_fr0st_query.default.triggerEvent(this._node, "change.ui.autocomplete");
						}
						this.hide();
					}
					return;
				case "Escape":
					if (_fr0st_query.default.isConnected(this._menuNode)) {
						e.stopPropagation();
						this.hide();
					}
					return;
			}
			e.preventDefault();
			if (!_fr0st_query.default.isConnected(this._menuNode)) {
				this.show();
				return;
			}
			let focusNode;
			if (!focusedNode) focusNode = this._activeItems[0];
			else {
				let focusIndex = this._activeItems.indexOf(focusedNode);
				switch (e.code) {
					case "ArrowDown":
						focusIndex++;
						break;
					case "ArrowUp": focusIndex--;
				}
				focusNode = this._activeItems[focusIndex];
			}
			if (!focusedNode && !focusNode && !this._request) {
				const term = _fr0st_query.default.getValue(this._node);
				this._getData({ term });
				return;
			}
			if (!focusNode) return;
			_fr0st_query.default.removeClass(focusedNode, this.constructor.classes.focus);
			_fr0st_query.default.removeDataset(focusedNode, "uiFocus");
			_fr0st_query.default.addClass(focusNode, this.constructor.classes.focus);
			_fr0st_query.default.setDataset(focusNode, { uiFocus: true });
			const id = _fr0st_query.default.getAttribute(focusNode, "id");
			_fr0st_query.default.setAttribute(this._node, { "aria-activedescendent": id });
			const itemsScrollY = _fr0st_query.default.getScrollY(this._menuNode);
			const itemsRect = _fr0st_query.default.rect(this._menuNode, { offset: true });
			const nodeRect = _fr0st_query.default.rect(focusNode, { offset: true });
			if (nodeRect.top < itemsRect.top) _fr0st_query.default.setScrollY(this._menuNode, itemsScrollY + nodeRect.top - itemsRect.top);
			else if (nodeRect.bottom > itemsRect.bottom) _fr0st_query.default.setScrollY(this._menuNode, itemsScrollY + nodeRect.bottom - itemsRect.bottom);
		});
		if (this._options.getResults) _fr0st_query.default.addEvent(this._menuNode, "scroll.ui.autocomplete", _fr0st_query.default._throttle((_) => {
			if (this._loadingScroll || !this._showMore) return;
			const height = _fr0st_query.default.height(this._menuNode);
			const scrollHeight = _fr0st_query.default.height(this._menuNode, { boxSize: _fr0st_query.default.SCROLL_BOX });
			if (_fr0st_query.default.getScrollY(this._menuNode) >= scrollHeight - height - height / 4) {
				const term = _fr0st_query.default.getValue(this._node);
				const offset = this._data.length;
				this._loadingScroll = true;
				this._getData({
					term,
					offset
				});
			}
		}, 250, { leading: false }));
	}

//#endregion
//#region src/js/prototype/render.js
/**
	* Render the toggle element.
	*/
	function _render() {
		const id = (0, _fr0st_ui.generateId)("autocomplete");
		this._menuNode = _fr0st_query.default.create("ul", {
			class: this.constructor.classes.menu,
			style: { maxHeight: this._options.maxHeight },
			attributes: {
				id,
				role: "listbox"
			}
		});
		if (_fr0st_query.default.is(this._node, ".input-sm")) _fr0st_query.default.addClass(this._menuNode, this.constructor.classes.menuSmall);
		else if (_fr0st_query.default.is(this._node, ".input-lg")) _fr0st_query.default.addClass(this._menuNode, this.constructor.classes.menuLarge);
		if (this._options.getResults) {
			this._loader = this._renderInfo(this._options.lang.loading);
			this._error = this._renderInfo(this._options.lang.error);
		}
		this._popperOptions = {
			reference: this._node,
			placement: this._options.placement,
			position: this._options.position,
			fixed: this._options.fixed,
			spacing: this._options.spacing,
			minContact: this._options.minContact
		};
		if (this._options.fullWidth) {
			this._popperOptions.beforeUpdate = (node) => {
				_fr0st_query.default.setStyle(node, { width: "" });
			};
			this._popperOptions.afterUpdate = (node, reference) => {
				const width = _fr0st_query.default.width(reference, { boxSize: _fr0st_query.default.BORDER_BOX });
				_fr0st_query.default.setStyle(node, { width: `${width}px` });
			};
		}
		_fr0st_query.default.setAttribute(this._node, {
			"role": "combobox",
			"aria-controls": id,
			"aria-autocomplete": "list",
			"aria-expanded": false,
			"aria-activedescendent": ""
		});
	}
	/**
	* Render an information item.
	* @param {string} text The text to render.
	* @returns {HTMLElement} The information item.
	*/
	function _renderInfo(text) {
		return _fr0st_query.default.create("div", {
			html: this._options.sanitize(text),
			class: this.constructor.classes.info
		});
	}
	/**
	* Render an item.
	* @param {string} value The value to render.
	* @returns {HTMLElement} The item element.
	*/
	function _renderItem(value) {
		const id = (0, _fr0st_ui.generateId)("autocomplete-item");
		const active = _fr0st_query.default.getValue(this._node) == value;
		const element = _fr0st_query.default.create("li", {
			class: this.constructor.classes.item,
			attributes: {
				id,
				"role": "option",
				"aria-label": value,
				"aria-selected": active
			},
			dataset: {
				uiAction: "select",
				uiValue: value
			}
		});
		this._activeItems.push(element);
		if (active) _fr0st_query.default.addClass(element, this.constructor.classes.active);
		const content = this._options.renderResult.bind(this)(value, element);
		if (_fr0st_query.default._isString(content)) _fr0st_query.default.setHTML(element, this._options.sanitize(content));
		else if (_fr0st_query.default._isElement(content) && !_fr0st_query.default.isSame(element, content)) _fr0st_query.default.append(element, content);
		return element;
	}
	/**
	* Render results.
	* @param {Array} results The results to render.
	*/
	function _renderResults(results) {
		_fr0st_query.default.show(this._menuNode);
		for (const value of results) {
			const element = this._renderItem(value);
			_fr0st_query.default.append(this._menuNode, element);
		}
		if (!_fr0st_query.default.hasChildren(this._menuNode)) {
			_fr0st_query.default.hide(this._menuNode);
			return;
		}
		if (!_fr0st_query.default.findOne("[data-ui-focus]", this._menuNode) && this._activeItems.length) {
			const element = this._activeItems[0];
			_fr0st_query.default.addClass(element, this.constructor.classes.focus);
			_fr0st_query.default.setDataset(element, { uiFocus: true });
			const id = _fr0st_query.default.getAttribute(element, "id");
			_fr0st_query.default.setAttribute(this._node, { "aria-activedescendent": id });
		}
	}

//#endregion
//#region src/js/index.js
	Autocomplete.defaults = {
		lang: {
			error: "Error loading data.",
			loading: "Loading.."
		},
		data: null,
		getResults: null,
		renderResult: (value) => value,
		sanitize: (input) => _fr0st_query.default.sanitize(input),
		isMatch(value, term) {
			const escapedTerm = _fr0st_query.default._escapeRegExp(term);
			const regExp = new RegExp(escapedTerm, "i");
			if (regExp.test(value)) return true;
			const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
			return regExp.test(normalized);
		},
		sortResults(a, b, term) {
			const aLower = a.toLowerCase();
			const bLower = b.toLowerCase();
			if (term) {
				const diff = aLower.indexOf(term) - bLower.indexOf(term);
				if (diff) return diff;
			}
			return aLower.localeCompare(bLower);
		},
		minSearch: 1,
		debounce: 250,
		duration: 100,
		maxHeight: "250px",
		menuSize: null,
		appendTo: null,
		fullWidth: false,
		placement: "bottom",
		position: "start",
		fixed: false,
		spacing: 0,
		minContact: false
	};
	Autocomplete.classes = {
		active: "active",
		focus: "focus",
		info: "autocomplete-item text-body-secondary",
		item: "autocomplete-item",
		menu: "autocomplete-menu list-unstyled",
		menuSmall: "autocomplete-menu-sm",
		menuLarge: "autocomplete-menu-lg"
	};
	var proto = Autocomplete.prototype;
	proto._events = _events;
	proto._getDataInit = _getDataInit;
	proto._getResultsInit = _getResultsInit;
	proto._render = _render;
	proto._renderInfo = _renderInfo;
	proto._renderItem = _renderItem;
	proto._renderResults = _renderResults;
	(0, _fr0st_ui.initComponent)("autocomplete", Autocomplete);
	var js_default = Autocomplete;

//#endregion
exports.Autocomplete = js_default;
});
//# sourceMappingURL=frost-ui-autocomplete.js.map