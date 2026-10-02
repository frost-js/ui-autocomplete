# Frost UI Autocomplete

[![CI](https://github.com/frost-js/ui-autocomplete/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/frost-js/ui-autocomplete/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/frost-js/ui-autocomplete/branch/main/graph/badge.svg)](https://codecov.io/gh/frost-js/ui-autocomplete)
[![npm version](https://img.shields.io/npm/v/%40fr0st%2Fui-autocomplete?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-autocomplete)
[![npm downloads](https://img.shields.io/npm/dm/%40fr0st%2Fui-autocomplete?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-autocomplete)
[![JS gzip size](https://img.badgesize.io/frost-js/ui-autocomplete/main/dist/frost-ui-autocomplete.min.js?compression=gzip&label=JS%20gzip%20size&style=flat-square)](https://github.com/frost-js/ui-autocomplete/blob/main/dist/frost-ui-autocomplete.min.js)
[![CSS gzip size](https://img.badgesize.io/frost-js/ui-autocomplete/main/dist/frost-ui-autocomplete.min.css?compression=gzip&label=CSS%20gzip%20size&style=flat-square)](https://github.com/frost-js/ui-autocomplete/blob/main/dist/frost-ui-autocomplete.min.css)
[![license](https://img.shields.io/github/license/frost-js/ui-autocomplete?style=flat-square)](./LICENSE)

Autocomplete for Frost UI with local and asynchronous data, cancellable pagination, custom rendering, keyboard navigation, RTL layouts, and native or fQuery initialization.

## Highlights

- Accessible combobox and listbox semantics with active-descendant keyboard navigation
- Static, asynchronous, paginated, and abortable result sources
- Safe-by-default string rendering plus an explicit trusted-DOM rendering path
- Popper-powered placement, configurable sizing, RTL support, and responsive overflow
- Native `Autocomplete` class and `autocomplete` fQuery plugin
- Existing-instance reuse with frozen resolved options
- Prebuilt ESM and UMD bundles with source maps
- Expanded and minified component CSS with source maps
- JSDoc-powered IntelliSense

Explore [the demo](./demo/index.html) for interactive examples.

## Installation

### Browser projects / bundlers

```bash
npm i @fr0st/ui-autocomplete
```

Frost UI Autocomplete's package entry point is ESM-only and requires a browser DOM. Import the default `Autocomplete` export and the stylesheets in browser projects and bundlers.

```js
import '@fr0st/ui/dist/frost-ui.min.css';
import '@fr0st/ui-autocomplete/dist/frost-ui-autocomplete.min.css';
import Autocomplete from '@fr0st/ui-autocomplete';
```

`@fr0st/ui` and `@fr0st/query` are peer dependencies so the component shares the application's instances.

### Browser (ESM)

The ESM bundle imports `@fr0st/ui` and `@fr0st/query`. fQuery also imports `@fr0st/core`, so map all three dependencies when loading the bundle directly in a browser:

```html
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui-autocomplete@latest/dist/frost-ui-autocomplete.min.css">
<script type="importmap">
{
    "imports": {
        "@fr0st/core": "https://cdn.jsdelivr.net/npm/@fr0st/core@latest/dist/frost-core.esm.min.js",
        "@fr0st/query": "https://cdn.jsdelivr.net/npm/@fr0st/query@latest/dist/fquery.esm.min.js",
        "@fr0st/ui": "https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.esm.min.js"
    }
}
</script>
<script type="module">
    import Autocomplete from 'https://cdn.jsdelivr.net/npm/@fr0st/ui-autocomplete@latest/dist/frost-ui-autocomplete.esm.min.js';
</script>
```

### Browser (UMD)

Load the bundles from your own copy or a CDN:

```html
<link
    rel="stylesheet"
    href="/path/to/dist/frost-ui.min.css">
<link
    rel="stylesheet"
    href="/path/to/dist/frost-ui-autocomplete.min.css">
<script src="/path/to/dist/frost-ui-bundle.min.js"></script>
<script src="/path/to/dist/frost-ui-autocomplete.min.js"></script>
<!-- or -->
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui-autocomplete@latest/dist/frost-ui-autocomplete.min.css">
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui-bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui-autocomplete@latest/dist/frost-ui-autocomplete.min.js"></script>
<script>
    const { Autocomplete } = globalThis.UI;
</script>
```

The UMD bundle adds `Autocomplete` to the existing `globalThis.UI` object. Load Frost UI's all-in-one bundle first; it supplies the `UI` and `fQuery` globals.

The package root resolves to the prebuilt ESM bundle. Published files under `dist/` and `src/` are also available through matching package subpaths.

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

Options are resolved in this order:

1. Component defaults
2. The element's `data-ui-*` attributes
3. Options passed to `Autocomplete.init()`

Resolved `instance.options` are shallow-frozen.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `appendTo` | `Element \| string \| null` | `null` | Menu container or selector. By default, the menu is inserted immediately after the input. Invalid or disconnected targets fall back to that placement. |
| `data` | `string[]` | `[]` | Local result values. Ignored when `getResults` is set. |
| `debounce` | `number` | `250` | Delay in milliseconds before invoking `getResults`, including pagination requests. Does not delay local filtering. |
| `duration` | `number` | `100` | Show and hide transition duration in milliseconds. |
| `fixed` | `boolean` | `false` | Preserve the preferred placement instead of allowing Popper to flip it. `placement: 'auto'` still chooses a placement. |
| `fullWidth` | `boolean` | `false` | Match the input's exact border-box width when enabled; otherwise size to content. |
| `getResults` | `function \| null` | `null` | Synchronous or asynchronous result provider. |
| `isMatch` | `function` | case- and accent-insensitive contains | Determines whether a local value matches the term. |
| `lang` | `object` | `{ error: 'Error loading data.', loading: 'Loading..' }` | Loading and error messages. |
| `maxHeight` | `string` | `'250px'` | Maximum menu height. |
| `minContact` | `number \| false` | `false` | Minimum overlap in pixels along the alignment axis when Popper shifts the menu to fit; `false` allows zero overlap. |
| `minSearch` | `number` | `1` | Minimum input length before loading results. Use `0` for an empty query. |
| `placement` | `'auto' \| 'top' \| 'bottom' \| 'start' \| 'end'` | `'bottom'` | Preferred Popper placement; `start` and `end` follow the input's text direction. |
| `position` | `'start' \| 'center' \| 'end'` | `'start'` | Alignment along the placement edge. |
| `renderResult` | `function` | `(value) => value` | Renders a result as a sanitized string or trusted DOM node. |
| `sanitize` | `function` | fQuery sanitizer | Sanitizes string results and loading/error messages. |
| `sortResults` | `function` | match position, then locale | Compares two matching local values. |
| `spacing` | `number` | `0` | Space in pixels between the input and menu. |

### Result provider contract

`getResults` receives:

| Property | Type | Description |
| --- | --- | --- |
| `offset` | `number` | `0` for a new search, then the number of loaded results for pagination. |
| `signal` | `AbortSignal` | Aborted when this request is no longer relevant. |
| `term` | `string` | Current input text. Omitted when the term is empty. |

Return an object, or a promise for one, with a `results` string array and optional `showMore` boolean.

```js
const response = {
    results: ['Brisbane', 'Bundaberg'],
    showMore: true,
};
```

When `showMore` is true, scrolling near the end of the menu requests the next page. If the results do not fill the menu enough to scroll, additional pages load automatically until it becomes scrollable or pagination ends. The next request receives the number of loaded items as `offset`. An empty page or `showMore: false` ends pagination.

Each new search aborts the previous request and cancels pending provider debounce work. Hiding or disposing also aborts active work. Calling `hide()` cancels queued input and scroll callbacks; preventing `hide.ui.autocomplete` keeps the menu open and the active request running. Providers should pass `signal` to `fetch` and stop expensive work when it is aborted. Request tokens ensure a stale completion is ignored even if the provider does not honor cancellation. Changing the term during pagination starts at offset `0` and prevents the old page from being appended.

A thrown exception, rejected promise, or malformed response from the current provider request displays `lang.error`. An empty first page removes the loader and closes the menu unless `hide.ui.autocomplete` is prevented. Completions after disposal are ignored. Disposing from an abort listener stops further component work.

### Rendering and sanitization

`renderResult(value, item)` runs with the Autocomplete instance as `this`.

- A string is passed through `sanitize` before insertion as HTML.
- A DOM node or document fragment is appended directly and is not sanitized or cloned. Return DOM only when the node and all its content are trusted.
- `null` and `undefined` leave the item as configured by the callback; it stays empty unless the callback added content.
- If the callback throws, the original result value is rendered through `sanitize`.
- Disposing the component inside the callback stops rendering.

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

Custom `isMatch(value, term)` and `sortResults(a, b, term)` callbacks also run with the component instance as `this`. If `isMatch` throws, that value is excluded. If `sortResults` throws, that comparison falls back to `localeCompare`.

## Data attributes

Use kebab-case `data-ui-*` attributes for serializable options. Arrays and objects use JSON. Supply callbacks and DOM nodes through JavaScript.

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

```js
import $ from '@fr0st/query';
import '@fr0st/ui-autocomplete';

$('[data-ui-toggle="autocomplete"]').autocomplete();
```

Data attributes configure options; they do not initialize Autocomplete by themselves. Initialize the component through the class or fQuery plugin. Changing an option's data attribute after initialization does not reconfigure the existing instance.

## Methods

| Method | Returns | Description |
| --- | --- | --- |
| `Autocomplete.init(node, options?)` | `Autocomplete` | Return the existing instance for an element or create one. |
| `dispose()` | `void` | Remove the menu and listeners, cancel work, and restore the input's original role and ARIA attributes. |
| `hide()` | `void` | Cancel queued input/scroll callbacks and hide the menu. Unless hiding is prevented, also cancel pending provider debounce and active requests. |
| `show()` | `void` | Load and show results for the current value. Has no effect while already open, disabled, or read-only. |
| `toggle()` | `void` | Show a hidden menu or hide a visible menu. |
| `update()` | `void` | Refresh the current Popper position and dimensions. |

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

## Lifecycle

Calling `Autocomplete.init()` again for the same element returns its existing instance. Dispose the current instance before reinitializing with different options.

An instance exposes its original element as `instance.node` and its shallow-frozen resolved configuration as `instance.options`. Both become `null` after disposal.

`dispose()` releases resources owned by the component and removes its registered instance. Repeated disposal is safe and does not affect a new instance initialized on the same element. Use a new instance before calling other methods after disposal.

If initialization fails, the component releases resources it created and removes its registered instance before rethrowing the error. The element can then be initialized again.

## Events

Events are dispatched on the input and bubble through the DOM.

| Event | Description |
| --- | --- |
| `show.ui.autocomplete` | Fired before the menu begins opening. Cancel with `event.preventDefault()`. |
| `shown.ui.autocomplete` | Fired after the opening transition completes. |
| `hide.ui.autocomplete` | Fired before the menu begins closing. Cancel with `event.preventDefault()`. |
| `hidden.ui.autocomplete` | Fired after the closing transition completes. |
| `change.ui.autocomplete` | Fired after a different result is selected and written to the input. |

Calling `preventDefault()` during `show.ui.autocomplete` or `hide.ui.autocomplete` cancels that action. Preventing `shown`, `hidden`, or `change` has no effect on the completed action. Rapid opposing transitions are token-protected, so an earlier transition cannot emit a stale completion event.

```js
$.addEvent('#fruit', 'change.ui.autocomplete', (event) => {
    console.log('Selected:', event.target.value);
});
```

Use fQuery's event API for namespaced event names. Native `addEventListener` uses the base event name, such as `change`, with `event.namespace === 'ui.autocomplete'` identifying component events.

## fQuery API

Importing Autocomplete registers `autocomplete` on `fQuery.QuerySet`:

```js
import $ from '@fr0st/query';
import '@fr0st/ui-autocomplete';

$('#fruit').autocomplete({ data: ['Apple', 'Pear'] });
$('#fruit').autocomplete('show');
$('#fruit').autocomplete('update');
$('#fruit').autocomplete('dispose');
```

Pass an options object to initialize every matched element, or pass a public method name followed by its arguments. The first component or method result is returned.

## Accessibility

Autocomplete follows the editable combobox/listbox interaction model. Focus remains on the input while `aria-activedescendant` identifies the focused option.

| Input | Behavior |
| --- | --- |
| `ArrowDown` | Open at the first result, or move to the next result. |
| `ArrowUp` | Open at the last result, or move to the previous result. |
| `Enter` | Select the focused result while the menu is open, preventing form submission. Otherwise retain normal Enter behavior. |
| `Escape` | Close the menu and clear the active descendant. |
| Typing | Filter local data or debounce the provider request once `minSearch` is met. |
| Pointer hover | Focus the result without moving DOM focus from the input. |
| Primary click | Select the result. |
| Blur | Close the menu. |

Keyboard navigation scrolls the focused result into view, including when opening with `ArrowUp`. Keydown events marked as composing are ignored, so confirming IME input does not select a result.

The component applies `role="combobox"`, `aria-autocomplete="list"`, `aria-controls`, `aria-expanded`, and `aria-haspopup="listbox"` to the input. The menu uses `role="listbox"`; selectable rows use `role="option"`, generated IDs, and `aria-selected`. Loading and error rows are disabled live status content, and the menu exposes `aria-busy` during asynchronous work.

Disabled and read-only inputs do not open. `dispose()` restores every pre-existing role and managed ARIA attribute exactly, including attributes present with an empty value.

## Customization

### CSS classes

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

### Sass variables

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

### Custom Sass builds

Install Sass and create an application stylesheet to customize the component:

```bash
npm i -D sass
```

`src/styles.scss`

```scss
@use "@fr0st/ui-autocomplete/src/scss/vars" with (
    $autocomplete-min-width: 14rem,
    $autocomplete-item-padding-y: .75rem
);
@use "@fr0st/ui-autocomplete/src/scss/autocomplete";
```

Compile the entry point with npm package resolution enabled:

```bash
npx sass --load-path=node_modules src/styles.scss dist/styles.css
```

Configure the [component variables](./src/scss/vars.scss) before loading the `autocomplete` module. All variables have `!default` values. Include Frost UI CSS separately. Build tools that already resolve Sass modules from npm packages do not need the explicit load path.

## Themes and RTL

Frost UI follows the user's preferred color scheme by default. Set `data-ui-theme="light"` or `data-ui-theme="dark"` on the document or an ancestor to select a theme explicitly.

`fullWidth: true` measures the input's border box exactly. With `fullWidth: false`, the menu uses content sizing while remaining constrained to the viewport. Long result text stays on one line and is truncated with an ellipsis when needed; loading and error messages can wrap. The menu scrolls at `maxHeight`, and logical properties keep start/end alignment correct in RTL layouts.

The stylesheet consumes Frost UI color tokens, so it follows Frost UI's light, dark, and system themes without component-specific theme configuration. Reduced-motion handling is entirely in CSS. The `duration` option sets `--ui-autocomplete-transition-duration` inline, but the stylesheet only enables transitions when the user has no reduced-motion preference. Forced-colors mode preserves a visible border and focused option.

## Development

Install dependencies with `npm ci`, then install Playwright browsers with `npx playwright install --with-deps`.

```bash
npm test
npm run lint
npm run build
```

`npm test` rebuilds the bundles, then runs the Playwright suite in Chromium, Firefox, and WebKit. `npm run test:browser` runs the suite against the existing bundles, so rebuild after changing source files.

After building, `npm run test:coverage` runs Chromium tests and writes coverage reports to `coverage/`.

`npm run test:headed` and `npm run test:ui` also use the existing bundles and open headed browsers or the Playwright UI.

To view the demo, open `demo/index.html` in your browser after building.

## License

Frost UI Autocomplete is released under the [MIT License](./LICENSE).
