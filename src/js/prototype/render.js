import $ from '@fr0st/query';
import { generateId } from '@fr0st/ui';

/**
 * Render the toggle element.
 */
export function _render() {
    const id = generateId('autocomplete');

    this._menuNode = $.create('ul', {
        class: this.constructor.classes.menu,
        style: { maxHeight: this._options.maxHeight },
        attributes: {
            id,
            role: 'listbox',
        },
    });

    if ($.is(this._node, '.input-sm')) {
        $.addClass(this._menuNode, this.constructor.classes.menuSmall);
    } else if ($.is(this._node, '.input-lg')) {
        $.addClass(this._menuNode, this.constructor.classes.menuLarge);
    }

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
        minContact: this._options.minContact,
    };

    if (this._options.fullWidth) {
        this._popperOptions.beforeUpdate = (node) => {
            $.setStyle(node, { width: '' });
        };

        this._popperOptions.afterUpdate = (node, reference) => {
            const width = $.width(reference, { boxSize: $.BORDER_BOX });
            $.setStyle(node, { width: `${width}px` });
        };
    }

    $.setAttribute(this._node, {
        'role': 'combobox',
        'aria-controls': id,
        'aria-autocomplete': 'list',
        'aria-expanded': false,
        'aria-activedescendent': '',
    });
};

/**
 * Render an information item.
 * @param {string} text The text to render.
 * @returns {HTMLElement} The information item.
 */
export function _renderInfo(text) {
    const element = $.create('div', {
        html: this._options.sanitize(text),
        class: this.constructor.classes.info,
    });

    return element;
};

/**
 * Render an item.
 * @param {string} value The value to render.
 * @returns {HTMLElement} The item element.
 */
export function _renderItem(value) {
    const id = generateId('autocomplete-item');

    const active = $.getValue(this._node) == value;

    const element = $.create('li', {
        class: this.constructor.classes.item,
        attributes: {
            id,
            'role': 'option',
            'aria-label': value,
            'aria-selected': active,
        },
        dataset: {
            uiAction: 'select',
            uiValue: value,
        },
    });

    this._activeItems.push(element);

    if (active) {
        $.addClass(element, this.constructor.classes.active);
    }

    const content = this._options.renderResult.bind(this)(value, element);

    if ($._isString(content)) {
        $.setHTML(element, this._options.sanitize(content));
    } else if ($._isElement(content) && !$.isSame(element, content)) {
        $.append(element, content);
    }

    return element;
};

/**
 * Render results.
 * @param {Array} results The results to render.
 */
export function _renderResults(results) {
    $.show(this._menuNode);

    for (const value of results) {
        const element = this._renderItem(value);
        $.append(this._menuNode, element);
    }

    if (!$.hasChildren(this._menuNode)) {
        $.hide(this._menuNode);
        return;
    }

    const focusedNode = $.findOne('[data-ui-focus]', this._menuNode);

    if (!focusedNode && this._activeItems.length) {
        const element = this._activeItems[0];
        $.addClass(element, this.constructor.classes.focus);
        $.setDataset(element, { uiFocus: true });

        const id = $.getAttribute(element, 'id');
        $.setAttribute(this._node, { 'aria-activedescendent': id });
    }
};
