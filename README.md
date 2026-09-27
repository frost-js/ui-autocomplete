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
- Native JavaScript and [fQuery](https://github.com/frost-js/fquery) APIs.

## Installation

### Browser projects / bundlers

Install Autocomplete with its Frost UI v4 and fQuery v5 peers:

```bash
npm i @fr0st/ui-autocomplete @fr0st/ui @fr0st/query
```

The package root resolves to the compiled ESM bundle. Import the Frost UI and Autocomplete stylesheets and the default component export:

```js
import '@fr0st/ui/dist/frost-ui.min.css';
import '@fr0st/ui-autocomplete/dist/frost-ui-autocomplete.min.css';
import Autocomplete from '@fr0st/ui-autocomplete';

const autocomplete = Autocomplete.init(
    document.querySelector('#city'),
    {
        data: ['Brisbane', 'Melbourne', 'Perth', 'Sydney'],
    },
);
```

Importing the module registers Autocomplete with Frost UI and adds the fQuery `autocomplete` plugin. `@fr0st/ui` and `@fr0st/query` are peer dependencies so the component shares the application's UI and fQuery instances. The package root, `dist/*`, and `src/*` are available through package exports.

Autocomplete requires a browser DOM or a compatible DOM environment configured through fQuery. Server-rendered applications should load the component on the client.

### Browser (ESM)

The ESM bundle imports `@fr0st/ui` and `@fr0st/query`, and fQuery imports `@fr0st/core`. Map all three dependencies when loading the bundle directly in a browser:

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

    Autocomplete.init(document.querySelector('#city'), {
        data: ['Brisbane', 'Melbourne', 'Perth', 'Sydney'],
    });
</script>
```

### Browser (UMD)

Load Frost UI's all-in-one bundle before Autocomplete. The UI bundle supplies both the `UI` and `fQuery` globals expected by the component:

```html
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui-autocomplete@latest/dist/frost-ui-autocomplete.min.css">

<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui-bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui-autocomplete@latest/dist/frost-ui-autocomplete.min.js"></script>
<script>
    const autocomplete = UI.Autocomplete.init(
        document.querySelector('#city'),
        {
            data: ['Brisbane', 'Melbourne', 'Perth', 'Sydney'],
        },
    );
</script>
```

The UMD bundle adds `Autocomplete` to the existing `globalThis.UI` object. It expects `globalThis.UI` and `globalThis.fQuery` to exist before it loads. If the non-bundled Frost UI build is used instead, load fQuery, Frost UI, and Autocomplete in that order.

Do not load the separate fQuery script when using `frost-ui-bundle.js` or `frost-ui-bundle.min.js`.

Autocomplete does not inject styles. Always load Frost UI CSS first, followed by the Autocomplete CSS. Expanded `.css` files are also available for development.

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

Pass options to `Autocomplete.init`, `$(...).autocomplete(...)`, or Frost UI's `data-ui-*` attributes. JavaScript callbacks must be passed as JavaScript options.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `lang` | `object` | `{ error: 'Error loading data.', loading: 'Loading..' }` | Loading and error messages. |
| `data` | `string[]` | `[]` | Local result values. Ignored when `getResults` is set. |
| `getResults` | `function \| null` | `null` | Synchronous or asynchronous result provider. |
| `renderResult` | `function` | `(value) => value` | Renders a result as a sanitized string or trusted DOM node. |
| `sanitize` | `function` | fQuery sanitizer | Sanitizes string results and loading/error messages. |
| `isMatch` | `function` | case- and accent-insensitive contains | Determines whether a local value matches the term. |
| `sortResults` | `function` | match position, then locale | Compares two matching local values. |
| `minSearch` | `number` | `1` | Minimum input length before loading results. Use `0` for an empty query. |
| `debounce` | `number` | `250` | Delay in milliseconds before invoking `getResults`, including pagination requests. Does not delay local filtering. |
| `duration` | `number` | `100` | Show and hide transition duration in milliseconds. |
| `maxHeight` | `string` | `'250px'` | Maximum menu height. |
| `appendTo` | `Element \| string \| null` | `null` | Menu container or selector. By default, the menu is inserted immediately after the input. Invalid or disconnected targets fall back to that placement. |
| `fullWidth` | `boolean` | `false` | Match the input's exact border-box width when enabled; otherwise size to content. |
| `placement` | `'auto' \| 'top' \| 'bottom' \| 'start' \| 'end'` | `'bottom'` | Preferred Popper placement; `start` and `end` follow the input's text direction. |
| `position` | `'start' \| 'center' \| 'end'` | `'start'` | Alignment along the placement edge. |
| `fixed` | `boolean` | `false` | Preserve the preferred placement instead of allowing Popper to flip it. `placement: 'auto'` still chooses a placement. |
| `spacing` | `number` | `0` | Space in pixels between the input and menu. |
| `minContact` | `number \| false` | `false` | Minimum overlap in pixels along the alignment axis when Popper shifts the menu to fit; `false` allows zero overlap. |

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

When `showMore` is true, scrolling near the end of the menu requests the next page. If the results do not fill the menu enough to scroll, additional pages load automatically until it becomes scrollable or pagination ends. The next request receives the number of loaded items as `offset`. An empty page or `showMore: false` ends pagination.

Each new search aborts the previous request and cancels pending provider debounce work. Hiding or disposing also aborts active work. Calling `hide()` cancels queued input and scroll callbacks; preventing `hide.ui.autocomplete` keeps the menu open and the active request running. Providers should pass `signal` to `fetch` and stop expensive work when it is aborted. Request tokens ensure a stale completion is ignored even if the provider does not honor cancellation. Changing the term during pagination starts at offset `0` and prevents the old page from being appended.

A thrown exception, rejected promise, or malformed response from the current provider request displays `lang.error`. An empty first page removes the loader and closes the menu unless `hide.ui.autocomplete` is prevented. Completions after disposal are ignored. Disposing from an abort listener stops further component work.

## Rendering and sanitization

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

## Methods

| Method | Returns | Description |
| --- | --- | --- |
| `Autocomplete.init(node, options?)` | `Autocomplete` | Return the existing instance for an input or create one. |
| `show()` | `void` | Load and show results for the current value. Has no effect while already open, disabled, or read-only. |
| `hide()` | `void` | Cancel queued input/scroll callbacks and hide the menu. Unless hiding is prevented, also cancel pending provider debounce and active requests. |
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

| Event | Can cancel action | Description |
| --- | --- | --- |
| `show.ui.autocomplete` | Yes | Fired before the menu begins opening. |
| `shown.ui.autocomplete` | No | Fired after the opening transition completes. |
| `hide.ui.autocomplete` | Yes | Fired before the menu begins closing. |
| `hidden.ui.autocomplete` | No | Fired after the closing transition completes. |
| `change.ui.autocomplete` | No | Fired after a different result is selected and written to the input. |

Calling `preventDefault()` during `show.ui.autocomplete` or `hide.ui.autocomplete` cancels that action. Preventing `shown`, `hidden`, or `change` has no effect on the completed action. Rapid opposing transitions are token-protected, so an earlier transition cannot emit a stale completion event.

```js
$.addEvent('#fruit', 'change.ui.autocomplete', (event) => {
    console.log('Selected:', event.target.value);
});
```

Use fQuery's event API for namespaced event names. Native `addEventListener` uses the base event name, such as `change`, with `event.namespace === 'ui.autocomplete'` identifying component events.

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
| `Enter` | Select the focused result while the menu is open, preventing form submission. Otherwise retain normal Enter behavior. |
| `Escape` | Close the menu and clear the active descendant. |
| Typing | Filter local data or debounce the provider request once `minSearch` is met. |
| Pointer hover | Focus the result without moving DOM focus from the input. |
| Primary click | Select the result. |
| Blur | Close the menu. |

Keyboard navigation scrolls the focused result into view, including when opening with `ArrowUp`. Keydown events marked as composing are ignored, so confirming IME input does not select a result.

The component applies `role="combobox"`, `aria-autocomplete="list"`, `aria-controls`, `aria-expanded`, and `aria-haspopup="listbox"` to the input. The menu uses `role="listbox"`; selectable rows use `role="option"`, generated IDs, and `aria-selected`. Loading and error rows are disabled live status content, and the menu exposes `aria-busy` during asynchronous work.

Disabled and read-only inputs do not open. `dispose()` restores every pre-existing role and managed ARIA attribute exactly, including attributes present with an empty value.

## Layout and themes

`fullWidth: true` measures the input's border box exactly. With `fullWidth: false`, the menu uses content sizing while remaining constrained to the viewport. Long result text stays on one line and is truncated with an ellipsis when needed; loading and error messages can wrap. The menu scrolls at `maxHeight`, and logical properties keep start/end alignment correct in RTL layouts.

The stylesheet consumes Frost UI color tokens, so it follows Frost UI's light, dark, and system themes without component-specific theme configuration. Reduced-motion handling is entirely in CSS. The `duration` option sets `--ui-autocomplete-transition-duration` inline, but the stylesheet only enables transitions when the user has no reduced-motion preference. Forced-colors mode preserves a visible border and focused option.

## Development

Use Node.js matching `^20.19.0 || ^22.13.0 || >=24`. Install dependencies with `npm ci`, then install Playwright browsers with `npx playwright install --with-deps`.

```bash
npm test
npm run lint
npm run build
```

`npm test` rebuilds JavaScript and CSS, then runs the Playwright suite in Chromium, Firefox, and WebKit. `npm run test:browser` runs the suite against the existing bundles, so rebuild after changing source files.

After building, `npm run test:coverage` runs Chromium tests and writes coverage reports to `coverage/`.

`npm run test:headed` and `npm run test:ui` also use the existing bundles and open headed browsers or the Playwright UI.

`npm run lint:sass:unused` checks for unused Sass variables.

Open `demo/index.html` through a local HTTP server to explore the complete example gallery.

## License

Frost UI Autocomplete is licensed under the [MIT License](LICENSE).
