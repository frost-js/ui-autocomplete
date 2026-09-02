# Frost UI Autocomplete

[![CI](https://github.com/frost-js/ui-autocomplete/actions/workflows/ci.yml/badge.svg)](https://github.com/frost-js/ui-autocomplete/actions/workflows/ci.yml)
[![Codecov](https://codecov.io/gh/frost-js/ui-autocomplete/graph/badge.svg)](https://codecov.io/gh/frost-js/ui-autocomplete)
[![npm](https://img.shields.io/npm/v/%40fr0st%2Fui-autocomplete)](https://www.npmjs.com/package/@fr0st/ui-autocomplete)
[![npm downloads](https://img.shields.io/npm/dm/%40fr0st%2Fui-autocomplete)](https://www.npmjs.com/package/@fr0st/ui-autocomplete)
[![JS gzip size](https://img.badgesize.io/https://cdn.jsdelivr.net/npm/@fr0st/ui-autocomplete@latest/dist/frost-ui-autocomplete.min.js?compression=gzip&label=JS%20gzip)](https://www.jsdelivr.com/package/npm/@fr0st/ui-autocomplete)
[![CSS gzip size](https://img.badgesize.io/https://cdn.jsdelivr.net/npm/@fr0st/ui-autocomplete@latest/dist/frost-ui-autocomplete.min.css?compression=gzip&label=CSS%20gzip)](https://www.jsdelivr.com/package/npm/@fr0st/ui-autocomplete)
[![License](https://img.shields.io/npm/l/%40fr0st%2Fui-autocomplete)](LICENSE)

An accessible autocomplete component for [Frost UI](https://github.com/frost-js/ui). It supports local and asynchronous data, cancellable pagination, custom rendering, keyboard navigation, RTL layouts, and native or fQuery initialization.

## Highlights

- Accessible combobox and listbox semantics with active-descendant keyboard navigation.
- Static, asynchronous, paginated, and abortable result sources.
- Safe-by-default string rendering plus an explicit trusted-DOM rendering path.
- Popper-powered placement, configurable sizing, RTL support, and responsive overflow.
- ESM and UMD distributions, with source maps and expanded/minified CSS.
- Native JavaScript and [fQuery](https://github.com/frost-js/query) APIs.

## Installation

Install Autocomplete and its peer dependencies with npm.

```bash
npm install @fr0st/ui-autocomplete @fr0st/query @fr0st/ui
```

### Bundler

Import the component and its CSS. Importing the module registers the native `Autocomplete.init` API and the fQuery `autocomplete` plugin.

```js
import '@fr0st/ui/dist/frost-ui.css';
import '@fr0st/ui-autocomplete/dist/frost-ui-autocomplete.css';
import Autocomplete from '@fr0st/ui-autocomplete';

Autocomplete.init(document.querySelector('#city'), {
    data: ['Brisbane', 'Melbourne', 'Perth', 'Sydney'],
});
```

### Browser ESM

The ESM build keeps `@fr0st/query` and `@fr0st/ui` external. Use an import map, or map those specifiers with your preferred CDN.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fr0st/ui@3/dist/frost-ui.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fr0st/ui-autocomplete@4/dist/frost-ui-autocomplete.min.css">

<script type="importmap">
{
    "imports": {
        "@fr0st/core": "https://cdn.jsdelivr.net/npm/@fr0st/core@latest/dist/frost-core.esm.min.js",
        "@fr0st/query": "https://cdn.jsdelivr.net/npm/@fr0st/query@4/dist/fquery.esm.min.js",
        "@fr0st/ui": "https://cdn.jsdelivr.net/npm/@fr0st/ui@3/dist/frost-ui.esm.min.js"
    }
}
</script>
<script type="module">
    import Autocomplete from 'https://cdn.jsdelivr.net/npm/@fr0st/ui-autocomplete@4/dist/frost-ui-autocomplete.esm.min.js';

    Autocomplete.init(document.querySelector('#city'), {
        data: ['Brisbane', 'Melbourne', 'Perth', 'Sydney'],
    });
</script>
```

### UMD

Load Frost UI's all-in-one bundle before Autocomplete. It supplies the `UI` and `fQuery` globals expected by the component, and the Autocomplete UMD build extends the existing `globalThis.UI` object.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fr0st/ui@3/dist/frost-ui.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fr0st/ui-autocomplete@4/dist/frost-ui-autocomplete.min.css">

<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui@3/dist/frost-ui-bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui-autocomplete@4/dist/frost-ui-autocomplete.min.js"></script>
<script>
    UI.Autocomplete.init(document.querySelector('#city'), {
        data: ['Brisbane', 'Melbourne', 'Perth', 'Sydney'],
    });
</script>
```

Autocomplete does not inject styles. Always load Frost UI CSS first, followed by the Autocomplete CSS. Use the expanded `.css` files during development and the `.min.css` files in production.

## Usage

Autocomplete enhances an existing text-like `<input>`. A label remains the best accessible name; the component manages the combobox attributes and generated listbox.

```html
<label for="fruit">Fruit</label>
<div class="form-input">
    <input class="input-outline" id="fruit" type="text" autocomplete="off">
</div>
```

### Static data

```js
import Autocomplete from '@fr0st/ui-autocomplete';

Autocomplete.init(document.querySelector('#fruit'), {
    data: ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry'],
    minSearch: 0,
});
```

The default matcher is case- and accent-insensitive. Results containing the term are sorted first by match position and then alphabetically.

### Remote data

Use `getResults` when results come from a service. It takes precedence over `data`.

```js
Autocomplete.init(document.querySelector('#repository'), {
    debounce: 300,
    getResults: async ({ offset, signal, term = '' }) => {
        const query = new URLSearchParams({ offset, q: term });
        const response = await fetch(`/api/repositories?${query}`, { signal });

        if (!response.ok) {
            throw new Error(`Request failed with ${response.status}`);
        }

        return response.json(); // { results: string[], showMore?: boolean }
    },
});
```

## Options

Pass options to `Autocomplete.init`, `$.autocomplete`, or Frost UI's `data-ui-*` attributes. JavaScript callbacks must be passed as JavaScript options.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `lang` | `object` | `{ error: 'Error loading data.', loading: 'Loading..' }` | Loading and error messages. |
| `data` | `string[]` | `[]` | Local result values. Ignored when `getResults` is set. |
| `getResults` | `function \| null` | `null` | Synchronous or asynchronous result provider. |
| `renderResult` | `function` | `(value) => value` | Renders a result as a sanitized string or trusted DOM node. |
| `sanitize` | `function` | fQuery sanitizer | Sanitizes strings returned by `renderResult`. |
| `isMatch` | `function` | accent-insensitive contains | Determines whether a local value matches the term. |
| `sortResults` | `function` | match position, then locale | Compares two matching local values. |
| `minSearch` | `number` | `1` | Minimum input length before loading results. Use `0` for an empty query. |
| `debounce` | `number` | `250` | Delay in milliseconds before loading results. |
| `duration` | `number` | `100` | Show and hide transition duration in milliseconds. |
| `maxHeight` | `string` | `'250px'` | Maximum menu height. |
| `appendTo` | `Element \| string \| null` | `null` | Menu container. Defaults to the input's parent. |
| `fullWidth` | `boolean` | `false` | Match the input's exact border-box width when enabled; otherwise size to content. |
| `placement` | `'top' \| 'bottom'` | `'bottom'` | Preferred vertical Popper placement. |
| `position` | `'start' \| 'end'` | `'start'` | Logical horizontal Popper alignment. |
| `fixed` | `boolean` | `false` | Preserve the preferred placement instead of allowing Popper to flip it. |
| `spacing` | `number` | `0` | Space in pixels between the input and menu. |
| `minContact` | `number \| false` | `false` | Minimum contact in pixels between the menu and input, or `false` for Popper's default. |

An existing instance is reused when the same input is initialized again. Resolved options are frozen; dispose and reinitialize the input to use a different configuration.

Prefix option names with `data-ui-` and use kebab case. Arrays and objects use JSON.

```html
<input
    data-ui-toggle="autocomplete"
    data-ui-data='["Alpha", "Beta", "Gamma"]'
    data-ui-full-width="true"
    data-ui-min-search="0"
    id="greek-letter"
    type="text"
>
```

The `data-ui-toggle` attribute is a convenient selector; it does not initialize Autocomplete by itself.

```js
$('[data-ui-toggle="autocomplete"]').autocomplete();
```

## Result provider contract

`getResults` receives:

| Property | Type | Description |
| --- | --- | --- |
| `offset` | `number` | `0` for a new search, then the number of loaded results for pagination. |
| `signal` | `AbortSignal` | Aborted when this request is no longer relevant. |
| `term` | `string` | Current input text. Omitted when the term is empty. |

Return an object, or a promise for one, with a `results` string array and optional `showMore` boolean.

```js
{
    results: ['Brisbane', 'Bundaberg'],
    showMore: true,
}
```

When `showMore` is true, scrolling near the end of the menu requests the next page. The next request receives the number of loaded items as `offset`. An empty page or `showMore: false` ends pagination.

Each new search aborts the previous request and cancels pending debounce work. Hiding or disposing also aborts active work. Providers should pass `signal` to `fetch` and stop expensive work when it is aborted. Request tokens ensure a stale completion is ignored even if the provider does not honor cancellation. Changing the term during pagination starts at offset `0` and prevents the old page from being appended.

A thrown exception, rejected promise, or malformed response displays `lang.error`. An empty first page closes the menu. Completions after disposal are ignored.

## Rendering and sanitization

`renderResult(value, item)` runs with the Autocomplete instance as `this`.

- A string is passed through `sanitize` before insertion as HTML.
- A DOM node is appended directly and is not sanitized or cloned. Return DOM only when the node and all its content are trusted.
- `null` and `undefined` render an empty item.

The default sanitizer is fQuery's HTML sanitizer. If a custom sanitizer throws, Autocomplete falls back to that default. Never use an identity sanitizer with untrusted API or user content.

```js
Autocomplete.init(document.querySelector('#framework'), {
    data: ['Frost UI', 'Frost Query'],
    renderResult(value) {
        const wrapper = document.createElement('span');
        const label = document.createElement('strong');

        label.textContent = value;
        wrapper.append(label, ' — trusted local result');

        return wrapper;
    },
});
```

Custom `isMatch(value, term)` and `sortResults(a, b, term)` callbacks also run with the component instance as `this`. Callback failures are contained so one bad value does not leave the component broken.

## Methods

| Method | Returns | Description |
| --- | --- | --- |
| `Autocomplete.init(node, options?)` | `Autocomplete` | Return the existing instance for an input or create one. |
| `show()` | `void` | Load and show results for the current value. Has no effect while disabled or read-only. |
| `hide()` | `void` | Hide the menu and cancel pending debounce, requests, and pagination. |
| `toggle()` | `void` | Show a hidden menu or hide a visible menu. |
| `update()` | `void` | Refresh the current Popper position and dimensions. |
| `dispose()` | `void` | Remove the menu and listeners, cancel work, and restore the input's original role and ARIA attributes. |

```js
const autocomplete = Autocomplete.init(
    document.querySelector('#fruit'),
    { data: ['Apple', 'Pear'] },
);

autocomplete.show();
autocomplete.update();
autocomplete.hide();
autocomplete.dispose();
```

The fQuery plugin exposes the same public methods.

```js
$('#fruit').autocomplete({ data: ['Apple', 'Pear'] });
$('#fruit').autocomplete('show');
$('#fruit').autocomplete('update');
$('#fruit').autocomplete('dispose');
```

The instance exposes the enhanced input as `instance.node` and its frozen resolved configuration as `instance.options`. Both become `null` after disposal.

## Events

Events are dispatched on the input and bubble through the DOM.

| Event | Cancelable | Description |
| --- | --- | --- |
| `show.ui.autocomplete` | Yes | Fired before the menu begins opening. |
| `shown.ui.autocomplete` | No | Fired after the opening transition completes. |
| `hide.ui.autocomplete` | Yes | Fired before the menu begins closing. |
| `hidden.ui.autocomplete` | No | Fired after the closing transition completes. |
| `change.ui.autocomplete` | No | Fired after a different result is selected and written to the input. |

Calling `preventDefault()` during `show.ui.autocomplete` or `hide.ui.autocomplete` cancels that action. Rapid opposing transitions are token-protected, so an earlier transition cannot emit a stale completion event.

```js
document.querySelector('#fruit').addEventListener('change.ui.autocomplete', (event) => {
    console.log('Selected:', event.target.value);
});
```

## CSS classes

Override `Autocomplete.classes` before initialization to integrate a different class convention.

| Key | Default classes | Purpose |
| --- | --- | --- |
| `active` | `active` | Selected result. |
| `focus` | `focus` | Keyboard- or pointer-focused result. |
| `info` | `autocomplete-item text-body-secondary` | Loading and error rows. |
| `item` | `autocomplete-item` | Selectable result. |
| `menu` | `autocomplete-menu list-unstyled fade` | Listbox menu. |
| `menuSmall` | `autocomplete-menu-sm` | Menu paired with a small input. |
| `menuLarge` | `autocomplete-menu-lg` | Menu paired with a large input. |
| `show` | `show` | Visible menu state. |

The stylesheet publishes runtime `--ui-autocomplete-*` custom properties on `.autocomplete-menu`. They derive from Frost UI tokens and can be scoped for local visual overrides.

## Sass variables

Every variable is declared with `!default`.

| Variable | Default |
| --- | --- |
| `$autocomplete-z-index` | `1000` |
| `$autocomplete-min-width` | `10rem` |
| `$autocomplete-padding-x` | `.5rem` |
| `$autocomplete-padding-y` | `.5rem` |
| `$autocomplete-font-size` | `var(--ui-font-size)` |
| `$autocomplete-color` | `var(--ui-body-color)` |
| `$autocomplete-bg` | `rgb(from var(--ui-body-bg) r g b / .88)` |
| `$autocomplete-backdrop-filter` | `blur(.75rem) saturate(140%)` |
| `$autocomplete-border-width` | `var(--ui-border-width)` |
| `$autocomplete-border-color` | `var(--ui-border-color-translucent)` |
| `$autocomplete-border-radius` | `var(--ui-border-radius-xl)` |
| `$autocomplete-box-shadow` | `var(--ui-shadow)` |
| `$autocomplete-transition-duration` | `var(--ui-transition-duration)` |
| `$autocomplete-sm-font-size` | `var(--ui-font-size-sm)` |
| `$autocomplete-lg-font-size` | `var(--ui-font-size-lg)` |
| `$autocomplete-item-padding-x` | `1rem` |
| `$autocomplete-item-padding-y` | `.5rem` |
| `$autocomplete-item-font-weight` | `400` |
| `$autocomplete-item-active-font-weight` | `500` |
| `$autocomplete-item-color` | `var(--ui-body-color)` |
| `$autocomplete-item-focus-color` | `var(--ui-body-color)` |
| `$autocomplete-item-focus-bg` | `var(--ui-tertiary-bg)` |
| `$autocomplete-item-focus-box-shadow` | `inset 0 0 0 var(--ui-focus-ring-width) var(--ui-focus-ring-color)` |
| `$autocomplete-item-active-color` | `var(--ui-primary-contrast)` |
| `$autocomplete-item-active-bg` | `var(--ui-primary)` |
| `$autocomplete-info-color` | `var(--ui-secondary-color)` |

Configure variables before loading the component stylesheet.

```scss
@use "@fr0st/ui-autocomplete/src/scss/vars" with (
    $autocomplete-min-width: 14rem,
    $autocomplete-item-padding-y: .75rem
);
@use "@fr0st/ui-autocomplete/src/scss/autocomplete";
```

## Keyboard and accessibility

Autocomplete follows the editable combobox/listbox interaction model. Focus remains on the input while `aria-activedescendant` identifies the focused option.

| Input | Behavior |
| --- | --- |
| `ArrowDown` | Open at the first result, or move to the next result. |
| `ArrowUp` | Open at the last result, or move to the previous result. |
| `Enter` | Select the focused result without submitting the containing form. |
| `Escape` | Close the menu and clear the active descendant. |
| Typing | Debounce and load results once `minSearch` is met. |
| Pointer hover | Focus the result without moving DOM focus from the input. |
| Primary click | Select the result. |
| Blur | Close the menu. |

The component applies `role="combobox"`, `aria-autocomplete="list"`, `aria-controls`, `aria-expanded`, and `aria-haspopup="listbox"` to the input. The menu uses `role="listbox"`; selectable rows use `role="option"`, stable generated IDs, and `aria-selected`. Loading and error rows are disabled live status content, and the input exposes its busy state during asynchronous work.

Disabled and read-only inputs do not open. `dispose()` restores every pre-existing role and managed ARIA attribute exactly, including attributes present with an empty value.

## Layout and themes

`fullWidth: true` measures the input's border box exactly. With `fullWidth: false`, the menu uses content sizing while remaining constrained to the viewport. Long results wrap safely, the menu scrolls at `maxHeight`, and logical properties keep start/end alignment correct in RTL layouts.

The stylesheet consumes Frost UI color tokens, so it follows Frost UI's light, dark, and system themes without component-specific theme configuration. Reduced-motion preferences disable the menu animation, and forced-colors mode preserves a visible border and focused option.

## Migrating from v3 to v4

Version 4 is a major package, build, and component internals update.

- Upgrade peers to `@fr0st/query ^4.1.2` and `@fr0st/ui ^3.0.0`.
- The package root now resolves to compiled ESM. Browser globals continue through UMD as `UI.Autocomplete`.
- Load the new v4 component CSS after Frost UI v3 CSS.
- The non-functional `menuSize` option was removed. Use `maxHeight`, `fullWidth`, and input size classes.
- `getResults` now receives `{ offset, signal, term? }`. Honor the signal and return `{ results, showMore? }`.
- String renderer output remains sanitized; DOM nodes are an explicitly trusted rendering path.
- Public methods remain `show`, `hide`, `toggle`, `update`, and `dispose`. Do not use removed prototype modules or underscored internals.
- Resolved options are immutable. Dispose and reinitialize an input to apply a different configuration.
- Disposal restores the input's original role and ARIA state, and pending work cannot complete after disposal.
- Sass now uses modules (`@use`) and logical properties.
- `fullWidth: true` means the input's exact border-box width; `false` permits content sizing.
- The toolchain requires Node `^20.19.0 || ^22.13.0 || >=24`.

## Development

```bash
npm install
npm run lint
npm run build
npm test
npm run test:coverage
```

| Command | Purpose |
| --- | --- |
| `npm run build:js` | Build ESM and UMD JavaScript with Vite. |
| `npm run build:css` | Compile expanded and minified CSS with source maps. |
| `npm run lint:js` | Lint JavaScript. |
| `npm run lint:css` | Lint compiled CSS. |
| `npm run lint:sass` | Lint Sass source. |
| `npm run lint:unused` | Find unused dependencies and files. |
| `npm run test:browser` | Run the Playwright browser matrix. |
| `npm run test:headed` | Run Playwright in headed mode. |
| `npm run test:ui` | Open Playwright's test UI. |

Open `demo/index.html` through a local HTTP server to explore the complete example gallery.

## License

Frost UI Autocomplete is licensed under the [MIT License](LICENSE).
